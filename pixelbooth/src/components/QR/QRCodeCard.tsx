import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Copy, Share2, Check, ExternalLink } from 'lucide-react';
import { generateQRCode } from '../../lib/memory';

interface QRCodeCardProps {
  memoryUrl: string;
  onOpenMemory?: () => void;
}

export default function QRCodeCard({ memoryUrl, onOpenMemory }: QRCodeCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (memoryUrl) {
      generateQRCode(memoryUrl).then(setQrDataUrl);
    }
  }, [memoryUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(memoryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.download = `memory-qr-${Date.now()}.png`;
    a.href = qrDataUrl;
    a.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Our Photobooth Memory ♡',
          text: 'Scan or open to view our scrapbook memory!',
          url: memoryUrl,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 20 }}
      className="flex flex-col items-center gap-0 w-full max-w-xs mx-auto"
      style={{
        background: 'linear-gradient(145deg, #FFF9E9, #FADDE5)',
        border: '1.5px solid rgba(216,191,199,0.6)',
        borderRadius: '1.25rem',
        padding: '1.25rem',
        boxShadow: '0 4px 22px rgba(247,200,213,0.22)',
        position: 'relative',
      }}
    >
      {/* Inner border — double stationery effect */}
      <div
        style={{
          position: 'absolute',
          inset: '5px',
          border: '1px solid rgba(216,191,199,0.3)',
          borderRadius: '0.9rem',
          pointerEvents: 'none',
        }}
      />

      {/* Decorative flower sticker top-right */}
      <motion.span
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '-10px',
          right: '16px',
          fontSize: '1.3rem',
          color: '#C9EFC8',
          filter: 'drop-shadow(0 1px 3px rgba(201,239,200,0.5))',
        }}
      >
        ✿
      </motion.span>

      {/* "Scan Here ♡" header — matching reference */}
      <div className="flex items-center gap-2 mb-3 relative z-10">
        {/* Heart box — mint green, matching reference */}
        <div
          style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, #D8F5D2, #C9EFC8)',
            border: '1px solid rgba(201,239,200,0.7)',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
          }}
        >
          ♡
        </div>
        <span
          className="font-display"
          style={{
            fontSize: '1.7rem',
            color: '#D98FA8',
            letterSpacing: '0.01em',
            lineHeight: 1,
          }}
        >
          Scan Here ♡
        </span>
      </div>

      {/* Dots row — like the reference image */}
      <div className="flex gap-1.5 mb-3 relative z-10">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'rgba(216,191,199,0.55)',
            }}
          />
        ))}
      </div>

      {/* QR Code container — cream paper box with blush border */}
      <div
        style={{
          width: '168px',
          height: '168px',
          background: '#FFF9E9',
          border: '1.5px solid rgba(247,200,213,0.6)',
          borderRadius: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px',
          boxShadow: '0 2px 10px rgba(247,200,213,0.2)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Memory QR Code"
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ fontSize: '2rem' }}
            >
              ♡
            </motion.span>
            <span className="font-cute text-xs" style={{ color: '#D8BFC7' }}>generating…</span>
          </div>
        )}
      </div>

      {/* Tiny stamp / label decoration — like "Doucellie speaking" in reference */}
      <div
        className="font-hand text-[10px] mt-2 mb-3 relative z-10"
        style={{
          color: '#D98FA8',
          background: 'rgba(255,255,255,0.7)',
          border: '1px solid rgba(216,191,199,0.45)',
          borderRadius: '9999px',
          padding: '0.15rem 0.75rem',
          letterSpacing: '0.04em',
          fontStyle: 'italic',
        }}
      >
        scan to view your memory ♡
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-1.5 w-full relative z-10">
        <motion.button
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDownloadQR}
          className="btn-outline text-[11px] py-1.5 px-2 flex flex-col items-center gap-1"
          title="Download QR Code"
          style={{ borderRadius: '0.65rem', fontSize: '10px' }}
        >
          <Download className="w-3.5 h-3.5" />
          <span className="font-cute">Download</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          className="btn-outline text-[11px] py-1.5 px-2 flex flex-col items-center gap-1"
          title="Copy Link"
          style={{ borderRadius: '0.65rem', fontSize: '10px' }}
        >
          {copied
            ? <Check className="w-3.5 h-3.5" style={{ color: '#4A8C4A' }} />
            : <Copy className="w-3.5 h-3.5" />
          }
          <span className="font-cute">{copied ? 'Copied!' : 'Copy'}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleShare}
          className="btn-outline text-[11px] py-1.5 px-2 flex flex-col items-center gap-1"
          title="Share"
          style={{ borderRadius: '0.65rem', fontSize: '10px' }}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="font-cute">Share</span>
        </motion.button>
      </div>

      {onOpenMemory && (
        <button
          onClick={onOpenMemory}
          className="font-cute text-xs flex items-center gap-1 mt-2 relative z-10 transition-colors"
          style={{ color: '#D98FA8' }}
        >
          <span>Open Memory Page</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}
