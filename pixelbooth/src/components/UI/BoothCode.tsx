import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check } from 'lucide-react';

interface BoothCodeProps {
  code: string;
  label?: string;
}

export default function BoothCode({ code, label = 'Your booth code' }: BoothCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Label — handwritten sticker style */}
      <div
        className="font-cute text-xs px-3 py-0.5"
        style={{
          color: '#D98FA8',
          background: 'rgba(250,221,229,0.5)',
          border: '1px solid rgba(216,191,199,0.5)',
          borderRadius: '9999px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        ♡ {label} ♡
      </div>

      {/* Code display card — clickable */}
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        className="cursor-pointer flex flex-col items-center gap-2 px-6 py-4"
        style={{
          background: 'linear-gradient(145deg, #FFF9E9, #FADDE5)',
          border: '1.5px solid rgba(216,191,199,0.55)',
          borderRadius: '1rem',
          boxShadow: '0 3px 14px rgba(247,200,213,0.2)',
        }}
        onClick={handleCopy}
        title="Click to copy"
      >
        {/* Code characters as parchment tiles */}
        <div className="flex gap-1.5">
          {code.split('').map((char, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 280 }}
              className="booth-code-tile"
            >
              {char}
            </motion.div>
          ))}
        </div>

        {/* Copy hint */}
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span
              key="copied"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="font-cute flex items-center gap-1 text-xs"
              style={{ color: '#4A8C4A' }}
            >
              <Check className="w-3 h-3" />
              Copied! ✿
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="font-cute flex items-center gap-1 text-xs"
              style={{ color: '#C4A8B4' }}
            >
              <Copy className="w-3 h-3" />
              tap to copy ♡
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
