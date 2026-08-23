import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, Heart, Wifi, WifiOff,
  CheckCircle2, Sparkles, Check, X, Video, VideoOff
} from 'lucide-react';
import type { FilterType, Sticker, CapturedPhoto } from '../types';
import { useCamera } from '../hooks/useCamera';
import { useLDRBooth } from '../hooks/useLDRBooth';
import { useWebRTC } from '../hooks/useWebRTC';
import CameraView from '../components/Camera/CameraView';
import CaptureButton from '../components/Camera/CaptureButton';
import CountdownTimer from '../components/UI/CountdownTimer';
import FilterSelector from '../components/Setup/FilterSelector';
import StickerPicker from '../components/UI/StickerPicker';
import PhotoStrip from '../components/PhotoStrip/PhotoStrip';
import QRCodeCard from '../components/QR/QRCodeCard';
import { saveMemory } from '../lib/memory';
import { captureFrame } from '../lib/camera';
import { nanoid } from 'nanoid';

const MAX_PHOTOS = 4;

interface LocationState {
  session?: { code: string; hostName: string; guestName?: string };
  role?: 'host' | 'guest';
  userName?: string;
}

export default function LDRBoothPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const [userName, setUserName] = useState(state?.userName || '');
  const [nameEntered, setNameEntered] = useState(!!state?.userName);
  const role = state?.role ?? (state?.userName ? 'host' : 'guest');

  const camera = useCamera();
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const {
    session,
    connectToBooth,
    sendWebRTCSignal,
    incomingWebRTCSignal,
    sendReadyState,
    sendSyncCountdown,
    clearSyncCountdown,
    syncCountdown,
    sendJointPhoto,
    jointCaptures,
    sendRetakeRequest,
    respondRetake,
    clearRetakeStates,
    isPartnerOnline,
    isPartnerReady,
    partnerFlashing,
    retakeRequest,
    retakeResponse,
    clearSessionPhotos,
    leaveBooth,
  } = useLDRBooth();

  // WebRTC Peer Connection
  const {
    remoteStream,
    connectionState: webrtcState,
    handleIncomingSignal,
  } = useWebRTC({
    localStream: camera.stream,
    role,
    isPartnerOnline,
    onSendSignal: sendWebRTCSignal,
  });

  // Attach remote stream to partner video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Forward incoming WebRTC signals
  useEffect(() => {
    if (incomingWebRTCSignal) {
      handleIncomingSignal(incomingWebRTCSignal);
    }
  }, [incomingWebRTCSignal, handleIncomingSignal]);

  const [filter, setFilter] = useState<FilterType>('original');
  const [, setStickers] = useState<Sticker[]>([]);
  const [activeTab, setActiveTab] = useState<'filters' | 'stickers'>('filters');
  const [isMyReady, setIsMyReady] = useState(false);
  const [localCountdown, setLocalCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [retakeNotification, setRetakeNotification] = useState<string | null>(null);

  // QR Code & Memory URL state
  const [memoryUrl, setMemoryUrl] = useState<string>('');
  const [isGeneratingMemory, setIsGeneratingMemory] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Connect to the Supabase Realtime channel on mount
  useEffect(() => {
    if (code) {
      connectToBooth(code, role, userName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, role, userName]);

  // Compute completed joint photo slots
  const completedSlots = jointCaptures.filter((s) => s.compositePhoto !== null);
  const nextSlotNumber = Math.min(MAX_PHOTOS, jointCaptures.findIndex((s) => !s.hostPhoto || !s.guestPhoto) + 1 || 1);
  const isStripComplete = completedSlots.length >= MAX_PHOTOS;

  const partnerName =
    role === 'host'
      ? session?.guestName ?? 'Partner'
      : session?.hostName ?? 'Partner';

  // ── Synchronized Countdown Logic Driven by Target Timestamp ──────────────
  const isSnappingRef = useRef(false);

  useEffect(() => {
    if (!syncCountdown) return;

    const { targetTimestamp, slotNumber } = syncCountdown;
    isSnappingRef.current = false;

    const interval = setInterval(async () => {
      const remainingMs = targetTimestamp - Date.now();
      const remainingSec = Math.ceil(remainingMs / 1000);

      if (remainingSec > 0) {
        setLocalCountdown(remainingSec);
      } else if (!isSnappingRef.current) {
        // EXACT MOMENT OF CAPTURE
        isSnappingRef.current = true;
        setLocalCountdown(null);
        clearSyncCountdown();
        clearInterval(interval);

        // Flash
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 500);

        // Local high-res capture from device's own webcam
        if (camera.videoRef.current) {
          const myDataUrl = captureFrame(camera.videoRef.current, filter, true);
          await sendJointPhoto(slotNumber, myDataUrl, role);
        }

        setIsMyReady(false);
        sendReadyState(false);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [syncCountdown, camera.videoRef, filter, role, sendJointPhoto, clearSyncCountdown, sendReadyState]);

  // Handle Ready Toggle & Trigger Countdown when both ready
  const handleToggleReady = () => {
    const next = !isMyReady;
    setIsMyReady(next);
    sendReadyState(next);

    // If partner is already ready and we click ready -> initiate synchronized countdown for next slot!
    if (next && isPartnerReady && !isStripComplete) {
      sendSyncCountdown(nextSlotNumber, 3);
    }
  };

  // Manual Trigger
  const handleManualTrigger = () => {
    if (isStripComplete) return;
    sendSyncCountdown(nextSlotNumber, 3);
  };

  // Listen for retake responses
  useEffect(() => {
    if (retakeResponse) {
      if (retakeResponse.accepted) {
        setRetakeNotification(`Partner accepted retake for Slot #${retakeResponse.position}! 🎉`);
      } else {
        setRetakeNotification(`Partner chose to keep Slot #${retakeResponse.position}. ♡`);
      }
      const t = setTimeout(() => {
        setRetakeNotification(null);
        clearRetakeStates();
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [retakeResponse, clearRetakeStates]);

  const handleAddSticker = (emoji: string) => {
    const newSticker: Sticker = {
      id: nanoid(),
      type: 'emoji',
      content: emoji,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      scale: 1,
      rotation: (Math.random() - 0.5) * 30,
    };
    setStickers((prev) => [...prev, newSticker]);
  };

  const handleClearAll = () => {
    clearSessionPhotos();
    setMemoryUrl('');
    setShowQRModal(false);
  };

  const handleRequestRetake = (slotNum: number) => {
    sendRetakeRequest(userName, slotNum);
    setRetakeNotification(`Retake requested for Slot #${slotNum}. Waiting for ${partnerName}…`);
  };

  // Generate QR Memory when strip finishes
  const handleGenerateQRMemory = async () => {
    if (completedSlots.length === 0 || isGeneratingMemory) return;
    setIsGeneratingMemory(true);
    try {
      const lastComposite = completedSlots[completedSlots.length - 1].compositePhoto!;
      const { url } = await saveMemory(lastComposite, {
        caption: `LDR Memory with ${partnerName} ♡`,
        frame: 'side-by-side',
        frameColor: '#FFB6C1',
      });
      setMemoryUrl(url);
      setShowQRModal(true);
    } catch (err) {
      console.warn('Memory generation error:', err);
    } finally {
      setIsGeneratingMemory(false);
    }
  };

  // Convert jointCaptures into CapturedPhoto array for PhotoStrip component
  const stripPhotos: CapturedPhoto[] = jointCaptures
    .filter((s) => s.compositePhoto !== null)
    .map((s) => ({
      id: `slot_${s.slotNumber}`,
      dataUrl: s.compositePhoto!,
      filter: 'original',
      takerName: `${userName} & ${partnerName}`,
      position: s.slotNumber,
      timestamp: Date.now(),
    }));

  if (!nameEntered) {
    return (
      <div className="bg-snappy min-h-dvh flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-white p-8 w-full max-w-sm text-center"
        >
          <div className="text-4xl mb-3">💕</div>
          <h2 className="font-display text-2xl text-purple-600 mb-1">Enter LDR Booth</h2>
          <p className="text-xs text-gray-400 mb-4">
            Joining Booth Code: <span className="font-bold text-pink-500">{code}</span>
          </p>
          <input
            type="text"
            placeholder="Your name..."
            className="cute-input mb-3 text-center"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && userName.trim()) setNameEntered(true);
            }}
            autoFocus
          />
          <button
            className="btn-snappy w-full mb-2"
            onClick={() => {
              if (userName.trim()) setNameEntered(true);
            }}
            disabled={!userName.trim()}
          >
            Enter Booth ✨
          </button>
          <button className="btn-ghost w-full" onClick={() => navigate('/ldr')}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-ldr-gradient flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4 pb-2 max-w-5xl mx-auto w-full"
      >
        <button
          className="btn-ghost"
          onClick={() => {
            leaveBooth();
            navigate('/');
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Leave
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-xl text-purple-600">
              💕 LDR Booth
            </span>
            <span className="badge badge-lavender text-xs">
              Code: {code}
            </span>
          </div>
          <span className="text-[11px] text-gray-500 italic">
            "Different places. Same memories."
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Partner status */}
          <AnimatePresence>
            {isPartnerOnline ? (
              <motion.div
                key="online"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 badge badge-mint"
              >
                <motion.div
                  className="w-2 h-2 rounded-full bg-green-500"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <Wifi className="w-3.5 h-3.5" />
                {partnerName} online
              </motion.div>
            ) : (
              <motion.div
                key="offline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1 badge badge-pink"
              >
                <WifiOff className="w-3.5 h-3.5" />
                Waiting for partner…
              </motion.div>
            )}
          </AnimatePresence>

          {completedSlots.length > 0 && (
            <button className="btn-ghost text-xs" onClick={handleClearAll} title="Clear photos">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.header>

      {/* Retake Request Alert Modal */}
      <AnimatePresence>
        {retakeRequest && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <div className="card-white p-6 max-w-sm w-full text-center flex flex-col items-center gap-3">
              <span className="text-4xl">📸</span>
              <h3 className="font-display text-xl text-pink-500">Retake Request</h3>
              <p className="text-sm text-gray-500">
                <span className="font-bold text-gray-700">{retakeRequest.requesterName}</span> wants to retake Photo #{retakeRequest.position}!
              </p>
              <div className="grid grid-cols-2 gap-2 w-full mt-2">
                <button
                  className="btn-snappy justify-center py-2 text-xs"
                  onClick={() => respondRetake(true, retakeRequest.position)}
                >
                  <Check className="w-3.5 h-3.5" /> Accept Retake
                </button>
                <button
                  className="btn-outline justify-center py-2 text-xs"
                  onClick={() => respondRetake(false, retakeRequest.position)}
                >
                  <X className="w-3.5 h-3.5" /> Keep Photo
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      <AnimatePresence>
        {retakeNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 badge badge-pink shadow-lg py-2 px-4 text-xs font-semibold"
          >
            {retakeNotification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Booth Content */}
      <div className="container-snappy py-4 flex-1 flex flex-col justify-center">
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center max-w-5xl mx-auto w-full">

          {/* Left: Dual Camera Experience */}
          <div className="flex-1 w-full max-w-xl flex flex-col gap-4">

            {/* Dual Camera Layout */}
            <div className="grid grid-cols-2 gap-3">

              {/* YOUR CAMERA */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-pink-500 uppercase tracking-wider">
                    📷 You ({userName})
                  </span>
                  {isMyReady ? (
                    <span className="badge badge-mint text-[10px] py-0.5">Ready ♡</span>
                  ) : (
                    <span className="badge badge-pink text-[10px] py-0.5">Not Ready</span>
                  )}
                </div>

                <div className="relative camera-frame" style={{ aspectRatio: '3/4' }}>
                  <CameraView
                    camera={camera}
                    filter={filter}
                    isFlashing={isFlashing}
                    className="w-full h-full object-cover"
                  />
                  {localCountdown !== null && (
                    <div className="absolute inset-0 z-50 rounded-2xl">
                      <CountdownTimer count={localCountdown} isVisible={localCountdown !== null} />
                    </div>
                  )}
                </div>
              </div>

              {/* PARTNER'S CAMERA (WebRTC Live Stream) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-purple-500 uppercase tracking-wider flex items-center gap-1">
                    💕 {partnerName}
                    {webrtcState === 'connected' ? (
                      <Video className="w-3 h-3 text-green-500" />
                    ) : (
                      <VideoOff className="w-3 h-3 text-gray-400" />
                    )}
                  </span>
                  {isPartnerReady ? (
                    <span className="badge badge-mint text-[10px] py-0.5">Ready ♡</span>
                  ) : (
                    <span className="badge badge-pink text-[10px] py-0.5">
                      {webrtcState === 'connecting' ? 'Connecting…' : 'Not Ready'}
                    </span>
                  )}
                </div>

                <div
                  className="relative camera-frame flex flex-col items-center justify-center text-center p-0 bg-black/90 overflow-hidden"
                  style={{ aspectRatio: '3/4' }}
                >
                  {partnerFlashing && (
                    <div className="absolute inset-0 bg-white z-30 animate-pulse" />
                  )}

                  {/* WebRTC Live Video Stream */}
                  {remoteStream && webrtcState === 'connected' ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                  ) : isPartnerOnline ? (
                    /* Fallback Avatar when WebRTC is connecting */
                    <div className="flex flex-col items-center gap-3 p-4 text-white">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-300 to-purple-300 flex items-center justify-center text-3xl shadow-md border-2 border-white"
                      >
                        🌸
                      </motion.div>
                      <div>
                        <p className="font-display text-base text-pink-300">
                          {isPartnerReady ? '♡ Partner is ready!' : 'Connecting video feed…'}
                        </p>
                        <p className="text-[11px] text-gray-300 mt-0.5">
                          {isPartnerReady ? 'Press Ready to countdown!' : 'Real-time sync active ✨'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Offline State */
                    <div className="flex flex-col items-center gap-2 text-gray-400 p-4">
                      <span className="text-3xl">💌</span>
                      <p className="text-xs font-medium text-purple-300">
                        Waiting for {partnerName} to join:
                      </p>
                      <span className="font-display text-lg text-pink-400 tracking-wider">
                        {code}
                      </span>
                    </div>
                  )}

                  {localCountdown !== null && (
                    <div className="absolute inset-0 z-50 rounded-2xl">
                      <CountdownTimer count={localCountdown} isVisible={localCountdown !== null} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Synchronized Ready Bar */}
            <div className="card p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleToggleReady}
                  disabled={!camera.isReady || isStripComplete || localCountdown !== null}
                  className={`btn-snappy py-2 px-5 text-sm ${
                    isMyReady ? 'btn-snappy-mint' : ''
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isMyReady ? '✓ You are Ready!' : "I'm Ready ♡"}
                </motion.button>

                <span className="text-xs text-gray-500">
                  {isPartnerReady ? '🌸 Partner is ready! Click ready to snap.' : 'Click Ready when you are posed.'}
                </span>
              </div>

              <CaptureButton
                onClick={handleManualTrigger}
                disabled={!camera.isReady || isStripComplete || localCountdown !== null}
                photosLeft={Math.max(0, MAX_PHOTOS - completedSlots.length)}
              />
            </div>

            {/* Customization Tabs */}
            <div className="card p-4">
              <div className="flex rounded-xl overflow-hidden mb-3 bg-pink-100/60 p-0.5">
                {(['filters', 'stickers'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                      activeTab === tab
                        ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {tab === 'filters' ? '🎨 Filters' : '✨ Stickers'}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'filters' && (
                  <motion.div key="filters" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <FilterSelector selected={filter} onChange={setFilter} />
                  </motion.div>
                )}
                {activeTab === 'stickers' && (
                  <motion.div key="stickers" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <StickerPicker onStickerAdd={handleAddSticker} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Shared Photostrip & QR Section */}
          <div className="lg:w-64 w-full flex flex-col items-center gap-4">
            <div className="card-white p-4 w-full flex flex-col items-center">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-pink-400 fill-pink-200" />
                <span className="text-sm font-semibold text-gray-700">Side-by-Side Strip</span>
                <span className="badge badge-lavender text-xs">{completedSlots.length}/4</span>
              </div>

              {/* Side-by-Side Dual Composite Strip Preview */}
              <PhotoStrip
                photos={stripPhotos}
                userName={`${userName} & ${partnerName}`}
                showDownload={isStripComplete}
              />

              {/* Retake buttons for captured slots */}
              {completedSlots.length > 0 && !isStripComplete && (
                <div className="w-full mt-3 pt-2 border-t border-pink-100 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">
                    Request Retake
                  </span>
                  <div className="flex gap-1 justify-center">
                    {completedSlots.map((s) => (
                      <button
                        key={s.slotNumber}
                        onClick={() => handleRequestRetake(s.slotNumber)}
                        className="btn-outline text-[10px] py-1 px-2"
                        title={`Request retake for Slot #${s.slotNumber}`}
                      >
                        Slot #{s.slotNumber}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isStripComplete && (
                <div className="w-full mt-3 flex flex-col gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleGenerateQRMemory}
                    disabled={isGeneratingMemory}
                    className="btn-snappy w-full py-2 text-xs justify-center"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isGeneratingMemory ? 'Uploading…' : 'Generate QR Code ✨'}
                  </motion.button>
                </div>
              )}
            </div>

            {showQRModal && memoryUrl && (
              <div className="w-full">
                <QRCodeCard
                  memoryUrl={memoryUrl}
                  onOpenMemory={() => {
                    const id = memoryUrl.split('/').pop();
                    if (id) navigate(`/memory/${id}`);
                  }}
                />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
