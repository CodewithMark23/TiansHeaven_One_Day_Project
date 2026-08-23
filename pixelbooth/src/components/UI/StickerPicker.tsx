import { motion } from 'framer-motion';
import { STICKER_EMOJIS } from '../../types';

interface StickerPickerProps {
  onStickerAdd: (emoji: string) => void;
}

export default function StickerPicker({ onStickerAdd }: StickerPickerProps) {
  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
        Stickers
      </p>
      <div className="flex flex-wrap gap-1.5">
        {STICKER_EMOJIS.map((emoji, i) => (
          <motion.button
            key={emoji}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02, type: 'spring', stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.3, rotate: [-5, 5, -5, 0] }}
            whileTap={{ scale: 0.85 }}
            onClick={() => onStickerAdd(emoji)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-pink-50 transition-colors text-xl"
            title={`Add ${emoji}`}
            aria-label={`Add ${emoji} sticker`}
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
