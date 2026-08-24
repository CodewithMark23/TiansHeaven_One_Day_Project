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
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 px-5 py-1 rounded-sm text-xs font-cute"
        style={{
          background: 'rgba(230,200,90,0.5)',
          color: '#9A7B1F',
          border: '1px solid rgba(230,200,90,0.5)',
          letterSpacing: '0.06em',
          transform: 'translate(-50%, -20%) rotate(-1.5deg)',
          whiteSpace: 'nowrap',
        }}
      >
        Filter
      </div>
      <div className="mb-3" />
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
                  ? '1.5px solid #D98FA8'
                  : '1.5px solid rgba(216,191,199,0.3)',
              }}
            >
              <div
                className="absolute inset-0 bg-gradient-to-br from-pink-200 via-purple-100 to-blue-200"
                style={{ filter: getFilterCSS(f.id) }}
              />
            </div>
            <span className="font-cute text-[10px] font-semibold" style={{ color: selected === f.id ? '#D98FA8' : '#A68B95' }}>
              {f.emoji}
            </span>
            <span className="font-cute text-[9px] font-medium text-gray-400 -mt-1">{f.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
