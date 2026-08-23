import { useState } from 'react';
import { motion } from 'framer-motion';
import { FRAME_TEMPLATES, FRAME_COLORS } from '../../types';
import type { FrameTemplate } from '../../types';

interface FrameSelectorProps {
  selectedFrame: FrameTemplate;
  selectedColor: string;
  onFrameChange: (f: FrameTemplate) => void;
  onColorChange: (hex: string) => void;
}

export default function FrameSelector({
  selectedFrame,
  selectedColor,
  onFrameChange,
  onColorChange,
}: FrameSelectorProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? FRAME_TEMPLATES : FRAME_TEMPLATES.slice(0, 6);

  return (
    <div className="space-y-3">
      <p className="font-cute text-xs font-bold uppercase tracking-widest" style={{ color: '#D98FA8' }}>
        🖼 Frame
      </p>

      {/* Frame grid */}
      <div className="grid grid-cols-3 gap-2">
        {visible.map((frame) => (
          <motion.button
            key={frame.id}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onFrameChange(frame)}
            className={`frame-card relative overflow-hidden ${
              selectedFrame.id === frame.id ? 'active' : ''
            }`}
          >
            {/* Frame preview mini */}
            <div
              className="w-full aspect-[3/4] rounded-lg flex flex-col items-center justify-center text-xs gap-0.5 relative overflow-hidden"
              style={{
                background: selectedColor,
                border: `2px ${frame.borderStyle} ${
                  selectedColor === '#FFFFFF' ? '#D8BFC7' :
                  selectedColor === '#2D2D2D' ? '#555' : selectedColor
                }`,
              }}
            >
              {/* Decorations in corners */}
              {frame.decorations.slice(0, 2).map((d, i) => (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    fontSize: '10px',
                    top: i === 0 ? '2px' : undefined,
                    bottom: i === 1 ? '2px' : undefined,
                    right: '2px',
                    opacity: 0.9,
                  }}
                >
                  {d}
                </span>
              ))}
              <span style={{ fontSize: '20px' }}>{frame.emoji}</span>
              {/* Inner photo area */}
              <div
                className="w-4/5 aspect-[3/4] rounded"
                style={{ background: 'rgba(255,249,233,0.7)' }}
              />
            </div>
            <span className="font-cute text-[10px] font-semibold text-gray-500 mt-1 block text-center truncate w-full px-1">
              {frame.label}
            </span>

            {/* Active indicator */}
            {selectedFrame.id === frame.id && (
              <motion.div
                layoutId="frame-active"
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{ border: '2px solid #D98FA8' }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Show more/less */}
      {FRAME_TEMPLATES.length > 6 && (
        <button
          className="btn-ghost font-cute text-xs w-full"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? '↑ Show less' : `+ ${FRAME_TEMPLATES.length - 6} more frames`}
        </button>
      )}

      {/* Color swatches */}
      <div>
        <p className="font-cute text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#A68B95' }}>
          Frame Color
        </p>
        <div className="flex gap-2 flex-wrap">
          {FRAME_COLORS.map((c) => (
            <motion.button
              key={c.id}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onColorChange(c.hex)}
              title={c.label}
              className="w-7 h-7 rounded-full transition-all"
              style={{
                background: c.hex,
                border: selectedColor === c.hex
                  ? '2.5px solid #D98FA8'
                  : c.hex === '#FFFFFF'
                    ? '1.5px solid #D8BFC7'
                    : '1.5px solid transparent',
                boxShadow: selectedColor === c.hex ? '0 2px 8px rgba(247,200,213,0.5)' : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
