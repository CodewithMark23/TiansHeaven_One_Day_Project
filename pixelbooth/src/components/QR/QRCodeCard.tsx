import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Download, Copy, Share2, Check, ExternalLink } from 'lucide-react';
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
    a.download = `snappy-qr-${Date.now()}.png`;
    a.href = qrDataUrl;
    a.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Snappy Memory 📸',
          text: 'Scan or open to view our photobooth memory! ♡',
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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card-white p-5 flex flex-col items-center gap-3 text-center w-full max-w-xs mx-auto"
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-pink-500 uppercase tracking-wider">
        <QrCode className="w-4 h-4" />
        Scan to view your memory ♡
      </div>

      {/* QR Code Container */}
      <div
        className="p-3 rounded-2xl bg-[#FFF9F0] border-2 border-pink-200 shadow-sm flex items-center justify-center relative group"
        style={{ width: 170, height: 170 }}
      >
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Memory QR Code"
            className="w-full h-full object-contain rounded-xl"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-pink-300">
            <QrCode className="w-12 h-12 animate-pulse" />
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-400">
        Share with your favorite person or scan from your phone ✨
      </p>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-1.5 w-full mt-1">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDownloadQR}
          className="btn-outline text-[11px] py-1.5 px-2 flex flex-col items-center gap-1"
          title="Download QR Code"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          className="btn-outline text-[11px] py-1.5 px-2 flex flex-col items-center gap-1"
          title="Copy Link"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleShare}
          className="btn-outline text-[11px] py-1.5 px-2 flex flex-col items-center gap-1"
          title="Share"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </motion.button>
      </div>

      {onOpenMemory && (
        <button
          onClick={onOpenMemory}
          className="text-xs text-purple-400 hover:text-purple-600 font-semibold flex items-center gap-1 mt-1 transition-colors"
        >
          <span>Open Memory Page</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}
