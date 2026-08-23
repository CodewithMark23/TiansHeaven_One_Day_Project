import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Check } from 'lucide-react';
import type { CapturedPhoto, FilterType, CountdownDuration } from '../../types';
import { stopCamera, captureFrame } from '../../lib/camera';
import { nanoid } from 'nanoid';

interface RetakeReviewProps {
  photos: CapturedPhoto[];
  filter: FilterType;
  countdown: CountdownDuration;
  onUpdate: (updated: CapturedPhoto[]) => void;
  onConfirm: () => void;
}

export default function RetakeReview({
  photos,
  filter,
  countdown,
  onUpdate,
  onConfirm,
}: RetakeReviewProps) {
  const [retakingIdx, setRetakingIdx] = useState<number | null>(null);
  const [retakeCount, setRetakeCount] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const startRetake = useCallback(async (idx: number) => {
    setRetakingIdx(idx);
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setRetakingIdx(null);
      setCameraActive(false);
    }
  }, []);

  const doCapture = useCallback(async () => {
    if (!videoRef.current || retakingIdx === null) return;

    // Countdown
    for (let i = countdown; i >= 1; i--) {
      setRetakeCount(i);
      await delay(1000);
    }
    setRetakeCount(null);

    setIsFlashing(true);
    await delay(100);
    const dataUrl = captureFrame(videoRef.current, filter, true);
    setIsFlashing(false);

    stopCamera(streamRef.current);
    setCameraActive(false);

    const newPhoto: CapturedPhoto = {
      id: nanoid(),
      dataUrl,
      filter,
      takerName: photos[retakingIdx].takerName,
      position: retakingIdx + 1,
      timestamp: Date.now(),
    };

    const updated = [...photos];
    updated[retakingIdx] = newPhoto;
    onUpdate(updated);
    setRetakingIdx(null);
  }, [retakingIdx, countdown, filter, photos, onUpdate]);

  const retakeAll = async () => {
    // Just go back by calling onUpdate with empty — parent will restart
    onUpdate([]);
  };

  // Compute columns based on photo count
  const cols = photos.length === 6 ? 3 : photos.length === 1 ? 1 : 2;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-5">
      <div className="text-center">
        <h2 className="font-display text-2xl text-pink-500 mb-1">Review your photos 🌸</h2>
        <p className="text-sm text-gray-400">Happy with them? Or retake any you don't love!</p>
      </div>

      {/* Retake camera modal */}
      <AnimatePresence>
        {cameraActive && retakingIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="card-white p-4 w-full max-w-sm flex flex-col items-center gap-4"
            >
              <div className="relative w-full camera-frame" style={{ aspectRatio: '3/4' }}>
                <video
                  ref={videoRef}
                  autoPlay playsInline muted
                  className="camera-video"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <AnimatePresence>
                  {retakeCount !== null && (
                    <div className="countdown-overlay">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={retakeCount}
                          initial={{ scale: 0.3, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 1.8, opacity: 0 }}
                          className="font-display text-white text-8xl drop-shadow-xl"
                        >
                          {retakeCount}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  )}
                </AnimatePresence>
                {isFlashing && (
                  <div className="absolute inset-0 bg-white z-30" />
                )}
              </div>
              <p className="text-sm text-gray-500">Retaking Photo {retakingIdx + 1}</p>
              <div className="flex gap-3">
                <button
                  className="btn-ghost"
                  onClick={() => {
                    stopCamera(streamRef.current);
                    setCameraActive(false);
                    setRetakingIdx(null);
                  }}
                >
                  Cancel
                </button>
                <button className="btn-snappy" onClick={doCapture}>
                  📸 Snap!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photos grid */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {photos.map((photo, i) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex flex-col gap-1.5"
          >
            <div className="relative rounded-xl overflow-hidden border-2 border-pink-100" style={{ aspectRatio: '3/4' }}>
              <img src={photo.dataUrl} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute top-1.5 left-1.5">
                <span className="badge badge-pink" style={{ fontSize: '9px' }}>#{i + 1}</span>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => startRetake(i)}
              className="btn-outline text-xs py-1.5 w-full"
            >
              <RefreshCw className="w-3 h-3" />
              Retake
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onConfirm}
          className="btn-snappy w-full"
        >
          <Check className="w-4 h-4" />
          Looks good! Continue ✨
        </motion.button>
        <button className="btn-ghost w-full" onClick={retakeAll}>
          <RefreshCw className="w-3.5 h-3.5" />
          Retake all photos
        </button>
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}
