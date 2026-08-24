import { motion } from 'framer-motion';
import type { PhotoLayoutId, PhotoLayoutOption } from '../../types';
import { PHOTO_LAYOUT_OPTIONS } from '../../types';

interface PhotoLayoutSelectorProps {
  selectedId: PhotoLayoutId;
  onChange: (layout: PhotoLayoutOption) => void;
}

export default function PhotoLayoutSelector({ selectedId, onChange }: PhotoLayoutSelectorProps) {
  return (
    <div>
      <p className="font-cute text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#D98FA8' }}>
        🖼️ Photo Layout (6 Options)
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {PHOTO_LAYOUT_OPTIONS.map((layout) => {
          const isSelected = selectedId === layout.id;
          return (
            <motion.button
              key={layout.id}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(layout)}
              className={`rounded-xl p-3 flex flex-col items-center justify-between text-center border-1.5 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-pink-400 bg-pink-50/90 shadow-sm'
                  : 'border-pink-100/70 bg-white/80 hover:border-pink-200'
              }`}
            >
              {/* Mini visual frame preview */}
              <div
                className="rounded-md p-1.5 mb-2 bg-pink-100/40 border border-pink-200/50 flex items-center justify-center"
                style={{ width: '80px', height: '60px' }}
              >
                <div
                  className="grid gap-[2px] w-full h-full"
                  style={{
                    gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: layout.photoCount }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-[2px] w-full h-full"
                      style={{
                        background: isSelected
                          ? 'linear-gradient(135deg, #F2AFC2, #F7C8D5)'
                          : '#FADDE5',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="font-cute text-xs font-bold block" style={{ color: '#7A5C6A' }}>
                  {layout.emoji} {layout.label}
                </span>
                <span className="font-cute text-[10px] text-pink-400 block mt-0.5">
                  {layout.photoCount} {layout.photoCount === 1 ? 'pose' : 'poses'}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
