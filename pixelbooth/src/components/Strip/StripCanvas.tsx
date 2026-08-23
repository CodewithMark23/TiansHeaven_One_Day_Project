import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette } from 'lucide-react';
import type { CapturedPhoto, FrameTemplate, StickerItem } from '../../types';
import { STRIP_BORDER_COLORS } from '../../types';
import StickerPalette from '../Stickers/StickerPalette';

interface StripCanvasProps {
  photos: CapturedPhoto[];
  frameTemplate: FrameTemplate;
  frameColor: string;
  caption: string;
  stickers: StickerItem[];
  onCaptionChange: (c: string) => void;
  onStickersChange: (s: StickerItem[]) => void;
  userName?: string;
}

export interface StripCanvasRef {
  getDataUrl: () => Promise<string>;
}

const StripCanvas = forwardRef<StripCanvasRef, StripCanvasProps>(
  ({ photos, frameTemplate, frameColor, caption, stickers, onCaptionChange, onStickersChange, userName }, ref) => {
    const stripRef = useRef<HTMLDivElement>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [localColor, setLocalColor] = useState(frameColor);

    // Export strip to PNG via html2canvas
    const getDataUrl = async (): Promise<string> => {
      const { default: html2canvas } = await import('html2canvas');
      if (!stripRef.current) return '';
      const canvas = await html2canvas(stripRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: null,
      });
      return canvas.toDataURL('image/png', 1.0);
    };

    useImperativeHandle(ref, () => ({ getDataUrl }));

    const activeColor = localColor || frameColor;

    return (
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* Strip preview */}
        <div className="flex flex-col items-center gap-3 flex-shrink-0">
          <div
            ref={stripRef}
            className="strip-container relative"
            style={{
              width: 180,
              background: activeColor,
              borderRadius: 10,
              padding: '12px 12px 8px',
              border: `4px ${frameTemplate.borderStyle} ${
                activeColor === '#FFFFFF' ? '#e0c0cc' :
                activeColor === '#2D2D2D' ? '#555' :
                activeColor
              }`,
            }}
          >
            {/* Frame decorations */}
            {frameTemplate.decorations.length > 0 && (
              <>
                <span style={{ position: 'absolute', top: 2, left: 4, fontSize: 12 }}>
                  {frameTemplate.decorations[0]}
                </span>
                <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 12 }}>
                  {frameTemplate.decorations[1] ?? frameTemplate.decorations[0]}
                </span>
                <span style={{ position: 'absolute', bottom: 28, left: 4, fontSize: 10 }}>
                  {frameTemplate.decorations[2] ?? frameTemplate.decorations[0]}
                </span>
                <span style={{ position: 'absolute', bottom: 28, right: 4, fontSize: 10 }}>
                  {frameTemplate.decorations[3] ?? frameTemplate.decorations[0]}
                </span>
              </>
            )}

            {/* Photos */}
            <div className="flex flex-col gap-[3px] relative">
              {photos.map((photo, i) => (
                <div
                  key={photo.id}
                  className="relative overflow-hidden"
                  style={{ borderRadius: 4, aspectRatio: '3/4', width: '100%' }}
                >
                  <img
                    src={photo.dataUrl}
                    alt={`Photo ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              ))}
            </div>

            {/* Sticker overlay on strip */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
                borderRadius: 8,
              }}
            >
              {stickers.map((s) => (
                <div
                  key={s.id}
                  style={{
                    position: 'absolute',
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    transform: `translate(-50%,-50%) rotate(${s.rotation}deg)`,
                  }}
                >
                  {s.type === 'emoji' ? (
                    <span style={{ fontSize: `${1.5 * s.scale}rem`, lineHeight: 1 }}>{s.content}</span>
                  ) : (
                    <img src={s.content} alt="sticker" style={{ width: `${50 * s.scale}px`, objectFit: 'contain' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 4, textAlign: 'center' }}>
              {caption && (
                <p
                  style={{
                    fontSize: 9,
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 600,
                    color: activeColor === '#2D2D2D' ? '#fff' : '#555',
                    marginBottom: 2,
                    wordBreak: 'break-word',
                    lineHeight: 1.3,
                  }}
                >
                  "{caption}"
                </p>
              )}
              <p style={{ fontSize: 7, fontFamily: 'Outfit, sans-serif', color: activeColor === '#2D2D2D' ? '#aaa' : '#aaa' }}>
                📸 Snappy {userName ? `• ${userName}` : ''} •{' '}
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Border color picker */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setShowColorPicker((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Palette className="w-3.5 h-3.5" />
              Frame color
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
                      onClick={() => setLocalColor(color)}
                      className="w-6 h-6 rounded-full"
                      style={{
                        background: color,
                        border: localColor === color ? '2px solid #C9B1FF' : '2px solid transparent',
                        boxShadow: color === '#FFFFFF' ? '0 0 0 1px #e5e7eb' : 'none',
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right panel: stickers + caption */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Caption */}
          <div>
            <p className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-2">
              ✍️ Caption
            </p>
            <textarea
              className="cute-input-rect text-sm"
              rows={2}
              placeholder="e.g. best day ever ♡"
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              maxLength={60}
            />
            <p className="text-right text-[10px] text-gray-300 mt-0.5">{caption.length}/60</p>
          </div>

          {/* Stickers */}
          <div>
            <p className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-2">
              ✨ Stickers
            </p>
            <StickerPalette onAdd={(s) => onStickersChange([...stickers, s])} />
          </div>

          {stickers.length > 0 && (
            <p className="text-xs text-gray-400">
              💡 Tip: stickers appear on the strip preview. Click the strip to position them.
            </p>
          )}
        </div>
      </div>
    );
  }
);

StripCanvas.displayName = 'StripCanvas';
export default StripCanvas;
