import { motion } from 'framer-motion';
import type { CountdownDuration } from '../../types';

interface CountdownSelectorProps {
  value: CountdownDuration;
  onChange: (v: CountdownDuration) => void;
}

const OPTIONS: { value: CountdownDuration; label: string; emoji: string }[] = [
  { value: 3,  label: '3s',  emoji: '⚡' },
  { value: 5,  label: '5s',  emoji: '✨' },
  { value: 10, label: '10s', emoji: '🌸' },
];

export default function CountdownSelector({ value, onChange }: CountdownSelectorProps) {
  return (
    <div>
      <p className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-3">
        ⏱ Countdown
      </p>
      <div className="pill-selector">
        {OPTIONS.map((opt) => (
          <motion.button
            key={opt.value}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(opt.value)}
            className={`pill-option ${value === opt.value ? 'active' : ''}`}
          >
            {opt.emoji} {opt.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
