import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, Heart, Wifi, WifiOff,
  CheckCircle2, Sparkles, Check, X
} from 'lucide-react';
import { nanoid } from 'nanoid';
import type { FilterType, Sticker } from '../types';
import { useCamera } from '../hooks/useCamera';
import { usePhotoCapture } from '../hooks/usePhotoCapture';
import { useLDRBooth } from '../hooks/useLDRBooth';
import CameraView from '../components/Camera/CameraView';
import CaptureButton from '../components/Camera/CaptureButton';
import CountdownTimer from '../components/UI/CountdownTimer';
import FilterSelector from '../components/Setup/FilterSelector';
import StickerPicker from '../components/UI/StickerPicker';
import PhotoStrip from '../components/PhotoStrip/PhotoStrip';
import QRCodeCard from '../components/QR/QRCodeCard';
import { saveMemory } from '../lib/memory';

const MAX_PHOTOS = 4;

type LDRLayoutType = 'side-by-side' | 'polaroid' | 'photo-strip' | 'heart-split' | 'collage';

const LAYOUT_OPTIONS: { id: LDRLayoutType; label: string; icon: string }[] = [
  { id: 'side-by-side', label: 'Side-by-side', icon: '👥' },
  { id: 'photo-strip',  label: 'Photo Strip',  icon: '🎞️' },
  { id: 'polaroid',     label: 'Polaroid',     icon: '📷' },
  { id: 'heart-split',  label: 'Heart Split',  icon: '💕' },
  { id: 'collage',      label: 'Collage',      icon: '🎨' },
];

interface LocationState {
  session?: { code: string; hostName: string; guestName?: string };
  role?: 'host' | 'guest';
  userName?: string;
}

export default function LDRBoothPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const userName = state?.userName ?? 'You';
  const role = state?.role ?? 'host';

  const camera = useCamera();
  const {
    photos,
    isCountingDown,
    countdown,
    isFlashing,
    capturePhoto,
    clearPhotos,
    canCapture,
  } = usePhotoCapture();

  const {
    session,
    joinBooth,
    broadcastEvent,
    sendReadyState,
    sendCountdownStart,
    sendRetakeRequest,
    respondRetake,
    clearRetakeStates,
    addPhoto,
    isPartnerOnline,
    isPartnerReady,
    remoteCountdown,
    partnerFlashing,
    retakeRequest,
    retakeResponse,
    clearSessionPhotos,
    leaveBooth,
  } = useLDRBooth();

  const [filter, setFilter] = useState<FilterType>('original');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [activeTab, setActiveTab] = useState<'filters' | 'stickers' | 'layout'>('filters');
  const [isMyReady, setIsMyReady] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<LDRLayoutType>('side-by-side');
  const [retakeNotification, setRetakeNotification] = useState<string | null>(null);

  // QR Code & Memory URL state
  const [memoryUrl, setMemoryUrl] = useState<string>('');
  const [isGeneratingMemory, setIsGeneratingMemory] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Reconnect if refreshed
  useEffect(() => {
    if (!session && code) {
      if (role === 'guest') {
        joinBooth(code, userName);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for remote countdown triggers
  const isExecutingRef = useRef(false);
  useEffect(() => {
    if (remoteCountdown !== null && !isExecutingRef.current) {
      handleTriggerCapture();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteCountdown]);

  // Listen for retake responses
  useEffect(() => {
    if (retakeResponse) {
      if (retakeResponse.accepted) {
        setRetakeNotification(`Partner accepted retake for Photo #${retakeResponse.position}! 🎉`);
        clearSessionPhotos();
      } else {
        setRetakeNotification(`Partner chose to keep Photo #${retakeResponse.position}. ♡`);
      }
      const t = setTimeout(() => {
        setRetakeNotification(null);
        clearRetakeStates();
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [retakeResponse, clearSessionPhotos, clearRetakeStates]);

  const handleToggleReady = () => {
    const next = !isMyReady;
    setIsMyReady(next);
    sendReadyState(next);

    if (next && isPartnerReady) {
      sendCountdownStart(3);
      handleTriggerCapture();
    }
  };

  const handleTriggerCapture = useCallback(async () => {
    if (!camera.videoRef.current || isExecutingRef.current) return;
    isExecutingRef.current = true;

    const photo = await capturePhoto(camera.videoRef.current, filter, stickers, userName);
    if (photo) {
      addPhoto(photo);
      broadcastEvent({ type: 'PHOTO_TAKEN', payload: { photo } });
      broadcastEvent({ type: 'FLASH' });
    }

    setIsMyReady(false);
    sendReadyState(false);
    isExecutingRef.current = false;
  }, [camera.videoRef, capturePhoto, filter, stickers, userName, addPhoto, broadcastEvent, sendReadyState]);

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

  const activePhotos = session?.photos && session.photos.length > 0 ? session.photos : photos;
  const isStripComplete = activePhotos.length >= MAX_PHOTOS;
  const partnerName =
    role === 'host'
      ? session?.guestName ?? 'Partner'
      : session?.hostName ?? 'Partner';

  const handleClearAll = () => {
    clearPhotos();
    clearSessionPhotos();
    setMemoryUrl('');
    setShowQRModal(false);
  };

  const handleRequestRetake = (photoNumber: number) => {
    sendRetakeRequest(userName, photoNumber);
    setRetakeNotification(`Retake requested for Photo #${photoNumber}. Waiting for ${partnerName}…`);
  };

  const handleGenerateQRMemory = async () => {
    if (activePhotos.length === 0 || isGeneratingMemory) return;
    setIsGeneratingMemory(true);
    try {
      const stripDataUrl = activePhotos[activePhotos.length - 1].dataUrl;
      const { url } = await saveMemory(stripDataUrl, {
        caption: `LDR Memory with ${partnerName} ♡`,
        frame: selectedLayout,
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

          {activePhotos.length > 0 && (
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
                  {isCountingDown && (
                    <div className="absolute inset-0 z-50 rounded-2xl">
                      <CountdownTimer count={countdown} isVisible={isCountingDown} />
                    </div>
                  )}
                </div>
              </div>

              {/* PARTNER'S CAMERA */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-purple-500 uppercase tracking-wider">
                    💕 {partnerName}
                  </span>
                  {isPartnerReady ? (
                    <span className="badge badge-mint text-[10px] py-0.5">Ready ♡</span>
                  ) : (
                    <span className="badge badge-pink text-[10px] py-0.5">Not Ready</span>
                  )}
                </div>

                <div
                  className="relative camera-frame flex flex-col items-center justify-center text-center p-4 bg-white/70 backdrop-blur-md"
                  style={{ aspectRatio: '3/4' }}
                >
                  {partnerFlashing && (
                    <div className="absolute inset-0 bg-white z-30 animate-pulse" />
                  )}

                  {isPartnerOnline ? (
                    <div className="flex flex-col items-center gap-3">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-300 to-purple-300 flex items-center justify-center text-3xl shadow-md border-2 border-white"
                      >
                        🌸
                      </motion.div>
                      <div>
                        <p className="font-display text-base text-purple-600">
                          {isPartnerReady ? '♡ Partner is ready!' : 'Waiting for partner…'}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {isPartnerReady ? 'Press Ready to countdown!' : 'Will snap together ✨'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400 p-3">
                      <span className="text-3xl">💌</span>
                      <p className="text-xs font-medium text-purple-400">
                        Waiting for {partnerName} to join with code:
                      </p>
                      <span className="font-display text-lg text-pink-500 tracking-wider">
                        {code}
                      </span>
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
                  disabled={!camera.isReady || isStripComplete}
                  className={`btn-snappy py-2 px-5 text-sm ${
                    isMyReady ? 'btn-snappy-mint' : ''
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isMyReady ? '✓ You are Ready!' : "I'm Ready ♡"}
                </motion.button>

                <span className="text-xs text-gray-500">
                  {isPartnerReady ? '🌸 Partner is ready to shoot!' : 'Waiting for both to be ready.'}
                </span>
              </div>

              <CaptureButton
                onClick={handleTriggerCapture}
                disabled={!canCapture || !camera.isReady || isStripComplete}
                photosLeft={Math.max(0, MAX_PHOTOS - activePhotos.length)}
              />
            </div>

            {/* Customization Tabs */}
            <div className="card p-4">
              <div className="flex rounded-xl overflow-hidden mb-3 bg-pink-100/60 p-0.5">
                {(['filters', 'stickers', 'layout'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                      activeTab === tab
                        ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {tab === 'filters' ? '🎨 Filters' : tab === 'stickers' ? '✨ Stickers' : '📐 Layout'}
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
                {activeTab === 'layout' && (
                  <motion.div key="layout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2">
                    {LAYOUT_OPTIONS.map((lo) => (
                      <button
                        key={lo.id}
                        onClick={() => setSelectedLayout(lo.id)}
                        className={`pill-option text-xs py-1.5 px-3 flex items-center gap-1.5 ${
                          selectedLayout === lo.id ? 'active' : ''
                        }`}
                      >
                        <span>{lo.icon}</span>
                        <span>{lo.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Shared Photostrip & QR Section */}
          <div className="lg:w-60 w-full flex flex-col items-center gap-4">
            <div className="card-white p-4 w-full flex flex-col items-center">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-pink-400 fill-pink-200" />
                <span className="text-sm font-semibold text-gray-700">Our Shared Strip</span>
                <span className="badge badge-lavender text-xs">{activePhotos.length}/4</span>
              </div>

              <PhotoStrip
                photos={activePhotos}
                userName={`${userName} & ${partnerName}`}
                showDownload={isStripComplete}
              />

              {activePhotos.length > 0 && !isStripComplete && (
                <div className="w-full mt-3 pt-2 border-t border-pink-100 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">
                    Request Retake
                  </span>
                  <div className="flex gap-1 justify-center">
                    {activePhotos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => handleRequestRetake(i + 1)}
                        className="btn-outline text-[10px] py-1 px-2"
                        title={`Request retake for Photo #${i + 1}`}
                      >
                        #{i + 1}
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
