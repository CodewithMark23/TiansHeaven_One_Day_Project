import { useState, useEffect, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import type { LDRBoothSession, LDRRealtimeEvent, JointCaptureSlot } from '../types';
import type { WebRTCSignal } from './useWebRTC';
import { createSideBySideComposite, compressForRealtime } from '../lib/ldrComposite';

export type LDRRole = 'host' | 'guest';

export interface SyncCountdownTrigger {
  duration: number;
  slotNumber: number;
  triggerId: string;
}

export interface UseLDRBoothReturn {
  session: LDRBoothSession | null;
  role: LDRRole | null;
  isPartnerOnline: boolean;
  isConnected: boolean;
  isPartnerReady: boolean;
  syncTrigger: SyncCountdownTrigger | null;
  partnerFlashing: boolean;
  incomingWebRTCSignal: WebRTCSignal | null;
  registerWebRTCSignalListener: (cb: ((signal: WebRTCSignal) => void) | null) => void;
  jointCaptures: JointCaptureSlot[];
  error: string | null;
  connectToBooth: (code: string, currentRole: LDRRole, currentUserName: string) => Promise<boolean>;
  createBooth: (hostName: string) => Promise<string | null>;
  joinBooth: (code: string, guestName: string) => Promise<boolean>;
  broadcastEvent: (event: LDRRealtimeEvent) => void;
  sendWebRTCSignal: (signal: WebRTCSignal) => void;
  sendReadyState: (isReady: boolean) => void;
  triggerSyncCountdown: (slotNumber: number, duration?: number) => void;
  clearSyncTrigger: () => void;
  recordAndSyncJointPhoto: (slotNumber: number, dataUrl: string, currentRole: LDRRole) => Promise<void>;
  retakeSlot: (slotNumber: number) => Promise<void>;
  clearSessionPhotos: () => void;
  leaveBooth: () => void;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

const INITIAL_SLOTS: JointCaptureSlot[] = [
  { slotNumber: 1, hostPhoto: null, guestPhoto: null, compositePhoto: null },
  { slotNumber: 2, hostPhoto: null, guestPhoto: null, compositePhoto: null },
  { slotNumber: 3, hostPhoto: null, guestPhoto: null, compositePhoto: null },
  { slotNumber: 4, hostPhoto: null, guestPhoto: null, compositePhoto: null },
];

export function useLDRBooth(): UseLDRBoothReturn {
  const [session, setSession] = useState<LDRBoothSession | null>(null);
  const [role, setRole] = useState<LDRRole | null>(null);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPartnerReady, setIsPartnerReady] = useState(false);
  const [syncTrigger, setSyncTrigger] = useState<SyncCountdownTrigger | null>(null);
  const [partnerFlashing, setPartnerFlashing] = useState(false);
  const [incomingWebRTCSignal, setIncomingWebRTCSignal] = useState<WebRTCSignal | null>(null);
  const [jointCaptures, setJointCaptures] = useState<JointCaptureSlot[]>(INITIAL_SLOTS);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const signalListenerRef = useRef<((signal: WebRTCSignal) => void) | null>(null);

  const registerWebRTCSignalListener = useCallback((cb: ((signal: WebRTCSignal) => void) | null) => {
    signalListenerRef.current = cb;
  }, []);

  const broadcastEvent = useCallback(
    (event: LDRRealtimeEvent) => {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast',
        event: event.type,
        payload: event.payload ?? {},
      });
    },
    []
  );

  const sendWebRTCSignal = useCallback(
    (signal: WebRTCSignal) => {
      broadcastEvent({
        type: 'WEBRTC_SIGNAL',
        payload: { signal },
      });
    },
    [broadcastEvent]
  );

  const sendReadyState = useCallback(
    (isReady: boolean) => {
      broadcastEvent({
        type: 'READY_CHANGE',
        payload: { isReady },
      });
    },
    [broadcastEvent]
  );

  const triggerSyncCountdown = useCallback(
    (slotNumber: number, duration: number = 3) => {
      const triggerId = nanoid();
      const trigger: SyncCountdownTrigger = { duration, slotNumber, triggerId };
      setSyncTrigger(trigger);
      broadcastEvent({
        type: 'START_SYNC_COUNTDOWN',
        payload: { duration, slotNumber, triggerId },
      });
    },
    [broadcastEvent]
  );

  const clearSyncTrigger = useCallback(() => {
    setSyncTrigger(null);
  }, []);

  const updateCompositeForSlot = useCallback(
    async (slotNumber: number, hostPhoto: string | null, guestPhoto: string | null) => {
      if (!hostPhoto || !guestPhoto) return;
      console.log(`[LDRBooth] Generating composite for Slot #${slotNumber}...`);
      const comp = await createSideBySideComposite(
        hostPhoto,
        guestPhoto,
        session?.hostName || 'Host',
        session?.guestName || 'Partner'
      );
      setJointCaptures((prev) => {
        const next = [...prev];
        const idx = slotNumber - 1;
        if (idx >= 0 && idx < next.length) {
          next[idx] = { ...next[idx], compositePhoto: comp };
        }
        return next;
      });
    },
    [session?.hostName, session?.guestName]
  );

  const recordAndSyncJointPhoto = useCallback(
    async (slotNumber: number, rawDataUrl: string, currentRole: LDRRole) => {
      // 1. Compress image to ~30KB JPEG so Supabase Realtime broadcast accepts it without dropping
      const smallDataUrl = await compressForRealtime(rawDataUrl, 480, 0.72);
      console.log(`[LDRBooth] (${currentRole}) Broadcasting photo for Slot #${slotNumber} (size: ~${Math.round(smallDataUrl.length / 1024)} KB)`);

      broadcastEvent({
        type: 'JOINT_PHOTO_UPLOADED',
        payload: { slotNumber, dataUrl: smallDataUrl, senderRole: currentRole },
      });

      // 2. Update local state
      let updatedSlot: JointCaptureSlot | null = null;
      setJointCaptures((prev) => {
        const next = [...prev];
        const idx = slotNumber - 1;
        if (idx >= 0 && idx < next.length) {
          const slot = { ...next[idx] };
          if (currentRole === 'host') slot.hostPhoto = smallDataUrl;
          else slot.guestPhoto = smallDataUrl;
          next[idx] = slot;
          updatedSlot = slot;
        }
        return next;
      });

      if (updatedSlot) {
        const s = updatedSlot as JointCaptureSlot;
        if (s.hostPhoto && s.guestPhoto) {
          updateCompositeForSlot(slotNumber, s.hostPhoto, s.guestPhoto);
        }
      }

      // 3. Upsert to Supabase joint_captures table
      if (hasSupabaseConfig && session?.id) {
        try {
          const updateField = currentRole === 'host' ? 'host_photo_url' : 'guest_photo_url';
          const { data: existing, error: selectErr } = await supabase
            .from('joint_captures')
            .select('*')
            .eq('booth_id', session.id)
            .eq('slot_number', slotNumber)
            .maybeSingle();

          if (selectErr) console.warn('[LDRBooth] Supabase query note:', selectErr.message);

          if (existing) {
            console.log(`[LDRBooth] Updating existing joint_captures row for Slot #${slotNumber}...`);
            await supabase
              .from('joint_captures')
              .update({ [updateField]: smallDataUrl })
              .eq('id', existing.id);
          } else {
            console.log(`[LDRBooth] Inserting new joint_captures row for Slot #${slotNumber}...`);
            await supabase
              .from('joint_captures')
              .insert({
                booth_id: session.id,
                slot_number: slotNumber,
                [updateField]: smallDataUrl,
              });
          }
        } catch (err) {
          console.error('[LDRBooth] Supabase joint_captures write error:', err);
        }
      }
    },
    [broadcastEvent, session?.id, updateCompositeForSlot]
  );

  const retakeSlot = useCallback(
    async (slotNumber: number) => {
      console.log(`[LDRBooth] Retaking Slot #${slotNumber}...`);

      // 1. Broadcast retake to partner
      broadcastEvent({
        type: 'CLEAR_PHOTOS',
        payload: { slotNumber },
      });

      // 2. Clear locally
      setJointCaptures((prev) => {
        const next = [...prev];
        const idx = slotNumber - 1;
        if (idx >= 0 && idx < next.length) {
          next[idx] = { slotNumber, hostPhoto: null, guestPhoto: null, compositePhoto: null };
        }
        return next;
      });

      setIsPartnerReady(false);

      // 3. Delete from Supabase
      if (hasSupabaseConfig && session?.id) {
        try {
          await supabase
            .from('joint_captures')
            .delete()
            .eq('booth_id', session.id)
            .eq('slot_number', slotNumber);
        } catch (err) {
          console.warn('[LDRBooth] Supabase delete note:', err);
        }
      }
    },
    [broadcastEvent, session?.id]
  );

  const clearSessionPhotos = useCallback(async () => {
    setSession((prev) => (prev ? { ...prev, photos: [] } : prev));
    setJointCaptures(INITIAL_SLOTS);
    setIsPartnerReady(false);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'CLEAR_PHOTOS',
        payload: { all: true },
      });
    }

    if (hasSupabaseConfig && session?.id) {
      try {
        await supabase.from('joint_captures').delete().eq('booth_id', session.id);
        await supabase.from('photos').delete().eq('booth_id', session.id);
      } catch (err) {
        console.warn('Could not delete photos from Supabase:', err);
      }
    }
  }, [session?.id]);

  const setupChannel = useCallback(
    (code: string, currentRole: LDRRole, currentUserName: string, sessionData: LDRBoothSession) => {
      const normalizedCode = code.trim().toUpperCase();

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase.channel(`booth:${normalizedCode}`, {
        config: {
          broadcast: { self: false },
          presence: { key: currentRole },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const presences = Object.values(state).flat() as any[];
          const hasPartner = presences.some((p) => p.user !== currentRole);
          setIsPartnerOnline(hasPartner);

          const partner = presences.find((p) => p.user !== currentRole);
          if (partner?.name) {
            setSession((prev) => {
              if (!prev) return prev;
              return currentRole === 'host'
                ? { ...prev, guestName: partner.name }
                : { ...prev, hostName: partner.name };
            });
          }
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          setIsPartnerOnline(true);
          const partner = (newPresences as any[]).find((p) => p.user !== currentRole);
          if (partner?.name) {
            setSession((prev) => {
              if (!prev) return prev;
              return currentRole === 'host'
                ? { ...prev, guestName: partner.name }
                : { ...prev, hostName: partner.name };
            });
          }
        })
        .on('presence', { event: 'leave' }, () => {
          const state = channel.presenceState();
          const presences = Object.values(state).flat() as any[];
          const hasPartner = presences.some((p) => p.user !== currentRole);
          setIsPartnerOnline(hasPartner);
          setIsPartnerReady(false);
        })
        .on('broadcast', { event: 'PARTNER_JOINED' }, ({ payload }) => {
          setIsPartnerOnline(true);
          if (payload?.name) {
            setSession((prev) => {
              if (!prev) return prev;
              return currentRole === 'host'
                ? { ...prev, guestName: payload.name as string, status: 'active' }
                : { ...prev, hostName: payload.name as string, status: 'active' };
            });
          }
        })
        .on('broadcast', { event: 'WEBRTC_SIGNAL' }, ({ payload }) => {
          setIsPartnerOnline(true);
          if (payload?.signal) {
            const sig = payload.signal as WebRTCSignal;
            setIncomingWebRTCSignal(sig);
            if (signalListenerRef.current) {
              signalListenerRef.current(sig);
            }
          }
        })
        .on('broadcast', { event: 'READY_CHANGE' }, ({ payload }) => {
          setIsPartnerOnline(true);
          setIsPartnerReady(!!payload?.isReady);
        })
        .on('broadcast', { event: 'START_SYNC_COUNTDOWN' }, ({ payload }) => {
          setIsPartnerOnline(true);
          if (payload?.slotNumber) {
            setSyncTrigger({
              duration: (payload.duration as number) || 3,
              slotNumber: payload.slotNumber as number,
              triggerId: (payload.triggerId as string) || nanoid(),
            });
          }
        })
        .on('broadcast', { event: 'JOINT_PHOTO_UPLOADED' }, async ({ payload }) => {
          setIsPartnerOnline(true);
          if (payload?.slotNumber && payload?.dataUrl && payload?.senderRole) {
            const sNum = payload.slotNumber as number;
            const sRole = payload.senderRole as 'host' | 'guest';
            const sData = payload.dataUrl as string;

            console.log(`[LDRBooth] Received partner photo for Slot #${sNum} from ${sRole}!`);

            let updatedSlot: JointCaptureSlot | null = null;
            setJointCaptures((prev) => {
              const next = [...prev];
              const idx = sNum - 1;
              if (idx >= 0 && idx < next.length) {
                const slot = { ...next[idx] };
                if (sRole === 'host') slot.hostPhoto = sData;
                else slot.guestPhoto = sData;
                next[idx] = slot;
                updatedSlot = slot;
              }
              return next;
            });

            if (updatedSlot) {
              const s = updatedSlot as JointCaptureSlot;
              if (s.hostPhoto && s.guestPhoto) {
                console.log(`[LDRBooth] Both photos present for Slot #${sNum}! Creating composite...`);
                const comp = await createSideBySideComposite(
                  s.hostPhoto,
                  s.guestPhoto,
                  sessionData.hostName || 'Host',
                  sessionData.guestName || 'Partner'
                );
                setJointCaptures((prev) => {
                  const next = [...prev];
                  const idx = sNum - 1;
                  if (idx >= 0 && idx < next.length) {
                    next[idx] = { ...next[idx], compositePhoto: comp };
                  }
                  return next;
                });
              }
            }
          }
        })
        .on('broadcast', { event: 'CLEAR_PHOTOS' }, ({ payload }) => {
          if (payload?.slotNumber) {
            const sNum = payload.slotNumber as number;
            console.log(`[LDRBooth] Partner requested retake on Slot #${sNum}`);
            setJointCaptures((prev) => {
              const next = [...prev];
              const idx = sNum - 1;
              if (idx >= 0 && idx < next.length) {
                next[idx] = { slotNumber: sNum, hostPhoto: null, guestPhoto: null, compositePhoto: null };
              }
              return next;
            });
            setIsPartnerReady(false);
          } else {
            setJointCaptures(INITIAL_SLOTS);
            setIsPartnerReady(false);
          }
        })
        .on('broadcast', { event: 'FLASH' }, () => {
          setPartnerFlashing(true);
          setTimeout(() => setPartnerFlashing(false), 600);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            await channel.track({
              user: currentRole,
              name: currentUserName,
              online_at: new Date().toISOString(),
            });

            channel.send({
              type: 'broadcast',
              event: 'PARTNER_JOINED',
              payload: { name: currentUserName, role: currentRole },
            });
          }
        });

      channelRef.current = channel;
    },
    []
  );

  const connectToBooth = useCallback(
    async (code: string, currentRole: LDRRole, currentUserName: string): Promise<boolean> => {
      setError(null);
      const normalizedCode = code.trim().toUpperCase();
      let foundSession: LDRBoothSession | null = null;

      if (hasSupabaseConfig) {
        const { data: dbData } = await supabase
          .from('booths')
          .select('*')
          .eq('code', normalizedCode)
          .maybeSingle();

        if (dbData) {
          foundSession = {
            id: dbData.id,
            code: dbData.code,
            hostName: dbData.host_name,
            guestName: dbData.guest_name || (currentRole === 'guest' ? currentUserName : undefined),
            status: 'active',
            photos: [],
            createdAt: dbData.created_at,
          };

          if (currentRole === 'guest') {
            await supabase
              .from('booths')
              .update({ guest_name: currentUserName, status: 'active' })
              .eq('id', dbData.id);
          }
        }
      }

      // GUEST joining a code that doesn't exist in the DB -> fail, don't fabricate
      if (!foundSession && currentRole === 'guest') {
        setError('Booth not found. Check the code and try again.');
        return false;
      }

      // HOST reconnecting without a DB match (e.g. Supabase not configured) -> local fallback only for host
      if (!foundSession) {
        foundSession = {
          id: nanoid(),
          code: normalizedCode,
          hostName: currentUserName,
          status: 'active',
          photos: [],
          createdAt: new Date().toISOString(),
        };
      }

      setSession(foundSession);
      setRole(currentRole);
      setupChannel(normalizedCode, currentRole, currentUserName, foundSession);

      // Load any existing joint captures from DB
      if (hasSupabaseConfig && foundSession.id) {
        supabase
          .from('joint_captures')
          .select('*')
          .eq('booth_id', foundSession.id)
          .then(({ data: captures }) => {
            if (captures && captures.length > 0) {
              setJointCaptures((prev) => {
                const next = [...prev];
                captures.forEach((c) => {
                  const idx = c.slot_number - 1;
                  if (idx >= 0 && idx < next.length) {
                    next[idx] = {
                      slotNumber: c.slot_number,
                      hostPhoto: c.host_photo_url,
                      guestPhoto: c.guest_photo_url,
                      compositePhoto: null,
                    };
                    if (c.host_photo_url && c.guest_photo_url) {
                      createSideBySideComposite(c.host_photo_url, c.guest_photo_url, foundSession?.hostName || 'Host', foundSession?.guestName || 'Partner')
                        .then((comp) => {
                          setJointCaptures((p) => {
                            const u = [...p];
                            u[idx] = { ...u[idx], compositePhoto: comp };
                            return u;
                          });
                        });
                    }
                  }
                });
                return next;
              });
            }
          });
      }

      return true;
    },
    [setupChannel]
  );

  const createBooth = useCallback(
    async (hostName: string): Promise<string | null> => {
      const code = generateCode();
      let boothId = nanoid();

      if (hasSupabaseConfig) {
        const { data: dbData, error: dbError } = await supabase
          .from('booths')
          .insert({
            code,
            host_name: hostName,
            status: 'waiting',
          })
          .select()
          .maybeSingle();

        if (!dbError && dbData) {
          boothId = dbData.id;
        } else if (dbError) {
          console.warn('DB insert note:', dbError.message);
        }
      }

      const newSession: LDRBoothSession = {
        id: boothId,
        code,
        hostName,
        status: 'waiting',
        photos: [],
        createdAt: new Date().toISOString(),
      };

      setSession(newSession);
      setRole('host');
      setupChannel(code, 'host', hostName, newSession);
      return code;
    },
    [setupChannel]
  );

  const joinBooth = useCallback(
    async (code: string, guestName: string): Promise<boolean> => {
      return connectToBooth(code, 'guest', guestName);
    },
    [connectToBooth]
  );

  const leaveBooth = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setSession(null);
    setRole(null);
    setIsPartnerOnline(false);
    setIsConnected(false);
    setIsPartnerReady(false);
    setSyncTrigger(null);
    setJointCaptures(INITIAL_SLOTS);
  }, []);

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    session,
    role,
    isPartnerOnline,
    isConnected,
    isPartnerReady,
    syncTrigger,
    partnerFlashing,
    incomingWebRTCSignal,
    registerWebRTCSignalListener,
    jointCaptures,
    error,
    connectToBooth,
    createBooth,
    joinBooth,
    broadcastEvent,
    sendWebRTCSignal,
    sendReadyState,
    triggerSyncCountdown,
    clearSyncTrigger,
    recordAndSyncJointPhoto,
    retakeSlot,
    clearSessionPhotos,
    leaveBooth,
  };
}
