import { useRef } from 'react';
import { motion } from 'framer-motion';
import { FILTER_OPTIONS } from '../../types';
import type { FilterType } from '../../types';
import { getFilterCSS } from '../../lib/camera';

interface FilterSelectorProps {
  selected: FilterType;
  onChange: (filter: FilterType) => void;
}

export default function FilterSelector({ selected, onChange }: FilterSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full">
      <p className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-3">
        🎨 Filter
      </p>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {FILTER_OPTIONS.map((f) => (
          <motion.button
            key={f.id}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(f.id)}
            className={`filter-chip ${selected === f.id ? 'active' : ''}`}
          >
            {/* Preview swatch */}
            <div
              className="w-14 h-10 rounded-lg overflow-hidden relative flex-shrink-0"
              style={{
                border: selected === f.id
                  ? '2px solid #C9B1FF'
                  : '2px solid rgba(255,182,193,0.3)',
              }}
            >
              <div
                className="absolute inset-0 bg-gradient-to-br from-pink-200 via-purple-100 to-blue-200"
                style={{ filter: getFilterCSS(f.id) }}
              />
            </div>
            <span className="text-[10px] font-semibold" style={{ color: selected === f.id ? '#7c5cbf' : '#9b8fb0' }}>
              {f.emoji}
            </span>
            <span className="text-[9px] font-medium text-gray-400 -mt-1">{f.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
