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
    { urls: 'stun:stun3.l.google.com:19302' },
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
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const isInitiator = role === 'host';

  useEffect(() => {
    localStreamRef.current = localStream;
    // If we have an active pc and new tracks arrived, add them
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

    console.log(`[WebRTC (${role})] Creating RTCPeerConnection...`);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    setConnectionState('connecting');

    // Add local tracks if stream is available
    const activeStream = localStreamRef.current;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        console.log(`[WebRTC (${role})] Adding track to PC:`, track.kind, track.id);
        pc.addTrack(track, activeStream);
      });
    } else {
      console.warn(`[WebRTC (${role})] localStream not ready yet when creating PC`);
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log(`[WebRTC (${role})] ontrack event fired!`, event.track.kind, event.streams);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const stream = new MediaStream([event.track]);
        setRemoteStream(stream);
      }
      setConnectionState('connected');
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && role) {
        console.log(`[WebRTC (${role})] Found ICE Candidate:`, event.candidate.candidate);
        onSendSignal({
          type: 'CANDIDATE',
          data: event.candidate.toJSON(),
          senderRole: role,
        });
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC (${role})] ICE Gathering State:`, pc.iceGatheringState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC (${role})] ICE Connection State:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionState('connected');
      } else if (pc.iceConnectionState === 'disconnected') {
        setConnectionState('disconnected');
      } else if (pc.iceConnectionState === 'failed') {
        setConnectionState('failed');
      }
    };

    pc.onsignalingstatechange = () => {
      console.log(`[WebRTC (${role})] Signaling State:`, pc.signalingState);
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC (${role})] Connection State:`, pc.connectionState);
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
  }, [role, onSendSignal, cleanupPeer]);

  // Initiate connection when Host sees Partner online and localStream is ready
  useEffect(() => {
    if (!role || !isPartnerOnline) {
      if (!isPartnerOnline) cleanupPeer();
      return;
    }

    if (isInitiator && (!pcRef.current || pcRef.current.connectionState === 'closed')) {
      console.log(`[WebRTC (host)] Partner is online! Initiating offer...`);
      const pc = createPeerConnection();

      pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: false })
        .then(async (offer) => {
          console.log(`[WebRTC (host)] Setting localDescription & sending OFFER...`);
          await pc.setLocalDescription(offer);
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

  // Process incoming signals
  const handleIncomingSignal = useCallback(
    async (signal: WebRTCSignal) => {
      if (!signal || signal.senderRole === role) return;

      console.log(`[WebRTC (${role})] Received signal:`, signal.type);

      try {
        let pc = pcRef.current;

        if (signal.type === 'OFFER') {
          console.log(`[WebRTC (guest)] Handling OFFER...`);
          if (!pc) pc = createPeerConnection();

          await pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
          console.log(`[WebRTC (guest)] setRemoteDescription (OFFER) done.`);

          // Flush pending candidates
          while (pendingCandidates.current.length > 0) {
            const cand = pendingCandidates.current.shift();
            if (cand) {
              console.log(`[WebRTC (guest)] Flushing queued ICE candidate...`);
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log(`[WebRTC (guest)] Created & set local ANSWER, sending to host...`);

          if (role) {
            onSendSignal({
              type: 'ANSWER',
              data: answer,
              senderRole: role,
            });
          }
        } else if (signal.type === 'ANSWER') {
          console.log(`[WebRTC (host)] Handling ANSWER...`);
          if (pc && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
            console.log(`[WebRTC (host)] setRemoteDescription (ANSWER) done.`);

            while (pendingCandidates.current.length > 0) {
              const cand = pendingCandidates.current.shift();
              if (cand) {
                console.log(`[WebRTC (host)] Flushing queued ICE candidate...`);
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              }
            }
          }
        } else if (signal.type === 'CANDIDATE') {
          const candidateData = signal.data as RTCIceCandidateInit;
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            console.log(`[WebRTC (${role})] Adding ICE candidate immediately.`);
            await pc.addIceCandidate(new RTCIceCandidate(candidateData));
          } else {
            console.log(`[WebRTC (${role})] Queueing ICE candidate (remoteDescription not set yet).`);
            pendingCandidates.current.push(candidateData);
          }
        }
      } catch (err) {
        console.error(`[WebRTC (${role})] Error processing signal:`, err);
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
