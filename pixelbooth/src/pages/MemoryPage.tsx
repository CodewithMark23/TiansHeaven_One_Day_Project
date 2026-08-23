import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, QrCode, ArrowLeft, Heart, Sparkles, Camera } from 'lucide-react';
import { getMemory, type MemoryData } from '../lib/memory';
import QRCodeCard from '../components/QR/QRCodeCard';

export default function MemoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [memory, setMemory] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (id) {
      getMemory(id).then((data) => {
        setMemory(data);
        setLoading(false);
      });
    }
  }, [id]);

  const handleDownload = () => {
    if (!memory) return;
    const a = document.createElement('a');
    a.download = `memory-${memory.id}.png`;
    a.href = memory.imageUrl;
    a.click();
  };

  const handleShare = async () => {
    if (!memory) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tian\'s Heaven ♡ Photobooth Memory',
          text: memory.caption || 'A little memory worth keeping ♡',
          url: window.location.href,
        });
      } catch {
        // User dismissed
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard! 💕');
    }
  };

  if (loading) {
    return (
      <div className="bg-scrapbook min-h-dvh flex flex-col items-center justify-center p-4">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-5xl mb-4"
        >
          🌸
        </motion.div>
        <p className="font-display text-xl" style={{ color: '#D98FA8' }}>Unwrapping your memory… ♡</p>
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="bg-scrapbook min-h-dvh flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">💌</div>
        <h1 className="font-display text-3xl mb-2" style={{ color: '#D98FA8' }}>Memory Not Found</h1>
        <p className="font-cute text-sm mb-6 max-w-xs" style={{ color: '#B8A0A8' }}>
          This photobooth memory may have expired or the link is incorrect.
        </p>
        <button className="btn-scrapbook" onClick={() => navigate('/')}>
          <Camera className="w-4 h-4" />
          Create New Memory
        </button>
      </div>
    );
  }

  const formattedDate = new Date(memory.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-scrapbook-soft min-h-dvh flex flex-col items-center py-8 px-4 relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="blob w-72 h-72 -top-10 -left-10" style={{ background: '#F7C8D5' }} />
      <div className="blob w-64 h-64 -bottom-10 -right-10" style={{ background: '#DDF5F7' }} />

      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-6 z-10">
        <button className="btn-ghost font-cute" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" /> Tian's Heaven 📸
        </button>
        <span className="badge badge-pink font-cute">Public Memory</span>
      </div>

      {/* Memory Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-stationery p-6 w-full max-w-md flex flex-col items-center gap-5 z-10"
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Heart className="w-4 h-4 fill-pink-300 text-pink-400" />
            <span className="font-display text-lg" style={{ color: '#D98FA8' }}>
              A little memory worth keeping ♡
            </span>
            <Heart className="w-4 h-4 fill-pink-300 text-pink-400" />
          </div>
          <p className="font-cute text-xs" style={{ color: '#C4A8B4' }}>{formattedDate}</p>
        </div>

        {/* Photo Strip Image */}
        <div className="rounded-xl overflow-hidden shadow-md border-2 border-pink-100 max-w-[240px] w-full">
          <img
            src={memory.imageUrl}
            alt="Photobooth Memory"
            className="w-full h-auto block"
          />
        </div>

        {/* Caption */}
        {memory.caption && (
          <div className="px-4 py-2 rounded-full bg-pink-50/80 border border-pink-200/80 text-center max-w-xs">
            <p className="font-hand text-base font-semibold italic" style={{ color: '#7A5C6A' }}>
              "{memory.caption}"
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 w-full">
          <div className="grid grid-cols-2 gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleDownload}
              className="btn-scrapbook justify-center py-2.5 text-sm"
            >
              <Download className="w-4 h-4" />
              Download
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleShare}
              className="btn-outline justify-center py-2.5 text-sm"
            >
              <Share2 className="w-4 h-4" />
              Share
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowQR((v) => !v)}
            className="btn-outline justify-center py-2 text-xs font-cute"
          >
            <QrCode className="w-3.5 h-3.5" />
            {showQR ? 'Hide QR Code' : 'Generate QR Again'}
          </motion.button>
        </div>

        {/* QR Code section */}
        <AnimatePresence>
          {showQR && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full pt-2"
            >
              <QRCodeCard memoryUrl={window.location.href} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Your Own Link */}
        <div className="pt-3 border-t border-pink-100/80 w-full text-center">
          <button
            onClick={() => navigate('/')}
            className="font-cute text-xs flex items-center justify-center gap-1 mx-auto transition-colors"
            style={{ color: '#D98FA8' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Make your own photobooth strip with Tian's Heaven
          </button>
        </div>
      </motion.div>
    </div>
  );
}
