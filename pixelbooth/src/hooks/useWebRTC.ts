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

// Google STUN + Open Relay Project Free STUN/TURN fallback
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:openrelay.metered.ca:80' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelay',
      credential: 'openrelay',
    },
  ],
  iceCandidatePoolSize: 10,
};

const CONNECTION_TIMEOUT_MS = 15000;

export function useWebRTC({
  localStream,
  role,
  isPartnerOnline,
  onSendSignal,
}: UseWebRTCProps) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<WebRTCConnectionState>('idle');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitiator = role === 'host';

  const clearTimeoutTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startTimeoutTimer = useCallback(() => {
    clearTimeoutTimer();
    timeoutRef.current = setTimeout(() => {
      if (pcRef.current && pcRef.current.connectionState !== 'connected') {
        console.warn(`[WebRTC (${role})] Connection timed out after 15s. Marking as failed.`);
        setConnectionState('failed');
      }
    }, CONNECTION_TIMEOUT_MS);
  }, [role]);

  // Keep live local stream reference and add tracks dynamically
  useEffect(() => {
    localStreamRef.current = localStream;
    if (pcRef.current && localStream) {
      const senders = pcRef.current.getSenders();
      localStream.getTracks().forEach((track) => {
        const alreadyAdded = senders.some((s) => s.track?.id === track.id);
        if (!alreadyAdded) {
          console.log(`[WebRTC (${role})] Adding local track:`, track.kind, track.id);
          pcRef.current?.addTrack(track, localStream);
        }
      });
    }
  }, [localStream, role]);

  const cleanupPeer = useCallback(() => {
    console.log(`[WebRTC (${role})] Cleaning up peer connection.`);
    clearTimeoutTimer();
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onicegatheringstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onsignalingstatechange = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    setRemoteStream(null);
    setConnectionState('idle');
    pendingCandidates.current = [];
  }, [role]);

  const createPeerConnection = useCallback(() => {
    if (pcRef.current) cleanupPeer();

    console.log(`[WebRTC (${role})] Creating new RTCPeerConnection with STUN+TURN...`);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    setConnectionState('connecting');
    startTimeoutTimer();

    // Add local tracks
    const activeStream = localStreamRef.current;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        console.log(`[WebRTC (${role})] [addTrack] Adding track:`, track.kind, track.id);
        pc.addTrack(track, activeStream);
      });
    } else {
      console.warn(`[WebRTC (${role})] localStream not ready yet when creating PC`);
    }

    // Remote track listener
    pc.ontrack = (event) => {
      console.log(`[WebRTC (${role})] [ontrack] Fired! Track kind:`, event.track.kind, 'Streams:', event.streams.length);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const inboundStream = new MediaStream([event.track]);
        setRemoteStream(inboundStream);
      }
      setConnectionState('connected');
      clearTimeoutTimer();
    };

    // ICE Candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate && role) {
        console.log(
          `[WebRTC (${role})] [onicecandidate] Generated candidate:`,
          event.candidate.type || 'unknown',
          event.candidate.protocol,
          event.candidate.candidate
        );
        onSendSignal({
          type: 'CANDIDATE',
          data: event.candidate.toJSON(),
          senderRole: role,
        });
      } else if (!event.candidate) {
        console.log(`[WebRTC (${role})] [onicecandidate] ICE Gathering finished (candidate is null).`);
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC (${role})] [onicegatheringstatechange] ->`, pc.iceGatheringState);
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      console.log(`[WebRTC (${role})] [oniceconnectionstatechange] ->`, iceState);

      if (iceState === 'connected' || iceState === 'completed') {
        setConnectionState('connected');
        clearTimeoutTimer();
      } else if (iceState === 'disconnected') {
        setConnectionState('disconnected');
      } else if (iceState === 'failed') {
        console.error(`[WebRTC (${role})] [oniceconnectionstatechange] FAILED. Direct NAT connection failed.`);
        setConnectionState('failed');
        clearTimeoutTimer();
      }
    };

    pc.onsignalingstatechange = () => {
      console.log(`[WebRTC (${role})] [onsignalingstatechange] ->`, pc.signalingState);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[WebRTC (${role})] [onconnectionstatechange] ->`, state);

      if (state === 'connected') {
        setConnectionState('connected');
        clearTimeoutTimer();
      } else if (state === 'connecting') {
        setConnectionState('connecting');
      } else if (state === 'disconnected') {
        setConnectionState('disconnected');
      } else if (state === 'failed' || state === 'closed') {
        setConnectionState('failed');
        clearTimeoutTimer();
      }
    };

    return pc;
  }, [role, onSendSignal, startTimeoutTimer, cleanupPeer]);

  // Initiate connection when Host sees Partner online
  useEffect(() => {
    if (!role || !isPartnerOnline) {
      if (!isPartnerOnline) cleanupPeer();
      return;
    }

    if (isInitiator && (!pcRef.current || pcRef.current.connectionState === 'closed')) {
      console.log(`[WebRTC (host)] Partner online detected. Initiating WebRTC OFFER...`);
      const pc = createPeerConnection();

      pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: false })
        .then(async (offer) => {
          console.log(`[WebRTC (host)] Local offer created. Setting localDescription...`);
          await pc.setLocalDescription(offer);
          console.log(`[WebRTC (host)] Sending OFFER signal to partner...`);
          onSendSignal({
            type: 'OFFER',
            data: offer,
            senderRole: role,
          });
        })
        .catch((err) => {
          console.error('[WebRTC (host)] Error creating offer:', err);
          setConnectionState('failed');
        });
    }
  }, [role, isPartnerOnline, isInitiator, createPeerConnection, onSendSignal, cleanupPeer]);

  // Process incoming signal messages (OFFER, ANSWER, CANDIDATE)
  const handleIncomingSignal = useCallback(
    async (signal: WebRTCSignal) => {
      if (!signal || signal.senderRole === role) return;

      console.log(`[WebRTC (${role})] [handleIncomingSignal] Received:`, signal.type, 'from:', signal.senderRole);

      try {
        let pc = pcRef.current;

        if (signal.type === 'OFFER') {
          console.log(`[WebRTC (guest)] Received OFFER. Creating peer connection & setting remoteDescription...`);
          if (!pc) pc = createPeerConnection();

          await pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
          console.log(`[WebRTC (guest)] setRemoteDescription(OFFER) SUCCESS.`);

          // Flush queued candidates
          while (pendingCandidates.current.length > 0) {
            const cand = pendingCandidates.current.shift();
            if (cand) {
              console.log(`[WebRTC (guest)] Adding queued ICE candidate.`);
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log(`[WebRTC (guest)] Created & set local ANSWER. Sending to host...`);

          if (role) {
            onSendSignal({
              type: 'ANSWER',
              data: answer,
              senderRole: role,
            });
          }
        } else if (signal.type === 'ANSWER') {
          console.log(`[WebRTC (host)] Received ANSWER. Setting remoteDescription...`);
          if (pc && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
            console.log(`[WebRTC (host)] setRemoteDescription(ANSWER) SUCCESS.`);

            while (pendingCandidates.current.length > 0) {
              const cand = pendingCandidates.current.shift();
              if (cand) {
                console.log(`[WebRTC (host)] Adding queued ICE candidate.`);
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              }
            }
          }
        } else if (signal.type === 'CANDIDATE') {
          const candidateData = signal.data as RTCIceCandidateInit;
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            console.log(`[WebRTC (${role})] Adding ICE candidate directly.`);
            await pc.addIceCandidate(new RTCIceCandidate(candidateData));
          } else {
            console.log(`[WebRTC (${role})] Queuing ICE candidate (remoteDescription not set yet).`);
            pendingCandidates.current.push(candidateData);
          }
        }
      } catch (err) {
        console.error(`[WebRTC (${role})] Error handling signal:`, err);
      }
    },
    [role, createPeerConnection, onSendSignal]
  );

  const restartConnection = useCallback(() => {
    console.log(`[WebRTC (${role})] Restarting connection manually...`);
    cleanupPeer();
    if (isInitiator && isPartnerOnline) {
      const pc = createPeerConnection();
      pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: false })
        .then(async (offer) => {
          await pc.setLocalDescription(offer);
          onSendSignal({
            type: 'OFFER',
            data: offer,
            senderRole: role!,
          });
        })
        .catch((err) => {
          console.error('[WebRTC (host)] Restart offer error:', err);
        });
    } else {
      createPeerConnection();
    }
  }, [role, isInitiator, isPartnerOnline, cleanupPeer, createPeerConnection, onSendSignal]);

  return {
    remoteStream,
    connectionState,
    handleIncomingSignal,
    restartConnection,
  };
}
