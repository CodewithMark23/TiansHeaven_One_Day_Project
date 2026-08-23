import { useState, useEffect, useRef, useCallback } from 'react';

export type WebRTCConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';

export interface WebRTCSignal {
  type: 'OFFER' | 'ANSWER' | 'CANDIDATE';
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
  senderRole: 'host' | 'guest';
}

interface UseWebRTCProps {
  localStream: MediaStream | null;
  role: 'host' | 'guest' | null;
  isPartnerOnline: boolean;
  onSendSignal: (signal: WebRTCSignal) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function useWebRTC({
  localStream,
  role,
  isPartnerOnline,
  onSendSignal,
}: UseWebRTCProps) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<WebRTCConnectionState>('idle');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const isInitiator = role === 'host';

  const cleanupPeer = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    setRemoteStream(null);
    setConnectionState('idle');
    pendingCandidates.current = [];
  }, []);

  const createPeerConnection = useCallback(() => {
    if (pcRef.current) cleanupPeer();

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    setConnectionState('connecting');

    // Add local tracks if stream is available
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setConnectionState('connected');
      } else {
        const inboundStream = new MediaStream([event.track]);
        setRemoteStream(inboundStream);
        setConnectionState('connected');
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && role) {
        onSendSignal({
          type: 'CANDIDATE',
          data: event.candidate.toJSON(),
          senderRole: role,
        });
      }
    };

    // Connection state monitor
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setConnectionState('connected');
      } else if (state === 'connecting') {
        setConnectionState('connecting');
      } else if (state === 'disconnected') {
        setConnectionState('disconnected');
      } else if (state === 'failed' || state === 'closed') {
        setConnectionState('failed');
      }
    };

    return pc;
  }, [localStream, role, onSendSignal, cleanupPeer]);

  // Initiate connection when Host sees Partner online and localStream is ready
  useEffect(() => {
    if (!role || !isPartnerOnline || !localStream) {
      if (!isPartnerOnline) cleanupPeer();
      return;
    }

    // Only host creates initial offer to prevent race conditions
    if (isInitiator && (!pcRef.current || pcRef.current.connectionState === 'closed')) {
      const pc = createPeerConnection();

      pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: false })
        .then(async (offer) => {
          await pc.setLocalDescription(offer);
          onSendSignal({
            type: 'OFFER',
            data: offer,
            senderRole: role,
          });
        })
        .catch((err) => {
          console.warn('Error creating WebRTC offer:', err);
          setConnectionState('failed');
        });
    }

    return () => {
      // Don't eagerly close on re-render unless partner went offline
    };
  }, [role, isPartnerOnline, localStream, isInitiator, createPeerConnection, onSendSignal, cleanupPeer]);

  // Process incoming signal messages (OFFER, ANSWER, CANDIDATE)
  const handleIncomingSignal = useCallback(
    async (signal: WebRTCSignal) => {
      if (!signal || signal.senderRole === role) return;

      try {
        let pc = pcRef.current;

        if (signal.type === 'OFFER') {
          // Guest receives offer
          if (!pc) pc = createPeerConnection();

          await pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));

          // Flush any early candidates
          while (pendingCandidates.current.length > 0) {
            const cand = pendingCandidates.current.shift();
            if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          if (role) {
            onSendSignal({
              type: 'ANSWER',
              data: answer,
              senderRole: role,
            });
          }
        } else if (signal.type === 'ANSWER') {
          // Host receives answer
          if (pc && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));

            // Flush candidates
            while (pendingCandidates.current.length > 0) {
              const cand = pendingCandidates.current.shift();
              if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          }
        } else if (signal.type === 'CANDIDATE') {
          const candidateData = signal.data as RTCIceCandidateInit;
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(candidateData));
          } else {
            pendingCandidates.current.push(candidateData);
          }
        }
      } catch (err) {
        console.warn('Error handling WebRTC signal:', err);
      }
    },
    [role, createPeerConnection, onSendSignal]
  );

  return {
    remoteStream,
    connectionState,
    handleIncomingSignal,
    restartConnection: createPeerConnection,
  };
}
