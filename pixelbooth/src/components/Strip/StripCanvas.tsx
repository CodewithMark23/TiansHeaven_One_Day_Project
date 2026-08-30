import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette } from 'lucide-react';
import type { CapturedPhoto, FrameTemplate, StickerItem, PhotoLayoutId } from '../../types';
import { STRIP_BORDER_COLORS, PHOTO_LAYOUT_OPTIONS } from '../../types';
import StickerPalette from '../Stickers/StickerPalette';
import StickerCanvas from '../Stickers/StickerCanvas';
import type { StickerCanvasRef } from '../Stickers/StickerCanvas';

interface StripCanvasProps {
  photos: CapturedPhoto[];
  frameTemplate: FrameTemplate;
  frameColor: string;
  caption: string;
  stickers: StickerItem[];
  layoutId?: PhotoLayoutId;
  onCaptionChange: (c: string) => void;
  onStickersChange: (s: StickerItem[]) => void;
  userName?: string;
}

export interface StripCanvasRef {
  getDataUrl: () => Promise<string>;
}

const StripCanvas = forwardRef<StripCanvasRef, StripCanvasProps>(
  ({ photos, frameTemplate, frameColor, caption, stickers, layoutId = '4-vertical', onCaptionChange, onStickersChange, userName }, ref) => {
    const stripRef = useRef<HTMLDivElement>(null);
    const stickerCanvasRef = useRef<StickerCanvasRef>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [localColor, setLocalColor] = useState(frameColor);

    const layoutOpt = PHOTO_LAYOUT_OPTIONS.find((l) => l.id === layoutId) || PHOTO_LAYOUT_OPTIONS[0];

    // Compute container width based on columns
    const containerWidth =
      layoutOpt.columns === 3 ? 380 :
        layoutOpt.columns === 2 ? 320 :
          layoutOpt.id === '1-pose' ? 280 : 200;

    // Export strip to PNG via html2canvas
    const getDataUrl = async (): Promise<string> => {
      stickerCanvasRef.current?.deselect();
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!stripRef.current) return '';

      // Measure the on-screen sticker overlay dimensions (= strip padding box)
      const overlayEl = stripRef.current.querySelector('.sticker-overlay-container') as HTMLElement | null;
      const overlayRect = overlayEl?.getBoundingClientRect();
      const overlayW = overlayRect?.width ?? stripRef.current.clientWidth;
      const overlayH = overlayRect?.height ?? stripRef.current.clientHeight;

      const rect = stripRef.current.getBoundingClientRect();
      const { default: html2canvas } = await import('html2canvas');

      const canvas = await html2canvas(stripRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: null,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        onclone: (_clonedDoc, element) => {
          element.style.width = `${Math.round(rect.width)}px`;
          element.style.height = `${Math.round(rect.height)}px`;
          element.style.transform = 'none';

          // Convert sticker % positions to exact pixel positions
          // so html2canvas doesn't recompute them against a different height
          const stickerNodes = element.querySelectorAll('.sticker-node') as NodeListOf<HTMLElement>;
          stickerNodes.forEach((node) => {
            const leftPct = parseFloat(node.style.left);
            const topPct = parseFloat(node.style.top);
            if (!isNaN(leftPct) && !isNaN(topPct)) {
              node.style.left = `${(leftPct / 100) * overlayW}px`;
              node.style.top = `${(topPct / 100) * overlayH}px`;
            }
          });
        },
      });

      return canvas.toDataURL('image/png', 1.0);
    };

    useImperativeHandle(ref, () => ({ getDataUrl }));

    const activeColor = localColor || frameColor;

    return (
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full justify-center">
        {/* Strip preview */}
        <div className="flex flex-col items-center gap-3 flex-shrink-0 mx-auto">
          <div
            ref={stripRef}
            className="strip-container relative transition-all duration-300"
            style={{
              width: containerWidth,
              background: activeColor,
              borderRadius: 12,
              padding: '14px 14px 10px',
              border: `4px ${frameTemplate.borderStyle} ${activeColor === '#FFFFFF' ? '#e0c0cc' :
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

            {/* Photos Grid */}
            <div
              className="grid gap-1.5 relative"
              style={{
                gridTemplateColumns: `repeat(${layoutOpt.columns}, minmax(0, 1fr))`,
              }}
            >
              {photos.map((photo, i) => (
                <div
                  key={photo.id || i}
                  className="relative overflow-hidden shadow-xs bg-black w-full"
                  style={{
                    borderRadius: 4,
                    height: 0,
                    paddingBottom: '75%',
                    position: 'relative',
                  }}
                >
                  <img
                    src={photo.dataUrl}
                    alt={`Photo ${i + 1}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Interactive Sticker Overlay (Clipped inside strip container) */}
            <StickerCanvas
              ref={stickerCanvasRef}
              stickers={stickers}
              onChange={onStickersChange}
              containerRef={stripRef}
            />

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
              💡 Tip: stickers appear on the strip. Click the sticker to position them.
            </p>
          )}
        </div>
      </div>
    );
  }
);

StripCanvas.displayName = 'StripCanvas';
export default StripCanvas;
