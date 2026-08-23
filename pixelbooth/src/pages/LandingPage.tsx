import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { Camera, Heart, Sparkles, ArrowRight } from 'lucide-react';

const DECORATIVE_EMOJIS = [
  { emoji: '🌸', x: '8%', y: '15%', delay: 0 },
  { emoji: '✨', x: '85%', y: '10%', delay: 0.2 },
  { emoji: '💕', x: '92%', y: '40%', delay: 0.4 },
  { emoji: '🌷', x: '5%', y: '55%', delay: 0.6 },
  { emoji: '🎀', x: '90%', y: '70%', delay: 0.8 },
  { emoji: '🦋', x: '10%', y: '80%', delay: 1.0 },
  { emoji: '💫', x: '80%', y: '85%', delay: 0.3 },
  { emoji: '🌙', x: '15%', y: '30%', delay: 0.7 },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [hoveredMode, setHoveredMode] = useState<'solo' | 'ldr' | null>(null);

  return (
    <div className="min-h-dvh bg-booth-gradient relative overflow-hidden flex flex-col">
      {/* Decorative blobs */}
      <div
        className="blob w-96 h-96 -top-20 -left-20"
        style={{ background: '#ffb6c1' }}
      />
      <div
        className="blob w-80 h-80 -bottom-10 -right-10"
        style={{ background: '#c9b1ff' }}
      />
      <div
        className="blob w-64 h-64 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ background: '#b5ead7', opacity: 0.25 }}
      />

      {/* Floating decorative emojis */}
      {DECORATIVE_EMOJIS.map(({ emoji, x, y, delay }) => (
        <motion.span
          key={emoji + x}
          className="absolute text-2xl pointer-events-none select-none"
          style={{ left: x, top: y }}
          animate={{ y: [0, -12, 0], rotate: [-5, 5, -5] }}
          transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
        >
          {emoji}
        </motion.span>
      ))}

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-between p-6"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #ff8fab, #c9b1ff)' }}
          >
            <Camera className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-lg" style={{ color: '#d4607c' }}>
            PixelBooth
          </span>
        </div>
        <div className="badge badge-pink">✨ Beta</div>
      </motion.header>

      {/* Hero */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-12 text-center"
      >
        {/* Logo area */}
        <motion.div variants={itemVariants} className="mb-6">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="text-6xl mb-4 inline-block"
          >
            📸
          </motion.div>
          <h1 className="font-display text-5xl md:text-7xl mb-3" style={{ lineHeight: 1.1 }}>
            <span className="shimmer-text">PixelBooth</span>
          </h1>
          <p className="text-gray-500 text-lg md:text-xl max-w-md mx-auto leading-relaxed">
            Capture cute moments ✨ Share your memories 💕
            <br />
            <span className="text-sm text-gray-400">Solo or with your person, no matter the distance</span>
          </p>
        </motion.div>

        {/* Mode cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl mb-8"
        >
          {/* Solo Booth */}
          <motion.button
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onHoverStart={() => setHoveredMode('solo')}
            onHoverEnd={() => setHoveredMode(null)}
            onClick={() => navigate('/solo')}
            className="glass-card p-6 text-left group cursor-pointer"
            id="btn-solo-mode"
          >
            <div className="flex items-start gap-4">
              <motion.div
                animate={hoveredMode === 'solo' ? { rotate: [0, -10, 10, 0] } : {}}
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #ffdac1, #ff8fab)' }}
              >
                📷
              </motion.div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-700 text-lg">Solo Booth</h2>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                  Take photos by yourself. Add filters & stickers. Get your strip!
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-pink-400 text-sm font-semibold">
              Start shooting
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>

          {/* LDR Booth */}
          <motion.button
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onHoverStart={() => setHoveredMode('ldr')}
            onHoverEnd={() => setHoveredMode(null)}
            onClick={() => navigate('/ldr')}
            className="glass-card p-6 text-left group cursor-pointer"
            id="btn-ldr-mode"
            style={{ border: '1.5px solid rgba(201,177,255,0.5)' }}
          >
            <div className="flex items-start gap-4">
              <motion.div
                animate={hoveredMode === 'ldr' ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.6 }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #c9b1ff, #aed9e0)' }}
              >
                💌
              </motion.div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-700 text-lg">LDR Booth</h2>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                  Join the same booth with your partner. Take photos together from anywhere!
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-purple-400 text-sm font-semibold">
              <Heart className="w-3.5 h-3.5 fill-current" />
              Connect with partner
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>
        </motion.div>

        {/* Features */}
        <motion.div variants={itemVariants} className="flex flex-wrap gap-3 justify-center">
          {[
            { icon: '🎨', text: '7 Filters' },
            { icon: '✨', text: 'Stickers' },
            { icon: '🖼️', text: 'Download strip' },
            { icon: '💌', text: 'LDR real-time' },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className="badge badge-lavender flex items-center gap-1"
            >
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </motion.div>

        {/* Sparkles bottom */}
        <motion.div
          variants={itemVariants}
          className="mt-8 flex items-center gap-2 text-gray-300 text-sm"
        >
          <Sparkles className="w-4 h-4" />
          <span>Made with love for cute moments</span>
          <Sparkles className="w-4 h-4" />
        </motion.div>
      </motion.main>
    </div>
  );
}
