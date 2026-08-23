import { useRef } from 'react';
import { motion } from 'framer-motion';
import type { FilterType } from '../../types';
import { FILTER_OPTIONS } from '../../types';
import { getFilterCSS } from '../../lib/camera';

interface FilterSelectorProps {
  selected: FilterType;
  onChange: (filter: FilterType) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export default function FilterSelector({
  selected,
  onChange,
}: FilterSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
        Filter
      </p>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {FILTER_OPTIONS.map((f) => (
          <motion.button
            key={f.id}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(f.id)}
            className={`filter-chip ${selected === f.id ? 'active' : ''}`}
          >
            {/* Preview swatch */}
            <div
              className="w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 relative"
              style={{ border: selected === f.id ? '2px solid #c9b1ff' : '2px solid transparent' }}
            >
              <div
                className="absolute inset-0 bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200"
                style={{ filter: getFilterCSS(f.id) }}
              />
              {selected === f.id && (
                <motion.div
                  layoutId="filter-selected"
                  className="absolute inset-0 bg-purple-300/20"
                />
              )}
            </div>
            <span
              className="text-xs font-medium"
              style={{
                color: selected === f.id ? '#7c5cbf' : '#9b8fb0',
              }}
            >
              {f.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
