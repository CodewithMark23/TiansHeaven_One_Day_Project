import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';

interface CaptureButtonProps {
  onClick: () => void;
  disabled?: boolean;
  photosLeft: number;
}

export default function CaptureButton({
  onClick,
  disabled = false,
  photosLeft,
}: CaptureButtonProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {/* Pulsing rings (only when enabled) */}
        {!disabled && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: '2px solid #ff8fab' }}
              animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: '2px solid #c9b1ff' }}
              animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut',
                delay: 0.5,
              }}
            />
          </>
        )}

        <motion.button
          whileHover={disabled ? {} : { scale: 1.08 }}
          whileTap={disabled ? {} : { scale: 0.92 }}
          onClick={onClick}
          disabled={disabled}
          className="shutter-btn relative z-10"
          aria-label="Take photo"
        >
          <Camera className="w-7 h-7 text-white" strokeWidth={2} />
        </motion.button>
      </div>

      <motion.span
        key={photosLeft}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-xs font-semibold text-gray-400"
      >
        {photosLeft > 0 ? `${photosLeft} photo${photosLeft !== 1 ? 's' : ''} left` : 'Strip full!'}
      </motion.span>
    </div>
  );
}
