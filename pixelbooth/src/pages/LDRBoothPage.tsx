import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Heart, Wifi, WifiOff } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { FilterType, Sticker } from '../types';
import { useCamera } from '../hooks/useCamera';
import { usePhotoCapture } from '../hooks/usePhotoCapture';
import { useLDRBooth } from '../hooks/useLDRBooth';
import CameraView from '../components/Camera/CameraView';
import CaptureButton from '../components/Camera/CaptureButton';
import CountdownTimer from '../components/UI/CountdownTimer';
import FilterSelector from '../components/UI/FilterSelector';
import StickerPicker from '../components/UI/StickerPicker';
import PhotoStrip from '../components/PhotoStrip/PhotoStrip';

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
  const { session, joinBooth, broadcastEvent, addPhoto, isPartnerOnline, leaveBooth } =
    useLDRBooth();

  const [filter, setFilter] = useState<FilterType>('none');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [activeTab, setActiveTab] = useState<'filters' | 'stickers'>('filters');
  const [partnerFlashing] = useState(false);

  // Reconnect if refreshed
  useEffect(() => {
    if (!session && code) {
      if (role === 'guest') {
        joinBooth(code, userName);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = useCallback(async () => {
    if (!camera.videoRef.current || !canCapture) return;
    const photo = await capturePhoto(camera.videoRef.current, filter, stickers, userName);
    if (photo) {
      addPhoto(photo);
      broadcastEvent({ type: 'PHOTO_TAKEN', payload: { photo } });

      // Trigger partner flash effect via broadcast
      broadcastEvent({ type: 'FLASH' });
    }
  }, [camera.videoRef, canCapture, capturePhoto, filter, stickers, userName, addPhoto, broadcastEvent]);

  const handleAddSticker = (emoji: string) => {
    const newSticker: Sticker = {
      id: nanoid(),
      emoji,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      scale: 1,
      rotation: (Math.random() - 0.5) * 30,
    };
    setStickers((prev) => [...prev, newSticker]);
  };

  const isStripComplete = photos.length >= MAX_PHOTOS;
  const partnerName =
    role === 'host'
      ? session?.guestName ?? 'Partner'
      : session?.hostName ?? 'Partner';

  return (
    <div className="min-h-dvh bg-ldr-gradient">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4 pb-0"
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

        <div className="flex items-center gap-2">
          <span className="font-display text-lg" style={{ color: '#7c5cbf' }}>
            LDR Booth
          </span>
          <span className="badge badge-lavender">
            {code}
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
                  className="w-1.5 h-1.5 rounded-full bg-green-500"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <Wifi className="w-3 h-3" />
                {partnerName} online
              </motion.div>
            ) : (
              <motion.div
                key="offline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1 badge badge-pink"
              >
                <WifiOff className="w-3 h-3" />
                Waiting…
              </motion.div>
            )}
          </AnimatePresence>

          {photos.length > 0 && (
            <button className="btn-ghost text-xs" onClick={clearPhotos}>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.header>

      <div className="container-booth py-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start justify-center">
          {/* Camera + controls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 max-w-lg w-full"
          >
            {/* Partner awaiting notice */}
            {!isPartnerOnline && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card-lavender mb-3 px-4 py-3 flex items-center gap-2 text-sm"
              >
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  💕
                </motion.span>
                <span className="text-purple-500 font-medium">
                  Waiting for {partnerName} to connect…
                </span>
              </motion.div>
            )}

            {/* Camera */}
            <div className="relative" style={{ aspectRatio: '3/4' }}>
              <CameraView
                camera={camera}
                filter={filter}
                isFlashing={isFlashing || partnerFlashing}
                className="absolute inset-0 booth-frame"
              />

              {/* Countdown */}
              {isCountingDown && (
                <div className="absolute inset-0 z-50" style={{ borderRadius: '2rem' }}>
                  <CountdownTimer count={countdown} isVisible={isCountingDown} />
                </div>
              )}

              {/* YOU badge */}
              <div className="absolute top-3 left-3 z-20">
                <div className="badge badge-pink backdrop-blur-sm">
                  📷 {userName}
                </div>
              </div>

              {/* Strip complete */}
              <AnimatePresence>
                {isStripComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-4 left-4 right-4 z-40"
                  >
                    <div
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg,#ff8fab,#c9b1ff)' }}
                    >
                      <Heart className="w-4 h-4 fill-white" />
                      Strip complete! Download below 🎉
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="glass-card mt-4 p-4">
              <div className="flex rounded-xl overflow-hidden mb-3" style={{ background: 'rgba(201,177,255,0.15)' }}>
                {(['filters', 'stickers'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 py-2 text-xs font-semibold capitalize transition-all duration-200 rounded-xl"
                    style={{
                      background: activeTab === tab ? 'linear-gradient(135deg,#c9b1ff,#aed9e0)' : 'transparent',
                      color: activeTab === tab ? 'white' : '#9b8fb0',
                    }}
                  >
                    {tab === 'filters' ? '🎨 Filters' : '✨ Stickers'}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'filters' ? (
                  <motion.div
                    key="filters"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <FilterSelector selected={filter} onChange={setFilter} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="stickers"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <StickerPicker onStickerAdd={handleAddSticker} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex justify-center mt-5">
              <CaptureButton
                onClick={handleCapture}
                disabled={!canCapture || !camera.isReady}
                photosLeft={MAX_PHOTOS - photos.length}
              />
            </div>
          </motion.div>

          {/* Strip panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-52 w-full flex flex-col items-center"
          >
            <div className="glass-card p-4 w-full flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-4 h-4 text-pink-400 fill-pink-200" />
                <span className="text-sm font-semibold text-gray-600">Our Strip</span>
                <span className="badge badge-lavender text-xs">{photos.length}/4</span>
              </div>
              <PhotoStrip
                photos={photos}
                userName={`${userName} & ${partnerName}`}
                showDownload={isStripComplete}
              />
              {!isStripComplete && photos.length === 0 && (
                <p className="text-xs text-gray-400 text-center mt-3">
                  Take 4 photos together! 💕
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
