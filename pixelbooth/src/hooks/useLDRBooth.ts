import { useState, useEffect, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import type { LDRBoothSession, LDRRealtimeEvent, CapturedPhoto, JointCaptureSlot } from '../types';
import type { WebRTCSignal } from './useWebRTC';
import { createSideBySideComposite } from '../lib/ldrComposite';

export type LDRRole = 'host' | 'guest';

export interface RetakeRequestInfo {
  requesterName: string;
  position: number;
}

export interface RetakeResponseInfo {
  accepted: boolean;
  position: number;
}

export interface SyncCountdownInfo {
  targetTimestamp: number;
  slotNumber: number;
  duration: number;
}

export interface UseLDRBoothReturn {
  session: LDRBoothSession | null;
  role: LDRRole | null;
  isPartnerOnline: boolean;
  isConnected: boolean;
  isPartnerReady: boolean;
  syncCountdown: SyncCountdownInfo | null;
  partnerFlashing: boolean;
  incomingWebRTCSignal: WebRTCSignal | null;
  jointCaptures: JointCaptureSlot[];
  retakeRequest: RetakeRequestInfo | null;
  retakeResponse: RetakeResponseInfo | null;
  error: string | null;
  connectToBooth: (code: string, currentRole: LDRRole, currentUserName: string) => Promise<boolean>;
  createBooth: (hostName: string) => Promise<string | null>;
  joinBooth: (code: string, guestName: string) => Promise<boolean>;
  broadcastEvent: (event: LDRRealtimeEvent) => void;
  sendWebRTCSignal: (signal: WebRTCSignal) => void;
  sendReadyState: (isReady: boolean) => void;
  sendSyncCountdown: (slotNumber: number, duration?: number) => void;
  clearSyncCountdown: () => void;
  sendJointPhoto: (slotNumber: number, dataUrl: string, senderRole: 'host' | 'guest') => Promise<void>;
  sendRetakeRequest: (requesterName: string, position: number) => void;
  respondRetake: (accepted: boolean, position: number) => void;
  clearRetakeStates: () => void;
  addPhoto: (photo: CapturedPhoto) => void;
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
  const [syncCountdown, setSyncCountdown] = useState<SyncCountdownInfo | null>(null);
  const [partnerFlashing, setPartnerFlashing] = useState(false);
  const [incomingWebRTCSignal, setIncomingWebRTCSignal] = useState<WebRTCSignal | null>(null);
  const [jointCaptures, setJointCaptures] = useState<JointCaptureSlot[]>(INITIAL_SLOTS);
  const [retakeRequest, setRetakeRequest] = useState<RetakeRequestInfo | null>(null);
  const [retakeResponse, setRetakeResponse] = useState<RetakeResponseInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

  const sendSyncCountdown = useCallback(
    (slotNumber: number, duration: number = 3) => {
      const targetTimestamp = Date.now() + duration * 1000 + 200;
      const info: SyncCountdownInfo = { targetTimestamp, slotNumber, duration };
      setSyncCountdown(info);
      broadcastEvent({
        type: 'START_SYNC_COUNTDOWN',
        payload: { targetTimestamp, slotNumber, duration },
      });
    },
    [broadcastEvent]
  );

  const clearSyncCountdown = useCallback(() => {
    setSyncCountdown(null);
  }, []);

  const sendJointPhoto = useCallback(
    async (slotNumber: number, dataUrl: string, senderRole: 'host' | 'guest') => {
      broadcastEvent({
        type: 'JOINT_PHOTO_UPLOADED',
        payload: { slotNumber, dataUrl, senderRole },
      });

      setJointCaptures((prev) => {
        const next = [...prev];
        const idx = slotNumber - 1;
        if (idx >= 0 && idx < next.length) {
          const slot = { ...next[idx] };
          if (senderRole === 'host') slot.hostPhoto = dataUrl;
          else slot.guestPhoto = dataUrl;

          if (slot.hostPhoto && slot.guestPhoto) {
            createSideBySideComposite(
              slot.hostPhoto,
              slot.guestPhoto,
              session?.hostName || 'Host',
              session?.guestName || 'Partner'
            ).then((comp) => {
              setJointCaptures((p) => {
                const u = [...p];
                u[idx] = { ...u[idx], compositePhoto: comp };
                return u;
              });
            });
          }
          next[idx] = slot;
        }
        return next;
      });
    },
    [broadcastEvent, session?.hostName, session?.guestName]
  );

  const sendRetakeRequest = useCallback(
    (requesterName: string, position: number) => {
      broadcastEvent({
        type: 'RETAKE_REQUEST',
        payload: { requesterName, position },
      });
    },
    [broadcastEvent]
  );

  const respondRetake = useCallback(
    (accepted: boolean, position: number) => {
      broadcastEvent({
        type: 'RETAKE_RESPONSE',
        payload: { accepted, position },
      });
      if (accepted) {
        setJointCaptures((prev) => {
          const next = [...prev];
          const idx = position - 1;
          if (idx >= 0 && idx < next.length) {
            next[idx] = { slotNumber: position, hostPhoto: null, guestPhoto: null, compositePhoto: null };
          }
          return next;
        });
      }
      setRetakeRequest(null);
    },
    [broadcastEvent]
  );

  const clearRetakeStates = useCallback(() => {
    setRetakeRequest(null);
    setRetakeResponse(null);
  }, []);

  const addPhoto = useCallback(
    async (photo: CapturedPhoto) => {
      setSession((prev) => {
        if (!prev) return prev;
        if (prev.photos.some((p) => p.id === photo.id)) return prev;
        return { ...prev, photos: [...prev.photos, photo] };
      });

      if (hasSupabaseConfig && session?.id) {
        try {
          await supabase.from('photos').insert({
            booth_id: session.id,
            taker_name: photo.takerName,
            image_url: photo.dataUrl,
            filter: photo.filter,
            position: photo.position,
          });
        } catch (err) {
          console.warn('Could not save photo to Supabase:', err);
        }
      }
    },
    [session?.id]
  );

  const clearSessionPhotos = useCallback(async () => {
    setSession((prev) => (prev ? { ...prev, photos: [] } : prev));
    setJointCaptures(INITIAL_SLOTS);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'CLEAR_PHOTOS',
        payload: {},
      });
    }
    if (hasSupabaseConfig && session?.id) {
      try {
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
          const hasPartner = presences.some((p) => p.user !== currentRole) || presences.length > 1;
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
            setIncomingWebRTCSignal(payload.signal as WebRTCSignal);
          }
        })
        .on('broadcast', { event: 'READY_CHANGE' }, ({ payload }) => {
          setIsPartnerOnline(true);
          setIsPartnerReady(!!payload?.isReady);
        })
        .on('broadcast', { event: 'START_SYNC_COUNTDOWN' }, ({ payload }) => {
          setIsPartnerOnline(true);
          if (payload?.targetTimestamp && payload?.slotNumber) {
            setSyncCountdown({
              targetTimestamp: payload.targetTimestamp as number,
              slotNumber: payload.slotNumber as number,
              duration: (payload.duration as number) || 3,
            });
          }
        })
        .on('broadcast', { event: 'JOINT_PHOTO_UPLOADED' }, ({ payload }) => {
          setIsPartnerOnline(true);
          if (payload?.slotNumber && payload?.dataUrl && payload?.senderRole) {
            const sNum = payload.slotNumber as number;
            const sRole = payload.senderRole as 'host' | 'guest';
            const sData = payload.dataUrl as string;

            setJointCaptures((prev) => {
              const next = [...prev];
              const idx = sNum - 1;
              if (idx >= 0 && idx < next.length) {
                const slot = { ...next[idx] };
                if (sRole === 'host') slot.hostPhoto = sData;
                else slot.guestPhoto = sData;

                if (slot.hostPhoto && slot.guestPhoto) {
                  createSideBySideComposite(
                    slot.hostPhoto,
                    slot.guestPhoto,
                    sessionData.hostName || 'Host',
                    sessionData.guestName || 'Partner'
                  ).then((comp) => {
                    setJointCaptures((p) => {
                      const u = [...p];
                      u[idx] = { ...u[idx], compositePhoto: comp };
                      return u;
                    });
                  });
                }
                next[idx] = slot;
              }
              return next;
            });
          }
        })
        .on('broadcast', { event: 'RETAKE_REQUEST' }, ({ payload }) => {
          setIsPartnerOnline(true);
          if (payload?.requesterName && typeof payload?.position === 'number') {
            setRetakeRequest({
              requesterName: payload.requesterName as string,
              position: payload.position as number,
            });
          }
        })
        .on('broadcast', { event: 'RETAKE_RESPONSE' }, ({ payload }) => {
          setIsPartnerOnline(true);
          if (typeof payload?.accepted === 'boolean' && typeof payload?.position === 'number') {
            setRetakeResponse({
              accepted: payload.accepted as boolean,
              position: payload.position as number,
            });
            if (payload.accepted) {
              setJointCaptures((prev) => {
                const next = [...prev];
                const idx = (payload.position as number) - 1;
                if (idx >= 0 && idx < next.length) {
                  next[idx] = { slotNumber: payload.position as number, hostPhoto: null, guestPhoto: null, compositePhoto: null };
                }
                return next;
              });
            }
          }
        })
        .on('broadcast', { event: 'PHOTO_TAKEN' }, ({ payload }) => {
          setIsPartnerOnline(true);
          if (payload?.photo) {
            addPhoto(payload.photo as CapturedPhoto);
          }
        })
        .on('broadcast', { event: 'FLASH' }, () => {
          setIsPartnerOnline(true);
          setPartnerFlashing(true);
          setTimeout(() => setPartnerFlashing(false), 600);
        })
        .on('broadcast', { event: 'CLEAR_PHOTOS' }, () => {
          setSession((prev) => (prev ? { ...prev, photos: [] } : prev));
          setJointCaptures(INITIAL_SLOTS);
        })
        .on('broadcast', { event: 'STRIP_READY' }, () => {
          setSession((prev) => (prev ? { ...prev, status: 'done' } : prev));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            await channel.track({
              user: currentRole,
              name: currentUserName,
              online_at: new Date().toISOString(),
            });

            // Announce presence immediately via broadcast
            channel.send({
              type: 'broadcast',
              event: 'PARTNER_JOINED',
              payload: { name: currentUserName, role: currentRole },
            });
          }
        });

      channelRef.current = channel;
    },
    [addPhoto]
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

      if (!foundSession) {
        foundSession = {
          id: nanoid(),
          code: normalizedCode,
          hostName: currentRole === 'host' ? currentUserName : 'Partner',
          guestName: currentRole === 'guest' ? currentUserName : undefined,
          status: 'active',
          photos: [],
          createdAt: new Date().toISOString(),
        };
      }

      setSession(foundSession);
      setRole(currentRole);
      setupChannel(normalizedCode, currentRole, currentUserName, foundSession);
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
    setSyncCountdown(null);
    setJointCaptures(INITIAL_SLOTS);
    setRetakeRequest(null);
    setRetakeResponse(null);
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
    syncCountdown,
    partnerFlashing,
    incomingWebRTCSignal,
    jointCaptures,
    retakeRequest,
    retakeResponse,
    error,
    connectToBooth,
    createBooth,
    joinBooth,
    broadcastEvent,
    sendWebRTCSignal,
    sendReadyState,
    sendSyncCountdown,
    clearSyncCountdown,
    sendJointPhoto,
    sendRetakeRequest,
    respondRetake,
    clearRetakeStates,
    addPhoto,
    clearSessionPhotos,
    leaveBooth,
  };
}
