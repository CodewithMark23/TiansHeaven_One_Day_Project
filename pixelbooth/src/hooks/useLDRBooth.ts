import { useState, useEffect, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import type { BoothSession, LDRRealtimeEvent, CapturedPhoto } from '../types';

export type LDRRole = 'host' | 'guest';

export interface UseLDRBoothReturn {
  session: BoothSession | null;
  role: LDRRole | null;
  isPartnerOnline: boolean;
  isConnected: boolean;
  error: string | null;
  createBooth: (hostName: string) => Promise<string | null>; // returns code
  joinBooth: (code: string, guestName: string) => Promise<boolean>;
  broadcastEvent: (event: LDRRealtimeEvent) => void;
  addPhoto: (photo: CapturedPhoto) => void;
  leaveBooth: () => void;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

export function useLDRBooth(): UseLDRBoothReturn {
  const [session, setSession] = useState<BoothSession | null>(null);
  const [role, setRole] = useState<LDRRole | null>(null);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
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

  const addPhoto = useCallback((photo: CapturedPhoto) => {
    setSession((prev) =>
      prev ? { ...prev, photos: [...prev.photos, photo] } : prev
    );
  }, []);

  const setupChannel = useCallback(
    (code: string, currentRole: LDRRole, sessionData: BoothSession) => {
      // Clean up existing channel
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
        })
        .on('broadcast', { event: 'PARTNER_JOINED' }, () => {
          setSession((prev) =>
            prev ? { ...prev, status: 'active' } : prev
          );
        })
        .on('broadcast', { event: 'PHOTO_TAKEN' }, ({ payload }) => {
          if (payload?.photo) {
            addPhoto(payload.photo as CapturedPhoto);
          }
        })
        .on('broadcast', { event: 'STRIP_READY' }, () => {
          setSession((prev) =>
            prev ? { ...prev, status: 'done' } : prev
          );
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            await channel.track({
              user: currentRole,
              online_at: new Date().toISOString(),
            });

            // If guest, announce joining
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
      const newSession: BoothSession = {
        id: nanoid(),
        code,
        hostName,
        status: 'waiting',
        photos: [],
        createdAt: new Date().toISOString(),
      };

      if (hasSupabaseConfig) {
        const { error: dbError } = await supabase.from('booths').insert({
          id: newSession.id,
          code,
          host_name: hostName,
          status: 'waiting',
        });
        if (dbError) {
          console.warn('DB insert failed, using local session:', dbError.message);
        }
      }

      setSession(newSession);
      setRole('host');
      setupChannel(code, 'host', newSession);
      return code;
    },
    [setupChannel]
  );

  const joinBooth = useCallback(
    async (code: string, guestName: string): Promise<boolean> => {
      let foundSession: BoothSession | null = null;

      if (hasSupabaseConfig) {
        const { data, error: dbError } = await supabase
          .from('booths')
          .select('*')
          .eq('code', code.toUpperCase())
          .single();

        if (dbError || !data) {
          setError('Booth not found. Check the code and try again!');
          return false;
        }

        foundSession = {
          id: data.id,
          code: data.code,
          hostName: data.host_name,
          guestName,
          status: 'active',
          photos: [],
          createdAt: data.created_at,
        };

        // Update guest name in DB
        await supabase
          .from('booths')
          .update({ guest_name: guestName, status: 'active' })
          .eq('id', data.id);
      } else {
        // Local-only mode (no Supabase)
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
      setupChannel(foundSession.code, 'guest', foundSession);
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
    error,
    createBooth,
    joinBooth,
    broadcastEvent,
    addPhoto,
    leaveBooth,
  };
}
