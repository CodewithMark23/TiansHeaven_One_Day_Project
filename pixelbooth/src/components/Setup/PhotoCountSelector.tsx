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
      <p className="font-cute text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#D98FA8' }}>
        📸 Photos
      </p>
      <div className="grid grid-cols-4 gap-2">
        {OPTIONS.map((opt) => (
          <motion.button
            key={opt.value}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(opt.value)}
            className={`rounded-xl p-2 flex flex-col items-center gap-1.5 border-1.5 transition-all duration-200 ${
              value === opt.value
                ? 'border-pink-300 bg-pink-50/80'
                : 'border-pink-100/60 bg-white/70 hover:border-pink-200'
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
                      ? 'linear-gradient(135deg,#F7C8D5,#FADDE5)'
                      : '#FADDE5',
                  }}
                />
              ))}
            </div>
            <span className="font-cute text-[10px] font-bold" style={{ color: '#7A5C6A' }}>{opt.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
