import { useState, useEffect, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import type { LDRBoothSession, LDRRealtimeEvent, CapturedPhoto } from '../types';

export type LDRRole = 'host' | 'guest';

export interface RetakeRequestInfo {
  requesterName: string;
  position: number;
}

export interface RetakeResponseInfo {
  accepted: boolean;
  position: number;
}

export interface UseLDRBoothReturn {
  session: LDRBoothSession | null;
  role: LDRRole | null;
  isPartnerOnline: boolean;
  isConnected: boolean;
  isPartnerReady: boolean;
  remoteCountdown: number | null;
  partnerFlashing: boolean;
  retakeRequest: RetakeRequestInfo | null;
  retakeResponse: RetakeResponseInfo | null;
  error: string | null;
  createBooth: (hostName: string) => Promise<string | null>;
  joinBooth: (code: string, guestName: string) => Promise<boolean>;
  broadcastEvent: (event: LDRRealtimeEvent) => void;
  sendReadyState: (isReady: boolean) => void;
  sendCountdownStart: (duration?: number) => void;
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

export function useLDRBooth(): UseLDRBoothReturn {
  const [session, setSession] = useState<LDRBoothSession | null>(null);
  const [role, setRole] = useState<LDRRole | null>(null);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPartnerReady, setIsPartnerReady] = useState(false);
  const [remoteCountdown, setRemoteCountdown] = useState<number | null>(null);
  const [partnerFlashing, setPartnerFlashing] = useState(false);
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

  const sendReadyState = useCallback(
    (isReady: boolean) => {
      broadcastEvent({
        type: 'READY_CHANGE',
        payload: { isReady },
      });
    },
    [broadcastEvent]
  );

  const sendCountdownStart = useCallback(
    (duration: number = 3) => {
      broadcastEvent({
        type: 'START_COUNTDOWN',
        payload: { duration },
      });
    },
    [broadcastEvent]
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
        .on('broadcast', { event: 'READY_CHANGE' }, ({ payload }) => {
          setIsPartnerReady(!!payload?.isReady);
        })
        .on('broadcast', { event: 'START_COUNTDOWN' }, ({ payload }) => {
          const dur = typeof payload?.duration === 'number' ? payload.duration : 3;
          setRemoteCountdown(dur);
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
    remoteCountdown,
    partnerFlashing,
    retakeRequest,
    retakeResponse,
    error,
    createBooth,
    joinBooth,
    broadcastEvent,
    sendReadyState,
    sendCountdownStart,
    sendRetakeRequest,
    respondRetake,
    clearRetakeStates,
    addPhoto,
    clearSessionPhotos,
    leaveBooth,
  };
}
