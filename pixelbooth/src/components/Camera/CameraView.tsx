import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, AlertCircle, Loader2 } from 'lucide-react';
import type { FilterType } from '../../types';
import { getFilterCSS } from '../../lib/camera';
import type { UseCameraReturn } from '../../hooks/useCamera';

interface CameraViewProps {
  camera: UseCameraReturn;
  filter: FilterType;
  isFlashing?: boolean;
  className?: string;
}

export default function CameraView({
  camera,
  filter,
  isFlashing = false,
  className = '',
}: CameraViewProps) {
  const { videoRef, isLoading, error, start, isReady } = camera;

  useEffect(() => {
    start();
  }, [start]);

  const filterCSS = getFilterCSS(filter);

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-pink-50 ${className}`}
        style={{ borderRadius: '1.5rem' }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4 p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-pink-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Camera Unavailable</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
          <button className="btn-secondary text-sm" onClick={start}>
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ borderRadius: '1.5rem' }}>
      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            >
              <Camera className="w-10 h-10 text-pink-300" />
            </motion.div>
            <p className="mt-3 text-sm text-gray-400 font-medium">Starting camera…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera placeholder when not ready */}
      {!isReady && !isLoading && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
          <Loader2 className="w-8 h-8 text-pink-300 animate-spin" />
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-video w-full h-full object-cover"
        style={{
          filter: filterCSS,
          display: isReady ? 'block' : 'none',
          transform: 'scaleX(-1)',
          borderRadius: '1.5rem',
        }}
      />

      {/* Shutter flash */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
            className="absolute inset-0 z-30 bg-white pointer-events-none"
            style={{ borderRadius: '1.5rem' }}
          />
        )}
      </AnimatePresence>

      {/* Decorative corner frame */}
      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: '1.5rem' }}>
        {/* Top-left */}
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-white/60 rounded-tl-lg" />
        {/* Top-right */}
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-white/60 rounded-tr-lg" />
        {/* Bottom-left */}
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-white/60 rounded-bl-lg" />
        {/* Bottom-right */}
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-white/60 rounded-br-lg" />
      </div>
    </div>
  );
}
