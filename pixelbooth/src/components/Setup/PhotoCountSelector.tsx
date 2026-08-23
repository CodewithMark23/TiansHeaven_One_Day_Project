import { motion } from 'framer-motion';
import type { PhotoCount } from '../../types';

interface PhotoCountSelectorProps {
  value: PhotoCount;
  onChange: (v: PhotoCount) => void;
}

const OPTIONS: { value: PhotoCount; label: string; layout: string[] }[] = [
  { value: 1, label: '1 photo',  layout: ['■'] },
  { value: 3, label: '3 photos', layout: ['■','■','■'] },
  { value: 4, label: '4 photos', layout: ['■','■','■','■'] },
  { value: 6, label: '6 photos', layout: ['■','■','■','■','■','■'] },
];

export default function PhotoCountSelector({ value, onChange }: PhotoCountSelectorProps) {
  return (
    <div>
      <p className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-3">
        📸 Photos
      </p>
      <div className="grid grid-cols-4 gap-2">
        {OPTIONS.map((opt) => (
          <motion.button
            key={opt.value}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(opt.value)}
            className={`rounded-xl p-2 flex flex-col items-center gap-1.5 border-2 transition-all duration-200 ${
              value === opt.value
                ? 'border-purple-300 bg-purple-50'
                : 'border-pink-100 bg-white/60 hover:border-pink-200'
            }`}
          >
            {/* Mini strip preview */}
            <div className="flex flex-col gap-[2px] w-7">
              {opt.layout.map((_, i) => (
                <div
                  key={i}
                  className="w-full rounded-[2px]"
                  style={{
                    height: opt.value === 6 ? '7px' : opt.value === 1 ? '28px' : '10px',
                    background: value === opt.value
                      ? 'linear-gradient(135deg,#FF8FAB,#C9B1FF)'
                      : '#ffd6e0',
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] font-bold text-gray-500">{opt.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
