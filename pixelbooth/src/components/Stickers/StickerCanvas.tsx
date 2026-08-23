import { useState, useRef, useCallback } from 'react';
import type { StickerItem } from '../../types';

interface StickerCanvasProps {
  stickers: StickerItem[];
  onChange: (stickers: StickerItem[]) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function StickerCanvas({ stickers, onChange, containerRef }: StickerCanvasProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const getContainerRect = () => containerRef.current?.getBoundingClientRect() ?? new DOMRect();

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
      startDist: dist,
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
      const newScale = Math.max(0.3, Math.min(5, (dist / startDist) * origScale));
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

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteSticker = (id: string) => {
    onChange(stickers.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const deselect = () => setSelectedId(null);

  return (
    <div
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
        const fontSize = s.type === 'emoji' ? `${2.5 * s.scale}rem` : undefined;
        const imgSize = `${80 * s.scale}px`;

        return (
          <div
            key={s.id}
            className="sticker-node"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
              outline: isSelected ? '2px dashed rgba(201,177,255,0.9)' : 'none',
              borderRadius: '8px',
              padding: '4px',
            }}
            onPointerDown={(e) => handleDragStart(e, s.id)}
            onClick={(e) => { e.stopPropagation(); setSelectedId(s.id); }}
          >
            {s.type === 'emoji' ? (
              <span style={{ fontSize, lineHeight: 1, display: 'block', userSelect: 'none' }}>
                {s.content}
              </span>
            ) : (
              <img
                src={s.content}
                alt="sticker"
                style={{ width: imgSize, height: imgSize, objectFit: 'contain', userSelect: 'none' }}
                draggable={false}
              />
            )}

            {/* Delete button */}
            {isSelected && (
              <div
                className="sticker-delete"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); deleteSticker(s.id); }}
              >
                ✕
              </div>
            )}

            {/* Resize/rotate handle */}
            {isSelected && (
              <div
                className="sticker-handle"
                onPointerDown={(e) => { e.stopPropagation(); handleResizeStart(e, s.id); }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
