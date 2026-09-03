import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { StickerItem } from '../../types';

interface StickerCanvasProps {
  stickers: StickerItem[];
  onChange: (stickers: StickerItem[]) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export interface StickerCanvasRef {
  deselect: () => void;
}

const StickerCanvas = forwardRef<StickerCanvasRef, StickerCanvasProps>(
  ({ stickers, onChange }, ref) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(ref, () => ({
      deselect: () => setSelectedId(null),
    }));

    const dragState = useRef<{
      stickerId: string;
      startX: number;
      startY: number;
      origX: number;
      origY: number;
    } | null>(null);

    const resizeState = useRef<{
      stickerId: string;
      startDist: number;
      origScale: number;
      startX: number;
      startY: number;
      origRot: number;
    } | null>(null);

    const getContainerRect = () => overlayRef.current?.getBoundingClientRect() ?? new DOMRect();

    // ── Drag ──────────────────────────────────────────────────────────────────
    const handleDragStart = (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      setSelectedId(id);
      const sticker = stickers.find((s) => s.id === id)!;
      dragState.current = {
        stickerId: id,
        startX: e.clientX,
        startY: e.clientY,
        origX: sticker.x,
        origY: sticker.y,
      };
    };

    const handleDragMove = useCallback(
      (e: React.PointerEvent) => {
        if (!dragState.current) return;
        const rect = getContainerRect();
        if (!rect.width || !rect.height) return;
        const dx = ((e.clientX - dragState.current.startX) / rect.width) * 100;
        const dy = ((e.clientY - dragState.current.startY) / rect.height) * 100;
        onChange(
          stickers.map((s) =>
            s.id === dragState.current!.stickerId
              ? {
                ...s,
                x: Math.max(0, Math.min(100, dragState.current!.origX + dx)),
                y: Math.max(0, Math.min(100, dragState.current!.origY + dy)),
              }
              : s
          )
        );
      },
      [stickers, onChange]
    );

    const handleDragEnd = () => { dragState.current = null; };

    // ── Resize handle ─────────────────────────────────────────────────────────
    const handleResizeStart = (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const sticker = stickers.find((s) => s.id === id)!;
      const rect = getContainerRect();
      const cx = rect.left + (sticker.x / 100) * rect.width;
      const cy = rect.top + (sticker.y / 100) * rect.height;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
      resizeState.current = {
        stickerId: id,
        startDist: Math.max(dist, 1),
        origScale: sticker.scale,
        startX: e.clientX,
        startY: e.clientY,
        origRot: sticker.rotation - angle,
      };
    };

    const handleResizeMove = useCallback(
      (e: React.PointerEvent) => {
        if (!resizeState.current) return;
        const { stickerId, startDist, origScale, origRot } = resizeState.current;
        const sticker = stickers.find((s) => s.id === stickerId)!;
        const rect = getContainerRect();
        const cx = rect.left + (sticker.x / 100) * rect.width;
        const cy = rect.top + (sticker.y / 100) * rect.height;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        const newScale = Math.max(0.2, Math.min(5, (dist / startDist) * origScale));
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
        const newRot = origRot + angle;
        onChange(
          stickers.map((s) =>
            s.id === stickerId ? { ...s, scale: newScale, rotation: newRot } : s
          )
        );
      },
      [stickers, onChange]
    );

    const handleResizeEnd = () => { resizeState.current = null; };

    const adjustScale = (id: string, delta: number) => {
      onChange(
        stickers.map((s) =>
          s.id === id ? { ...s, scale: Math.max(0.2, Math.min(5, s.scale + delta)) } : s
        )
      );
    };

    const deleteSticker = (id: string) => {
      onChange(stickers.filter((s) => s.id !== id));
      if (selectedId === id) setSelectedId(null);
    };

    const deselect = () => setSelectedId(null);

    return (
      <div
        ref={overlayRef}
        className="sticker-overlay-container interactive"
        onClick={deselect}
        onPointerMove={(e) => {
          if (dragState.current) handleDragMove(e);
          if (resizeState.current) handleResizeMove(e);
        }}
        onPointerUp={() => {
          handleDragEnd();
          handleResizeEnd();
        }}
      >
        {stickers.map((s) => {
          const isSelected = s.id === selectedId;
          const sizePx = s.type === 'emoji' ? Math.round(36 * s.scale) : Math.round(65 * s.scale);

          return (
            <div
              key={s.id}
              className="sticker-node"
              style={{
                position: 'absolute',
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${sizePx}px`,
                height: `${sizePx}px`,
                transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                outline: isSelected ? '2px dashed #C9B1FF' : 'none',
                borderRadius: '6px',
                padding: 0,
                margin: 0,
                boxSizing: 'border-box',
                zIndex: isSelected ? 40 : 20,
              }}
              onPointerDown={(e) => handleDragStart(e, s.id)}
              onClick={(e) => { e.stopPropagation(); setSelectedId(s.id); }}
            >
              {s.type === 'emoji' ? (
                <span
                  style={{
                    fontSize: `${2.2 * s.scale}rem`,
                    lineHeight: 1,
                    display: 'inline-block',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.content}
                </span>
              ) : (
                <img
                  src={s.content}
                  alt="sticker"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    display: 'block',
                  }}
                  draggable={false}
                />
              )}

              {/* Delete button */}
              {isSelected && (
                <div
                  className="sticker-delete"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); deleteSticker(s.id); }}
                  title="Delete sticker"
                >
                  ✕
                </div>
              )}

              {/* Resize/rotate handle */}
              {isSelected && (
                <div
                  className="sticker-handle"
                  onPointerDown={(e) => { e.stopPropagation(); handleResizeStart(e, s.id); }}
                  title="Drag to resize & rotate"
                />
              )}

              {/* Quick scale controls */}
              {isSelected && (
                <div
                  className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 border border-pink-200 shadow-md rounded-full px-1.5 py-0.5 z-50 pointer-events-auto"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); adjustScale(s.id, -0.15); }}
                    className="w-4 h-4 rounded-full bg-pink-100 text-pink-600 font-bold text-[10px] flex items-center justify-center hover:bg-pink-200"
                    title="Make smaller"
                  >
                    −
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); adjustScale(s.id, 0.15); }}
                    className="w-4 h-4 rounded-full bg-pink-100 text-pink-600 font-bold text-[10px] flex items-center justify-center hover:bg-pink-200"
                    title="Make bigger"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

StickerCanvas.displayName = 'StickerCanvas';
export default StickerCanvas;