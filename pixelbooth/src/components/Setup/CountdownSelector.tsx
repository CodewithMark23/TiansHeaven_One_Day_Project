import { motion } from 'framer-motion';
import type { CountdownDuration } from '../../types';

interface CountdownSelectorProps {
  value: CountdownDuration;
  onChange: (v: CountdownDuration) => void;
}

const OPTIONS: { value: CountdownDuration; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 3, label: '3s' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
];

export default function CountdownSelector({ value, onChange }: CountdownSelectorProps) {
  return (
    <div>
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 px-5 py-1 rounded-sm text-xs font-cute"
        style={{
          background: 'rgba(201,239,200,0.6)',
          color: '#4A8C6A',
          border: '1px solid rgba(180,220,190,0.4)',
          letterSpacing: '0.06em',
          transform: 'translate(-50%, -20%) rotate(-1.5deg)',
          whiteSpace: 'nowrap',
        }}
      >
        Countdown
      </div>
      <div className="mb-3" />
      <div className="pill-selector">
        {OPTIONS.map((opt) => (
          <motion.button
            key={opt.value}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(opt.value)}
            className={`pill-option font-cute ${value === opt.value ? 'active' : ''}`}
          >
            {opt.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
