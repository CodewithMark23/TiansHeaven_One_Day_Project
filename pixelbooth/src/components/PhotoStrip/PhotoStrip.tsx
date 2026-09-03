import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CapturedPhoto, StripOptions, PhotoLayoutId, StickerItem } from '../../types';
import { STRIP_BORDER_COLORS, PHOTO_LAYOUT_OPTIONS } from '../../types';
import { buildStrip, downloadStrip } from '../../lib/strip';
import { Download, Palette } from 'lucide-react';
import StickerCanvas from '../Stickers/StickerCanvas';

interface PhotoStripProps {
  photos: CapturedPhoto[];
  userName?: string;
  showDownload?: boolean;
  layoutId?: PhotoLayoutId;
  photoCount?: number;
  stickers?: StickerItem[];
  onStickersChange?: (stickers: StickerItem[]) => void;
}

export interface PhotoStripRef {
  download: () => Promise<void>;
}

const PhotoStrip = forwardRef<PhotoStripRef, PhotoStripProps>(
  (
    {
      photos,
      userName,
      showDownload = true,
      layoutId = '4-vertical',
      photoCount = 4,
      stickers = [],
      onStickersChange,
    },
    ref
  ) => {
    const [borderColor, setBorderColor] = useState(STRIP_BORDER_COLORS[0]);
    const [isExporting, setIsExporting] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const photoAreaRef = useRef<HTMLDivElement>(null);

    const layoutOpt = PHOTO_LAYOUT_OPTIONS.find((l) => l.id === layoutId) || PHOTO_LAYOUT_OPTIONS[0];

    const containerWidth =
      layoutOpt.columns === 3 ? 320 :
        layoutOpt.columns === 2 ? 260 :
          layoutOpt.id === '1-pose' ? 220 : 160;

    const totalSlots = photoCount || layoutOpt.photoCount;

    const handleDownload = async () => {
      if (photos.length === 0) return;
      setIsExporting(true);
      try {
        const options: StripOptions = {
          borderColor,
          title: userName ? `✨ ${userName}'s Snappy ✨` : '✨ Snappy ✨',
          date: true,
          layout: 'vertical',
          layoutId,
        };
        const canvas = await buildStrip(photos, options, stickers);
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
          className="photo-strip transition-all duration-300"
          style={{
            background: borderColor,
            padding: '12px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            width: `${containerWidth}px`,
          }}
        >
          <div className="relative" ref={photoAreaRef}>
            <div
              className="grid gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${layoutOpt.columns}, minmax(0, 1fr))`,
              }}
            >
              {photos.length === 0 ? (
                /* Empty slots */
                Array.from({ length: totalSlots }).map((_, i) => (
                  <div
                    key={i}
                    className="w-full rounded"
                    style={{
                      aspectRatio: '4/3',
                      background: 'rgba(255,255,255,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                    }}
                  >
                    <span className="text-white/60 font-bold">{i + 1}</span>
                  </div>
                ))
              ) : (
                photos.map((photo, i) => (
                  <motion.div
                    key={photo.id || i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', delay: i * 0.1 }}
                  >
                    <img
                      src={photo.dataUrl}
                      alt={`Photo ${i + 1}`}
                      className="strip-photo"
                      style={{ borderRadius: '4px', aspectRatio: '4/3', objectFit: 'contain', width: '100%', backgroundColor: '#000' }}
                    />
                  </motion.div>
                ))
              )}
            </div>

            {/* Sticker overlay — only once the strip is finished */}
            {showDownload && photos.length > 0 && onStickersChange && (
              <StickerCanvas
                stickers={stickers}
                onChange={onStickersChange}
                containerRef={photoAreaRef}
              />
            )}
          </div>

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
