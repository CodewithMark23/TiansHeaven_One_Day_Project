import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, Heart, Wifi, WifiOff,
  CheckCircle2, Sparkles, Video, VideoOff, RotateCcw
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
import { createSideBySideComposite } from '../lib/ldrComposite';
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
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const {
    session,
    connectToBooth,
    sendWebRTCSignal,
    incomingWebRTCSignal,
    registerWebRTCSignalListener,
    sendReadyState,
    triggerSyncCountdown,
    clearSyncTrigger,
    syncTrigger,
    recordAndSyncJointPhoto,
    jointCaptures,
    retakeSlot,
    isPartnerOnline,
    isPartnerReady,
    partnerFlashing,
    clearSessionPhotos,
    leaveBooth,
  } = useLDRBooth();

  // WebRTC Peer Connection
  const {
    remoteStream,
    connectionState: webrtcState,
    handleIncomingSignal,
    restartConnection,
  } = useWebRTC({
    localStream: camera.stream,
    role,
    isPartnerOnline,
    onSendSignal: sendWebRTCSignal,
  });

  // Wire direct signal listener
  useEffect(() => {
    registerWebRTCSignalListener(handleIncomingSignal);
    return () => {
      registerWebRTCSignalListener(null);
    };
  }, [registerWebRTCSignalListener, handleIncomingSignal]);

  // Attach remote stream to partner video element
  const attachRemoteStream = (videoEl: HTMLVideoElement | null) => {
    remoteVideoRef.current = videoEl;
    if (videoEl && remoteStream) {
      if (videoEl.srcObject !== remoteStream) {
        console.log('[LDRBoothPage] Attaching remoteStream to video element');
        videoEl.srcObject = remoteStream;
      }
      videoEl.play().catch((err) => console.warn('[LDRBoothPage] Auto-play video warning:', err));
    }
  };

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      attachRemoteStream(remoteVideoRef.current);
    }
  }, [remoteStream, webrtcState]);

  // Fallback for state-based incoming signals
  useEffect(() => {
    if (incomingWebRTCSignal) {
      handleIncomingSignal(incomingWebRTCSignal);
    }
  }, [incomingWebRTCSignal, handleIncomingSignal]);

  const [filter, setFilter] = useState<FilterType>('original');
  const [, setStickers] = useState<Sticker[]>([]);
  const [activeTab, setActiveTab] = useState<'filters' | 'stickers'>('filters');
  const [isMyReady, setIsMyReady] = useState(false);
  const [displayCountdown, setDisplayCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [compositePreviews, setCompositePreviews] = useState<(string | null)[]>([null, null, null, null]);

  // QR Code & Memory URL state
  const [memoryUrl, setMemoryUrl] = useState<string>('');
  const [isGeneratingMemory, setIsGeneratingMemory] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Connect on mount
  useEffect(() => {
    if (code && nameEntered && userName) {
      connectToBooth(code, role, userName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, role, nameEntered, userName]);

  const partnerName =
    role === 'host'
      ? session?.guestName ?? 'Partner'
      : session?.hostName ?? 'Partner';

  // Compute composite previews (including pending half placeholders)
  useEffect(() => {
    const generateAllPreviews = async () => {
      const previews = await Promise.all(
        jointCaptures.map(async (slot) => {
          if (slot.compositePhoto) return slot.compositePhoto;
          if (slot.hostPhoto || slot.guestPhoto) {
            return await createSideBySideComposite(
              slot.hostPhoto,
              slot.guestPhoto,
              session?.hostName || 'Host',
              session?.guestName || 'Partner'
            );
          }
          return null;
        })
      );
      setCompositePreviews(previews);
    };
    generateAllPreviews();
  }, [jointCaptures, session?.hostName, session?.guestName]);

  // Count fully paired slots (both host & guest present)
  const completedCount = jointCaptures.filter((s) => s.hostPhoto && s.guestPhoto).length;
  // First slot that is missing either host or guest photo
  const nextSlotNumber = Math.min(MAX_PHOTOS, jointCaptures.findIndex((s) => !s.hostPhoto || !s.guestPhoto) + 1 || 1);
  const isStripComplete = completedCount >= MAX_PHOTOS;

  // ── Synchronized Countdown Logic (Guaranteed Both Ready) ─────────────────
  const activeTriggerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!syncTrigger) return;
    if (activeTriggerIdRef.current === syncTrigger.triggerId) return;

    activeTriggerIdRef.current = syncTrigger.triggerId;
    const { duration, slotNumber } = syncTrigger;

    console.log(`[LDRBooth] Starting synchronized countdown (${duration}s) for Slot #${slotNumber}...`);
    let current = duration;
    setDisplayCountdown(current);

    const interval = setInterval(async () => {
      current -= 1;
      if (current > 0) {
        setDisplayCountdown(current);
      } else {
        // EXACT MOMENT OF CAPTURE (t=0)
        clearInterval(interval);
        setDisplayCountdown(null);
        clearSyncTrigger();

        // Flash screen
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 500);

        // Local high-res capture from device's own webcam with chosen filter baked in
        if (camera.videoRef.current) {
          console.log(`[LDRBooth] (${role}) Capturing local camera frame with filter: ${filter}...`);
          const myDataUrl = captureFrame(camera.videoRef.current, filter, true);
          await recordAndSyncJointPhoto(slotNumber, myDataUrl, role);
        }

        setIsMyReady(false);
        sendReadyState(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [syncTrigger, camera.videoRef, filter, role, recordAndSyncJointPhoto, clearSyncTrigger, sendReadyState]);

  // ── Ready Gating: Countdown ONLY triggers when BOTH are ready ───────────
  const handleToggleReady = () => {
    if (isStripComplete || displayCountdown !== null) return;
    const next = !isMyReady;
    setIsMyReady(next);
    sendReadyState(next);

    // If partner is ALREADY ready and we just clicked ready -> Trigger synchronized countdown!
    if (next && isPartnerReady && !isStripComplete && displayCountdown === null) {
      console.log(`[LDRBooth] Both partners ready! Triggering sync countdown for Slot #${nextSlotNumber}...`);
      triggerSyncCountdown(nextSlotNumber, 3);
    }
  };

  const handleManualTrigger = () => {
    // If both ready, trigger countdown; otherwise toggle ready
    if (isPartnerReady && isMyReady && !isStripComplete && displayCountdown === null) {
      triggerSyncCountdown(nextSlotNumber, 3);
    } else {
      handleToggleReady();
    }
  };

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
    setIsMyReady(false);
    sendReadyState(false);
    setMemoryUrl('');
    setShowQRModal(false);
  };

  const handleRetakeSlot = async (slotNum: number) => {
    setIsMyReady(false);
    sendReadyState(false);
    await retakeSlot(slotNum);
  };

  // Generate QR Memory when strip finishes
  const handleGenerateQRMemory = async () => {
    const lastComposite = compositePreviews[completedCount - 1];
    if (!lastComposite || isGeneratingMemory) return;
    setIsGeneratingMemory(true);
    try {
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

  // Convert composite previews into CapturedPhoto objects for PhotoStrip
  const stripPhotos: CapturedPhoto[] = compositePreviews
    .filter((url): url is string => url !== null)
    .map((dataUrl, idx) => ({
      id: `slot_${idx + 1}`,
      dataUrl,
      filter: 'original',
      takerName: `${userName} & ${partnerName}`,
      position: idx + 1,
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

          {completedCount > 0 && (
            <button className="btn-ghost text-xs" onClick={handleClearAll} title="Clear all photos">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.header>

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
                  {displayCountdown !== null && (
                    <div className="absolute inset-0 z-50 rounded-2xl">
                      <CountdownTimer count={displayCountdown} isVisible={displayCountdown !== null} />
                    </div>
                  )}
                </div>
              </div>

              {/* PARTNER'S CAMERA (WebRTC Live Stream) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-purple-500 uppercase tracking-wider flex items-center gap-1">
                    💕 {partnerName}
                    {remoteStream && webrtcState === 'connected' ? (
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

                  {/* WebRTC Live Video Element */}
                  <video
                    ref={attachRemoteStream}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    style={{
                      transform: 'scaleX(-1)',
                      display: remoteStream && webrtcState === 'connected' ? 'block' : 'none',
                    }}
                  />

                  {/* Fallback View when WebRTC is not yet connected */}
                  {(!remoteStream || webrtcState !== 'connected') && (
                    isPartnerOnline ? (
                      webrtcState === 'failed' ? (
                        <div className="flex flex-col items-center gap-2 p-4 text-center text-white">
                          <span className="text-3xl">⚠️</span>
                          <p className="font-display text-sm text-pink-300">
                            Connection failed
                          </p>
                          <p className="text-[11px] text-gray-300">
                            Check network or strict firewall
                          </p>
                          <button
                            onClick={restartConnection}
                            className="btn-snappy py-1.5 px-4 text-xs mt-2"
                          >
                            Retry Video 🔄
                          </button>
                        </div>
                      ) : (
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
                              {isPartnerReady ? '♡ Partner is ready!' : 'Connecting video stream…'}
                            </p>
                            <p className="text-[11px] text-gray-300 mt-0.5">
                              {isPartnerReady ? 'Press Ready to countdown!' : 'Syncing with partner ✨'}
                            </p>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400 p-4">
                        <span className="text-3xl">💌</span>
                        <p className="text-xs font-medium text-purple-300">
                          Waiting for {partnerName} to join:
                        </p>
                        <span className="font-display text-lg text-pink-400 tracking-wider">
                          {code}
                        </span>
                      </div>
                    )
                  )}

                  {displayCountdown !== null && (
                    <div className="absolute inset-0 z-50 rounded-2xl">
                      <CountdownTimer count={displayCountdown} isVisible={displayCountdown !== null} />
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
                  disabled={!camera.isReady || isStripComplete || displayCountdown !== null}
                  className={`btn-snappy py-2 px-5 text-sm ${
                    isMyReady ? 'btn-snappy-mint' : ''
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isStripComplete
                    ? 'All 4 photos taken! ♡'
                    : isMyReady
                    ? '✓ You are Ready!'
                    : "I'm Ready ♡"}
                </motion.button>

                <span className="text-xs text-gray-500">
                  {isStripComplete
                    ? 'Complete! View or share your strip on the right ✨'
                    : isPartnerReady && isMyReady
                    ? '🌸 Both ready! Counting down…'
                    : isPartnerReady
                    ? '🌸 Partner is ready! Click ready to snap together.'
                    : 'Click Ready when you are posed.'}
                </span>
              </div>

              <CaptureButton
                onClick={handleManualTrigger}
                disabled={!camera.isReady || isStripComplete || displayCountdown !== null}
                photosLeft={Math.max(0, MAX_PHOTOS - completedCount)}
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
                    {tab === 'filters' ? '🎨 Filters (For You)' : '✨ Stickers'}
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
                <span className="badge badge-lavender text-xs">{completedCount}/4</span>
              </div>

              {/* Side-by-Side Dual Composite Strip Preview */}
              <PhotoStrip
                photos={stripPhotos}
                userName={`${userName} & ${partnerName}`}
                showDownload={isStripComplete}
              />

              {/* Per-Slot Retake Buttons */}
              {jointCaptures.some((s) => s.hostPhoto || s.guestPhoto) && (
                <div className="w-full mt-3 pt-2 border-t border-pink-100 flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">
                    Retake Any Slot
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {jointCaptures.map((s) => {
                      const hasPhoto = s.hostPhoto || s.guestPhoto;
                      return (
                        <button
                          key={s.slotNumber}
                          onClick={() => handleRetakeSlot(s.slotNumber)}
                          disabled={!hasPhoto || displayCountdown !== null}
                          className={`text-[10px] py-1 px-1 rounded-lg border flex items-center justify-center gap-0.5 transition-all ${
                            hasPhoto
                              ? 'border-pink-300 bg-pink-50 text-pink-600 hover:bg-pink-100'
                              : 'border-gray-200 text-gray-300 opacity-50 cursor-not-allowed'
                          }`}
                          title={hasPhoto ? `Retake Slot #${s.slotNumber}` : `Slot #${s.slotNumber} empty`}
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          #{s.slotNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Generate QR Code Button */}
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
