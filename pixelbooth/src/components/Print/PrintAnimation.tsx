import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, Printer, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveMemory } from '../../lib/memory';
import QRCodeCard from '../QR/QRCodeCard';

interface PrintAnimationProps {
  stripDataUrl: string;
  onBack: () => void;
  caption?: string;
  frame?: string;
  frameColor?: string;
}

type Phase = 'printing' | 'ready';

// Floating hearts for printing animation
const HEARTS = ['♡', '✿', '♡', '☆', '♡'];

export default function PrintAnimation({
  stripDataUrl,
  onBack,
  caption,
  frame,
  frameColor,
}: PrintAnimationProps) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('printing');
  const [showActions, setShowActions] = useState(false);
  const [printerShaking, setPrinterShaking] = useState(false);
  const [memoryUrl, setMemoryUrl] = useState<string>('');
  const [showQR, setShowQR] = useState(true);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; char: string; x: number }[]>([]);

  useEffect(() => {
    const t1 = setTimeout(() => setPrinterShaking(true), 400);
    const t2 = setTimeout(() => setPrinterShaking(false), 1200);
    const t3 = setTimeout(() => setPhase('ready'), 2400);
    const t4 = setTimeout(() => setShowActions(true), 3000);

    // Emit floating hearts during printing
    let heartId = 0;
    const heartInterval = setInterval(() => {
      heartId++;
      const char = HEARTS[heartId % HEARTS.length];
      setFloatingHearts((prev) => [
        ...prev.slice(-6),
        { id: heartId, char, x: 30 + Math.random() * 40 },
      ]);
    }, 400);

    setTimeout(() => clearInterval(heartInterval), 2600);

    if (stripDataUrl) {
      saveMemory(stripDataUrl, { caption, frame, frameColor }).then(({ url }) => {
        setMemoryUrl(url);
      });
    }

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      clearInterval(heartInterval);
    };
  }, [stripDataUrl, caption, frame, frameColor]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `memory-${Date.now()}.png`;
    link.href = stripDataUrl;
    link.click();
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Photobooth Memory ♡</title>
      <style>body{margin:0;display:flex;justify-content:center;} img{max-height:100vh;}</style>
      </head><body onload="window.print();window.close()">
      <img src="${stripDataUrl}" />
      </body></html>
    `);
    win.document.close();
  };

  const handleShare = async () => {
    if (navigator.share) {
      const blob = await (await fetch(stripDataUrl)).blob();
      const file = new File([blob], 'memory-strip.png', { type: 'image/png' });
      await navigator.share({
        files: [file],
        title: 'Our Photobooth Memory ♡',
        url: memoryUrl || window.location.href,
      }).catch(() => {});
    } else {
      handleDownload();
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center w-full max-w-sm mx-auto relative">

      {/* Floating hearts animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 20 }}>
        <AnimatePresence>
          {floatingHearts.map((h) => (
            <motion.span
              key={h.id}
              initial={{ opacity: 1, y: 60, x: `${h.x}%` }}
              animate={{ opacity: 0, y: -20, x: `${h.x + (Math.random() - 0.5) * 10}%` }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                bottom: '120px',
                fontSize: '1rem',
                color: '#F7C8D5',
                fontFamily: 'var(--font-cute)',
              }}
            >
              {h.char}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Pastel Printer */}
      <motion.div
        animate={printerShaking ? { x: [-2, 2, -2, 2, 0] } : {}}
        transition={{ duration: 0.15, repeat: printerShaking ? 4 : 0 }}
        className="flex flex-col items-center relative z-10"
      >
        <div className="relative flex flex-col items-center" style={{ width: 140 }}>
          {/* Printer body — pastel pink rounded rectangle */}
          <div
            className="rounded-2xl flex items-center justify-center relative"
            style={{
              width: 124,
              height: 68,
              background: 'linear-gradient(135deg, #FADDE5, #F7C8D5)',
              border: '1.5px solid rgba(242,175,194,0.6)',
              boxShadow: '0 4px 18px rgba(247,200,213,0.35)',
              zIndex: 2,
            }}
          >
            {/* Printer label */}
            <div className="flex flex-col items-center gap-0.5">
              <span style={{ fontSize: '1.6rem' }}>🖨️</span>
              <span
                className="font-cute text-[9px]"
                style={{ color: '#D98FA8', letterSpacing: '0.05em' }}
              >
                printing…
              </span>
            </div>

            {/* Paper slot */}
            <div
              style={{
                position: 'absolute',
                bottom: -4,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 72,
                height: 6,
                background: 'rgba(242,175,194,0.55)',
                borderRadius: 3,
              }}
            />

            {/* Tiny heart decoration on printer */}
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 6,
                fontSize: '0.6rem',
                color: '#F2AFC2',
              }}
            >
              ♡
            </span>
          </div>

          {/* Paper coming out */}
          <div
            style={{
              overflow: 'hidden',
              width: 78,
              maxHeight: phase === 'printing' ? 140 : 185,
              transition: 'max-height 1.5s ease',
            }}
          >
            <motion.div
              initial={{ y: -200 }}
              animate={{ y: 0 }}
              transition={{ duration: 1.8, delay: 0.5, ease: [0.34, 1.2, 0.64, 1] }}
              style={{ paddingTop: 4 }}
            >
              <div
                className="rounded overflow-hidden"
                style={{
                  border: '1.5px solid rgba(216,191,199,0.5)',
                  boxShadow: '0 4px 14px rgba(247,200,213,0.2)',
                  background: 'white',
                }}
              >
                {stripDataUrl && (
                  <img
                    src={stripDataUrl}
                    alt="Photo strip"
                    style={{ width: '100%', display: 'block' }}
                  />
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Status text */}
      <AnimatePresence mode="wait">
        {phase === 'printing' ? (
          <motion.div
            key="printing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex items-center gap-1.5">
              {['#F7C8D5', '#DDF5F7', '#D8F5D2'].map((c, i) => (
                <motion.div
                  key={c}
                  className="w-2 h-2 rounded-full"
                  style={{ background: c }}
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.18 }}
                />
              ))}
            </div>
            <p className="font-display text-lg" style={{ color: '#D98FA8' }}>
              Printing your memories… ♡
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="flex flex-col items-center gap-1"
          >
            <motion.span
              className="text-3xl"
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              🎉
            </motion.span>
            <p className="font-display text-xl" style={{ color: '#D98FA8' }}>
              Your strip is ready! ✿
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code & Action buttons */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 w-full"
          >
            {/* QR Card */}
            {memoryUrl && showQR && (
              <QRCodeCard
                memoryUrl={memoryUrl}
                onOpenMemory={() => {
                  const id = memoryUrl.split('/').pop();
                  if (id) navigate(`/memory/${id}`);
                }}
              />
            )}

            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDownload}
                className="btn-scrapbook justify-center py-2.5 text-sm"
              >
                <Download className="w-4 h-4" />
                Download ♡
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handlePrint}
                className="btn-outline justify-center py-2.5 text-sm"
              >
                <Printer className="w-4 h-4" />
                Print
              </motion.button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleShare}
                className="btn-outline justify-center py-2.5 text-sm"
              >
                <Share2 className="w-4 h-4" />
                Share
              </motion.button>

              <button
                className="btn-outline justify-center py-2.5 text-sm"
                onClick={() => setShowQR((v) => !v)}
              >
                <QrCode className="w-4 h-4" />
                {showQR ? 'Hide QR' : 'Show QR'}
              </button>
            </div>

            <button
              className="btn-ghost w-full mt-1 font-cute"
              style={{ color: '#C4A8B4', fontSize: '0.85rem' }}
              onClick={onBack}
            >
              ← make another memory ♡
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
