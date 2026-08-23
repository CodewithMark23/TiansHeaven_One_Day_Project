import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STICKER_CATEGORIES } from '../../types';
import type { StickerItem } from '../../types';
import { nanoid } from 'nanoid';
import { Upload } from 'lucide-react';

type Tab = 'cute' | 'funny' | 'seasonal';

interface StickerPaletteProps {
  onAdd: (sticker: StickerItem) => void;
}

export default function StickerPalette({ onAdd }: StickerPaletteProps) {
  const [tab, setTab] = useState<Tab>('cute');

  const handleEmoji = (emoji: string) => {
    onAdd({
      id: nanoid(),
      type: 'emoji',
      content: emoji,
      x: 35 + Math.random() * 30,
      y: 30 + Math.random() * 40,
      scale: 1,
      rotation: (Math.random() - 0.5) * 20,
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      onAdd({
        id: nanoid(),
        type: 'image',
        content: src,
        x: 30 + Math.random() * 40,
        y: 30 + Math.random() * 30,
        scale: 1.5,
        rotation: 0,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const stickers = STICKER_CATEGORIES[tab];

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {(['cute', 'funny', 'seasonal'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all capitalize ${
              tab === t
                ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-sm'
                : 'bg-white/60 text-gray-400 hover:bg-pink-50'
            }`}
          >
            {t === 'cute' ? '🌸 Cute' : t === 'funny' ? '😂 Funny' : '🎄 Seasonal'}
          </button>
        ))}
      </div>

      {/* Sticker grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="flex flex-wrap gap-1.5 mb-3"
        >
          {stickers.map((emoji, i) => (
            <motion.button
              key={emoji}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02, type: 'spring', stiffness: 300, damping: 18 }}
              whileHover={{ scale: 1.35, rotate: [-5, 5, 0] }}
              whileTap={{ scale: 0.85 }}
              onClick={() => handleEmoji(emoji)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-pink-50 text-xl transition-colors"
              title={`Add ${emoji}`}
            >
              {emoji}
            </motion.button>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Upload sticker */}
      <label className="btn-outline text-xs w-full cursor-pointer flex items-center justify-center gap-1.5 py-2">
        <Upload className="w-3.5 h-3.5" />
        Upload my own sticker
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </label>
    </div>
  );
}
