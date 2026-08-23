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
      if (!channelRef.current || !session) return;
      channelRef.current.send({
        type: 'broadcast',
        event: event.type,
        payload: event.payload ?? {},
      });
    },
    [session]
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
      // 3.2 seconds into the future to allow for network packet transmission
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
      // 1. Broadcast to partner immediately
      broadcastEvent({
        type: 'JOINT_PHOTO_UPLOADED',
        payload: { slotNumber, dataUrl, senderRole },
      });

      // 2. Update local joint capture state
      setJointCaptures((prev) => {
        const next = [...prev];
        const idx = slotNumber - 1;
        if (idx >= 0 && idx < next.length) {
          const slot = { ...next[idx] };
          if (senderRole === 'host') slot.hostPhoto = dataUrl;
          else slot.guestPhoto = dataUrl;

          // If both photos present, generate side-by-side composite
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
        // Reset that specific slot in jointCaptures
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
    (code: string, currentRole: LDRRole, sessionData: LDRBoothSession) => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase.channel(`booth:${code}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const count = Object.keys(state).length;
          setIsPartnerOnline(count > 1);
        })
        .on('presence', { event: 'join' }, () => {
          setIsPartnerOnline(true);
        })
        .on('presence', { event: 'leave' }, () => {
          const state = channel.presenceState();
          setIsPartnerOnline(Object.keys(state).length > 1);
          setIsPartnerReady(false);
        })
        .on('broadcast', { event: 'PARTNER_JOINED' }, () => {
          setSession((prev) => (prev ? { ...prev, status: 'active' } : prev));
        })
        .on('broadcast', { event: 'WEBRTC_SIGNAL' }, ({ payload }) => {
          if (payload?.signal) {
            setIncomingWebRTCSignal(payload.signal as WebRTCSignal);
          }
        })
        .on('broadcast', { event: 'READY_CHANGE' }, ({ payload }) => {
          setIsPartnerReady(!!payload?.isReady);
        })
        .on('broadcast', { event: 'START_SYNC_COUNTDOWN' }, ({ payload }) => {
          if (payload?.targetTimestamp && payload?.slotNumber) {
            setSyncCountdown({
              targetTimestamp: payload.targetTimestamp as number,
              slotNumber: payload.slotNumber as number,
              duration: (payload.duration as number) || 3,
            });
          }
        })
        .on('broadcast', { event: 'JOINT_PHOTO_UPLOADED' }, ({ payload }) => {
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
          if (payload?.requesterName && typeof payload?.position === 'number') {
            setRetakeRequest({
              requesterName: payload.requesterName as string,
              position: payload.position as number,
            });
          }
        })
        .on('broadcast', { event: 'RETAKE_RESPONSE' }, ({ payload }) => {
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
          if (payload?.photo) {
            addPhoto(payload.photo as CapturedPhoto);
          }
        })
        .on('broadcast', { event: 'FLASH' }, () => {
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
              online_at: new Date().toISOString(),
            });

            if (currentRole === 'guest') {
              channel.send({
                type: 'broadcast',
                event: 'PARTNER_JOINED',
                payload: { guestName: sessionData.guestName },
              });
            }
          }
        });

      channelRef.current = channel;
    },
    [addPhoto]
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
      setupChannel(code, 'host', newSession);
      return code;
    },
    [setupChannel]
  );

  const joinBooth = useCallback(
    async (code: string, guestName: string): Promise<boolean> => {
      let foundSession: LDRBoothSession | null = null;

      if (hasSupabaseConfig) {
        const { data, error: dbError } = await supabase
          .from('booths')
          .select('*')
          .eq('code', code.toUpperCase())
          .maybeSingle();

        if (dbError || !data) {
          setError('Booth not found. Check the code and try again!');
          return false;
        }

        const { data: existingPhotos } = await supabase
          .from('photos')
          .select('*')
          .eq('booth_id', data.id)
          .order('position', { ascending: true });

        const mappedPhotos: CapturedPhoto[] = (existingPhotos || []).map((p) => ({
          id: p.id,
          dataUrl: p.image_url,
          filter: p.filter,
          takerName: p.taker_name,
          position: p.position,
          timestamp: new Date(p.created_at).getTime(),
        }));

        foundSession = {
          id: data.id,
          code: data.code,
          hostName: data.host_name,
          guestName,
          status: 'active',
          photos: mappedPhotos,
          createdAt: data.created_at,
        };

        await supabase
          .from('booths')
          .update({ guest_name: guestName, status: 'active' })
          .eq('id', data.id);
      } else {
        foundSession = {
          id: nanoid(),
          code: code.toUpperCase(),
          hostName: 'Partner',
          guestName,
          status: 'active',
          photos: [],
          createdAt: new Date().toISOString(),
        };
      }

      setSession(foundSession);
      setRole('guest');
      if (foundSession) {
        setupChannel(foundSession.code, 'guest', foundSession);
      }
      return true;
    },
    [setupChannel]
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
