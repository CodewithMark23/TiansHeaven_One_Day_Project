import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlipHorizontal, Camera } from 'lucide-react';
import type { FilterType, CapturedPhoto, CountdownDuration, PhotoCount } from '../../types';
import { stopCamera, captureFrame, getFilterCSS } from '../../lib/camera';
import { nanoid } from 'nanoid';

interface CameraSessionProps {
  filter: FilterType;
  countdown: CountdownDuration;
  photoCount: PhotoCount;
  userName: string;
  onComplete: (photos: CapturedPhoto[]) => void;
  onCancel: () => void;
}

export default function CameraSession({
  filter,
  countdown,
  photoCount,
  userName,
  onComplete,
  onCancel,
}: CameraSessionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isReady, setIsReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0); // 0-based
  const [sessionDone, setSessionDone] = useState(false);
  const captureRef = useRef(false);

  const initCamera = useCallback(async (facing: 'user' | 'environment') => {
    if (streamRef.current) stopCamera(streamRef.current);
    setIsReady(false);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsReady(true);
      }
    } catch (e) {
      setCameraError('Camera access denied or unavailable.');
    }
  }, []);

  useEffect(() => {
    initCamera(facingMode);
    return () => { stopCamera(streamRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flipCamera = async () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    await initCamera(next);
  };

  const runCountdownAndCapture = useCallback(async () => {
    if (captureRef.current || !videoRef.current) return;
    captureRef.current = true;
    setIsCapturing(true);

    // Countdown (if > 0)
    if (countdown > 0) {
      for (let i = countdown; i >= 1; i--) {
        setCountdownNum(i);
        await delay(1000);
      }
      setCountdownNum(null);
    }

    // Flash
    setIsFlashing(true);
    await delay(100);

    // Capture
    const dataUrl = captureFrame(videoRef.current, filter, facingMode === 'user');
    setIsFlashing(false);

    const photo: CapturedPhoto = {
      id: nanoid(),
      dataUrl,
      filter,
      takerName: userName,
      position: currentPhotoIdx + 1,
      timestamp: Date.now(),
    };

    const next = [...capturedPhotos, photo];
    setCapturedPhotos(next);

    if (next.length >= photoCount) {
      setSessionDone(true);
      setIsCapturing(false);
      captureRef.current = false;
      return;
    }

    setCurrentPhotoIdx((p) => p + 1);
    setIsCapturing(false);
    captureRef.current = false;
  }, [countdown, filter, facingMode, userName, currentPhotoIdx, capturedPhotos, photoCount]);

  // Send to parent when done
  useEffect(() => {
    if (sessionDone && capturedPhotos.length >= photoCount) {
      const t = setTimeout(() => onComplete(capturedPhotos), 600);
      return () => clearTimeout(t);
    }
  }, [sessionDone, capturedPhotos, photoCount, onComplete]);

  const filterCSS = getFilterCSS(filter);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mt-6">
        {Array.from({ length: photoCount }).map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i < capturedPhotos.length ? 28 : 10,
              height: 10,
              background:
                i < capturedPhotos.length
                  ? 'linear-gradient(90deg,#FF8FAB,#C9B1FF)'
                  : i === currentPhotoIdx
                    ? '#FFB6C1'
                    : 'rgba(255,182,193,0.3)',
            }}
          />
        ))}
        <span className="text-xs font-semibold text-pink-400 ml-1">
          {capturedPhotos.length}/{photoCount}
        </span>
      </div>

      {/* Camera frame */}
      <div
        className="camera-frame w-full relative"
        style={{ aspectRatio: '3/4', maxHeight: '65dvh' }}
      >
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-pink-50 gap-3 p-6 text-center">
            <span className="text-4xl">📷</span>
            <p className="text-sm text-gray-500">{cameraError}</p>
            <button className="btn-snappy text-sm" onClick={() => initCamera(facingMode)}>
              Try Again
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay playsInline muted
              className="camera-video"
              style={{
                filter: filterCSS,
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                opacity: isReady ? 1 : 0,
                transition: 'opacity 0.3s',
              }}
            />
            {!isReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-pink-50">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  className="text-3xl"
                >
                  📷
                </motion.div>
              </div>
            )}
          </>
        )}

        {/* Countdown overlay */}
        <AnimatePresence>
          {countdownNum !== null && (
            <div className="countdown-overlay">
              <div className="relative z-10 flex flex-col items-center gap-2">
                <motion.p className="text-white/80 font-bold text-sm tracking-widest uppercase">
                  Get ready!
                </motion.p>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={countdownNum}
                    initial={{ scale: 0.2, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 1.8, opacity: 0, y: -20 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                    className="font-display text-white drop-shadow-xl"
                    style={{ fontSize: '7rem', lineHeight: 1, textShadow: '0 0 40px rgba(255,143,171,0.8)' }}
                  >
                    {countdownNum}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Flash */}
        <AnimatePresence>
          {isFlashing && (
            <motion.div
              key="flash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.06 }}
              className="absolute inset-0 bg-white z-30 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Corner guides */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-white/50 rounded-tl-xl" />
          <div className="absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-white/50 rounded-tr-xl" />
          <div className="absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-white/50 rounded-bl-xl" />
          <div className="absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-white/50 rounded-br-xl" />
        </div>

        {/* Photo counter badge */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
          <div className="badge badge-pink backdrop-blur-sm">
            📸 Photo {currentPhotoIdx + 1} of {photoCount}
          </div>
        </div>

      </div>

      {/* Strip thumbnail row — same 3:4 shape as camera container, sized up for visibility */}
      {capturedPhotos.length > 0 && (
        <div className="flex gap-2 w-full max-w-sm flex-wrap justify-center">
          {capturedPhotos.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg overflow-hidden border-2 border-white shadow-sm"
              style={{ width: '80px', aspectRatio: '3/4' }}
            >
              <img src={p.dataUrl} alt={`Photo ${i + 1}`} className="w-full h-full object-contain" />  {/* was object-cover */}
            </motion.div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-6">
        {/* Flip */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={flipCamera}
          disabled={isCapturing}
          className="btn-outline px-4 py-2 text-sm"
        >
          <FlipHorizontal className="w-4 h-4" />
          Flip
        </motion.button>

        {/* Shutter */}
        <div className="relative">
          {!isCapturing && isReady && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-pink-300"
                animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-purple-300"
                animate={{ scale: [1, 1.9], opacity: [0.4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
              />
            </>
          )}
          <motion.button
            whileHover={isCapturing ? {} : { scale: 1.08 }}
            whileTap={isCapturing ? {} : { scale: 0.92 }}
            onClick={runCountdownAndCapture}
            disabled={isCapturing || !isReady || sessionDone}
            className="shutter-btn z-10 relative"
          >
            <Camera className="w-7 h-7 text-white" />
          </motion.button>
        </div>

        {/* Cancel */}
        <button className="btn-ghost text-xs" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}
