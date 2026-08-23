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

  useEffect(() => {
    // 1. Simulate printing animation
    const t1 = setTimeout(() => setPrinterShaking(true), 400);
    const t2 = setTimeout(() => setPrinterShaking(false), 1200);
    const t3 = setTimeout(() => setPhase('ready'), 2400);
    const t4 = setTimeout(() => setShowActions(true), 3000);

    // 2. Save memory in background and generate QR link
    if (stripDataUrl) {
      saveMemory(stripDataUrl, { caption, frame, frameColor }).then(({ url }) => {
        setMemoryUrl(url);
      });
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [stripDataUrl, caption, frame, frameColor]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `snappy-${Date.now()}.png`;
    link.href = stripDataUrl;
    link.click();
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Snappy Photo Strip</title>
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
      const file = new File([blob], 'snappy-strip.png', { type: 'image/png' });
      await navigator.share({
        files: [file],
        title: 'My Snappy Photo Strip 📸',
        url: memoryUrl || window.location.href,
      }).catch(() => {});
    } else {
      handleDownload();
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 py-2 text-center w-full max-w-sm mx-auto">
      {/* Printer */}
      <motion.div
        animate={printerShaking ? { x: [-2, 2, -2, 2, 0] } : {}}
        transition={{ duration: 0.15, repeat: printerShaking ? 4 : 0 }}
        className="flex flex-col items-center"
      >
        <div className="relative flex flex-col items-center" style={{ width: 140 }}>
          {/* Printer body */}
          <div
            className="rounded-2xl flex items-center justify-center relative"
            style={{
              width: 120,
              height: 65,
              background: 'linear-gradient(135deg,#FFE4EC,#FFD0DC)',
              border: '3px solid rgba(255,143,171,0.5)',
              boxShadow: '0 4px 16px rgba(255,143,171,0.3)',
              zIndex: 2,
            }}
          >
            <span style={{ fontSize: '2.3rem' }}>🖨️</span>
            {/* Paper slot */}
            <div
              style={{
                position: 'absolute',
                bottom: -3,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 70,
                height: 6,
                background: 'rgba(255,143,171,0.6)',
                borderRadius: 3,
              }}
            />
          </div>

          {/* Paper coming out */}
          <div
            style={{
              overflow: 'hidden',
              width: 75,
              maxHeight: phase === 'printing' ? 140 : 180,
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
                  border: '2px solid rgba(255,143,171,0.4)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
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
            className="flex flex-col items-center gap-1"
          >
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 rounded-full bg-pink-400"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
              <motion.div
                className="w-2 h-2 rounded-full bg-purple-400"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="w-2 h-2 rounded-full bg-pink-300"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
              />
            </div>
            <p className="font-display text-xl text-pink-400">Printing your memories… ♡</p>
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
            <p className="font-display text-2xl text-pink-500">Your photo is ready! ✨</p>
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
                className="btn-snappy justify-center py-2.5 text-sm"
              >
                <Download className="w-4 h-4" />
                Download
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

            <button className="btn-ghost w-full mt-1" onClick={onBack}>
              ← Make another
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
