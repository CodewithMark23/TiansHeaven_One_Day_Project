import { motion, AnimatePresence } from 'framer-motion';

interface CountdownTimerProps {
  count: number;
  isVisible: boolean;
}

const colors = ['#ff8fab', '#c9b1ff', '#b5ead7', '#ffdac1'];

export default function CountdownTimer({ count, isVisible }: CountdownTimerProps) {
  const label = count > 0 ? String(count) : '📸';
  const color = colors[(3 - count) % colors.length] ?? colors[0];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="countdown-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{ borderRadius: '1.5rem' }}
        >
          {/* Dimmed background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'rgba(0,0,0,0.25)',
              borderRadius: '1.5rem',
            }}
          />

          {/* Pulse rings */}
          <motion.div
            key={`ring-${count}`}
            initial={{ scale: 0.6, opacity: 0.8 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="absolute rounded-full"
            style={{
              width: 100,
              height: 100,
              border: `3px solid ${color}`,
            }}
          />

          {/* Number */}
          <AnimatePresence mode="wait">
            <motion.div
              key={count}
              initial={{ scale: 0.3, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.6, opacity: 0, y: -20 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
              }}
              className="relative z-10 flex flex-col items-center"
            >
              <span
                className="font-display text-white drop-shadow-lg select-none"
                style={{
                  fontSize: count === 0 ? '4rem' : '7rem',
                  lineHeight: 1,
                  textShadow: `0 0 40px ${color}`,
                }}
              >
                {label}
              </span>
              {count > 0 && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-white/80 text-sm font-semibold tracking-widest uppercase"
                >
                  Get ready!
                </motion.span>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
