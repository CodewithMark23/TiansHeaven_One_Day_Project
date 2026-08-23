import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Check, Zap } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { FilterType, Sticker } from '../types';
import { useCamera } from '../hooks/useCamera';
import { usePhotoCapture } from '../hooks/usePhotoCapture';
import CameraView from '../components/Camera/CameraView';
import CaptureButton from '../components/Camera/CaptureButton';
import CountdownTimer from '../components/UI/CountdownTimer';
import FilterSelector from '../components/UI/FilterSelector';
import StickerPicker from '../components/UI/StickerPicker';
import PhotoStrip from '../components/PhotoStrip/PhotoStrip';

const MAX_PHOTOS = 4;

export default function SoloBoothPage() {
  const navigate = useNavigate();
  const camera = useCamera();
  const { photos, isCountingDown, countdown, isFlashing, capturePhoto, clearPhotos, canCapture } =
    usePhotoCapture();

  const [filter, setFilter] = useState<FilterType>('none');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [userName, setUserName] = useState('');
  const [nameSet, setNameSet] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'stickers'>('filters');
  const videoElRef = camera.videoRef;

  const handleCapture = useCallback(async () => {
    if (!videoElRef.current || !canCapture) return;
    await capturePhoto(videoElRef.current, filter, stickers, userName || 'Solo');
  }, [videoElRef, canCapture, capturePhoto, filter, stickers, userName]);

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

  // Name entry screen
  if (!nameSet) {
    return (
      <div className="min-h-dvh bg-booth-gradient flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 w-full max-w-md text-center"
        >
          <div className="text-4xl mb-4">📷</div>
          <h1 className="font-display text-3xl mb-2" style={{ color: '#d4607c' }}>
            Solo Booth
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            What should we call you? 🌸
          </p>
          <input
            type="text"
            placeholder="Your name..."
            className="cute-input mb-4 text-center"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && userName.trim()) setNameSet(true);
            }}
            autoFocus
            maxLength={20}
            id="input-user-name"
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-primary w-full"
            onClick={() => setNameSet(true)}
            disabled={!userName.trim()}
            id="btn-enter-booth"
          >
            Enter Booth ✨
          </motion.button>
          <button
            className="btn-ghost mt-3 w-full"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-booth-gradient">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4 pb-0"
      >
        <button className="btn-ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <span className="font-display text-lg" style={{ color: '#d4607c' }}>
            Solo Booth
          </span>
          <span className="badge badge-pink">📷 {userName}</span>
        </div>
        {photos.length > 0 && (
          <button className="btn-ghost text-xs" onClick={clearPhotos}>
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </motion.header>

      <div className="container-booth py-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start justify-center">
          {/* Left: Camera + controls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 max-w-lg w-full"
          >
            {/* Camera */}
            <div className="relative" style={{ aspectRatio: '3/4' }}>
              <CameraView
                camera={camera}
                filter={filter}
                isFlashing={isFlashing}
                className="absolute inset-0 booth-frame"
              />

              {/* Countdown overlay */}
              {isCountingDown && (
                <div className="absolute inset-0 z-50" style={{ borderRadius: '2rem' }}>
                  <CountdownTimer count={countdown} isVisible={isCountingDown} />
                </div>
              )}

              {/* Strip complete banner */}
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
                      <Check className="w-4 h-4" />
                      Strip complete! Download below 🎉
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Controls bar */}
            <div className="glass-card mt-4 p-4">
              {/* Tab switcher */}
              <div className="flex rounded-xl overflow-hidden mb-3" style={{ background: 'rgba(201,177,255,0.15)' }}>
                {(['filters', 'stickers'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 py-2 text-xs font-semibold capitalize transition-all duration-200 rounded-xl"
                    style={{
                      background: activeTab === tab ? 'linear-gradient(135deg,#ff8fab,#c9b1ff)' : 'transparent',
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

            {/* Capture button */}
            <div className="flex justify-center mt-5">
              <CaptureButton
                onClick={handleCapture}
                disabled={!canCapture || !camera.isReady}
                photosLeft={MAX_PHOTOS - photos.length}
              />
            </div>
          </motion.div>

          {/* Right: Photo strip */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-52 w-full flex flex-col items-center"
          >
            <div className="glass-card p-4 w-full flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-pink-400" />
                <span className="text-sm font-semibold text-gray-600">Your Strip</span>
                <span className="badge badge-pink text-xs">{photos.length}/4</span>
              </div>
              <PhotoStrip
                photos={photos}
                userName={userName}
                showDownload={isStripComplete}
              />
              {!isStripComplete && photos.length === 0 && (
                <p className="text-xs text-gray-400 text-center mt-3">
                  Take 4 photos to complete your strip! ✨
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
