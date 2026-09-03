import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import { STICKER_EMOJIS } from '../../types';

interface StickerPickerProps {
  onStickerAdd: (content: string, type?: 'emoji' | 'image') => void;
}

export default function StickerPicker({ onStickerAdd }: StickerPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onStickerAdd(dataUrl, 'image');
    };
    reader.readAsDataURL(file);

    // Reset so the same file can be re-uploaded if needed
    e.target.value = '';
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Stickers
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-500 hover:text-emerald-600 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STICKER_EMOJIS.map((emoji, i) => (
          <motion.button
            key={emoji}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02, type: 'spring', stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.3, rotate: [-5, 5, -5, 0] }}
            whileTap={{ scale: 0.85 }}
            onClick={() => onStickerAdd(emoji, 'emoji')}
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
