import { useState, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CapturedPhoto, StripOptions } from '../../types';
import { STRIP_BORDER_COLORS } from '../../types';
import { buildStrip, downloadStrip } from '../../lib/strip';
import { Download, Palette } from 'lucide-react';

interface PhotoStripProps {
  photos: CapturedPhoto[];
  userName?: string;
  showDownload?: boolean;
}

export interface PhotoStripRef {
  download: () => Promise<void>;
}

const PhotoStrip = forwardRef<PhotoStripRef, PhotoStripProps>(
  ({ photos, userName, showDownload = true }, ref) => {
    const [borderColor, setBorderColor] = useState(STRIP_BORDER_COLORS[0]);
    const [isExporting, setIsExporting] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const handleDownload = async () => {
      if (photos.length === 0) return;
      setIsExporting(true);
      try {
        const options: StripOptions = {
          borderColor,
          title: userName ? `✨ ${userName}'s PixelBooth ✨` : '✨ PixelBooth ✨',
          date: true,
          layout: 'vertical',
        };
        const canvas = await buildStrip(photos, options);
        downloadStrip(canvas, `pixelbooth-${Date.now()}.png`);
      } finally {
        setIsExporting(false);
      }
    };

    useImperativeHandle(ref, () => ({ download: handleDownload }));

    return (
      <div className="flex flex-col items-center gap-4">
        {/* Strip preview */}
        <motion.div
          layout
          className="photo-strip"
          style={{
            background: borderColor,
            padding: '12px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            width: '160px',
          }}
        >
          {photos.length === 0 ? (
            /* Empty slots */
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-full rounded"
                style={{
                  aspectRatio: '3/4',
                  background: 'rgba(255,255,255,0.4)',
                  marginBottom: i < 3 ? '4px' : 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                }}
              >
                <span className="text-white/60 text-lg">{i + 1}</span>
              </div>
            ))
          ) : (
            photos.map((photo, i) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', delay: i * 0.1 }}
                style={{ marginBottom: i < photos.length - 1 ? '4px' : 0 }}
              >
                <img
                  src={photo.dataUrl}
                  alt={`Photo ${i + 1}`}
                  className="strip-photo"
                  style={{ borderRadius: '4px' }}
                />
              </motion.div>
            ))
          )}

          {/* Footer */}
          <div
            className="mt-2 text-center"
            style={{ color: 'rgba(0,0,0,0.4)', fontSize: '8px', fontFamily: 'Outfit, sans-serif' }}
          >
            📸 PixelBooth
          </div>
        </motion.div>

        {/* Border color picker */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => setShowColorPicker((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Palette className="w-3.5 h-3.5" />
            Border color
          </button>
          <AnimatePresence>
            {showColorPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-1.5 justify-center"
              >
                {STRIP_BORDER_COLORS.map((color) => (
                  <motion.button
                    key={color}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setBorderColor(color)}
                    className="w-6 h-6 rounded-full"
                    style={{
                      background: color,
                      border:
                        borderColor === color
                          ? '2px solid #c9b1ff'
                          : '2px solid transparent',
                      boxShadow:
                        color === '#FFFFFF' ? '0 0 0 1px #e5e7eb' : 'none',
                    }}
                    title={color}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Download button */}
        {showDownload && photos.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDownload}
            disabled={isExporting}
            className="btn-primary text-sm px-6 py-2.5"
          >
            {isExporting ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                Saving…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Strip
              </>
            )}
          </motion.button>
        )}
      </div>
    );
  }
);

PhotoStrip.displayName = 'PhotoStrip';
export default PhotoStrip;
