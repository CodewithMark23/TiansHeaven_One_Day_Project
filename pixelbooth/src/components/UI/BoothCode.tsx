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
      <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
        {label}
      </p>

      <motion.div
        whileHover={{ scale: 1.02 }}
        className="glass-card-lavender px-8 py-4 flex flex-col items-center gap-1 cursor-pointer"
        onClick={handleCopy}
        title="Click to copy"
      >
        <span className="booth-code">{code}</span>
        <div className="flex items-center gap-1.5 mt-1">
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="copied"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-1 text-xs text-mint-deep font-medium"
                style={{ color: '#2d8c6a' }}
              >
                <Check className="w-3 h-3" />
                Copied!
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-1 text-xs text-gray-400"
              >
                <Copy className="w-3 h-3" />
                Click to copy
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Code character display */}
      <div className="flex gap-1.5">
        {code.split('').map((char, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 300 }}
            className="w-9 h-10 flex items-center justify-center rounded-lg font-bold text-gray-600 text-sm"
            style={{
              background: 'rgba(201, 177, 255, 0.15)',
              border: '1.5px solid rgba(201, 177, 255, 0.4)',
            }}
          >
            {char}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
