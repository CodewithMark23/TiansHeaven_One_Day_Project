import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Heart, Sparkles } from 'lucide-react';

const TICKER = '✨ make memories  💕 capture moments  🌸 feel the love  📸 snap snap snap  🎀 cute moments  ';

const FLOATERS = [
  { emoji: '🌸', x: '6%',  y: '18%', delay: 0,   duration: 5 },
  { emoji: '💕', x: '88%', y: '12%', delay: 0.4, duration: 6 },
  { emoji: '✨', x: '92%', y: '45%', delay: 0.8, duration: 4.5 },
  { emoji: '🦋', x: '4%',  y: '60%', delay: 1.2, duration: 5.5 },
  { emoji: '🎀', x: '85%', y: '72%', delay: 0.2, duration: 4 },
  { emoji: '🌷', x: '12%', y: '82%', delay: 0.6, duration: 6.5 },
  { emoji: '💫', x: '78%', y: '88%', delay: 1,   duration: 5 },
  { emoji: '⭐', x: '18%', y: '28%', delay: 0.3, duration: 4.8 },
  { emoji: '🌙', x: '50%', y: '6%',  delay: 0.9, duration: 6 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 180, damping: 20 } },
} as const;

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-snappy min-h-dvh relative overflow-hidden flex flex-col">
      {/* Decorative blobs */}
      <div className="blob w-80 h-80 -top-16 -left-16" style={{ background: '#FFB6C1' }} />
      <div className="blob w-64 h-64 -bottom-8 -right-8" style={{ background: '#C9B1FF' }} />
      <div className="blob w-56 h-56 top-1/3 right-1/4" style={{ background: '#B5EAD7', opacity: 0.2 }} />

      {/* Floating emojis */}
      {FLOATERS.map(({ emoji, x, y, delay, duration }) => (
        <motion.span
          key={emoji + x}
          className="absolute text-2xl pointer-events-none select-none"
          style={{ left: x, top: y }}
          animate={{ y: [0, -14, 0], rotate: [-6, 6, -6] }}
          transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
        >
          {emoji}
        </motion.span>
      ))}

      {/* Top ticker tape */}
      <div
        className="w-full overflow-hidden py-2 text-xs font-semibold text-white/80"
        style={{ background: 'rgba(255,143,171,0.5)', letterSpacing: '0.05em' }}
      >
        <div className="ticker-tape">
          {[TICKER, TICKER].map((t, i) => (
            <span key={i} style={{ paddingRight: '2rem' }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-between px-6 pt-4 pb-2"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="text-2xl"
          >
            📸
          </motion.div>
          <span className="font-display text-2xl" style={{ color: '#C0304F' }}>
            Snappy
          </span>
        </div>
        <div className="badge badge-pink">✨ New</div>
      </motion.header>

      {/* Hero */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-10 text-center"
      >
        {/* Camera icon */}
        <motion.div
          variants={itemVariants}
          animate={{ rotate: [0, 6, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="text-6xl mb-3 inline-block"
        >
          📸
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="font-display text-4xl md:text-6xl mb-3 leading-tight"
        >
          <span className="shimmer-text">Make memories,</span>
          <br />
          <span className="font-display text-4xl md:text-5xl" style={{ color: '#C0304F' }}>
            even miles apart.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-gray-500 text-base md:text-lg max-w-md mx-auto leading-relaxed mb-8"
        >
          A cute virtual photobooth for you, your friends, and your favorite person.
          <span className="block text-sm text-pink-300 mt-1">No app needed. Just vibes. ✨</span>
        </motion.p>

        {/* Mode cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mb-8"
        >
          {/* Solo Booth */}
          <motion.button
            whileHover={{ scale: 1.04, y: -5 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/solo')}
            className="card-white p-6 text-left group cursor-pointer"
            id="btn-solo-mode"
          >
            <div className="flex flex-col gap-3">
              <motion.div
                whileHover={{ rotate: [-8, 8, 0] }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: 'linear-gradient(135deg,#FFDAC1,#FF8FAB)' }}
              >
                📷
              </motion.div>
              <div>
                <h2 className="font-display text-xl text-gray-700 mb-1">Solo Booth</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Start a personal photobooth session. Filters, frames, stickers & more.
                </p>
              </div>
              <div className="flex items-center gap-1 text-pink-400 text-sm font-bold">
                Start shooting
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </motion.button>

          {/* LDR Booth */}
          <motion.button
            whileHover={{ scale: 1.04, y: -5 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/ldr')}
            className="card-white p-6 text-left group cursor-pointer"
            id="btn-ldr-mode"
            style={{ borderColor: 'rgba(201,177,255,0.5)' }}
          >
            <div className="flex flex-col gap-3">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: 'linear-gradient(135deg,#E8D5FF,#AED9E0)' }}
              >
                💕
              </motion.div>
              <div>
                <h2 className="font-display text-xl text-gray-700 mb-1">LDR Booth</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Create or join a shared photobooth with another person. From anywhere!
                </p>
              </div>
              <div className="flex items-center gap-1 text-purple-400 text-sm font-bold">
                <Heart className="w-3.5 h-3.5 fill-current" />
                Connect together
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </motion.button>
        </motion.div>

        {/* Feature pills */}
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2 justify-center mb-6">
          {[
            { icon: '🖼️', text: '11 Frames' },
            { icon: '🎨', text: '10 Filters' },
            { icon: '✨', text: 'Stickers' },
            { icon: '📸', text: '1-6 Photos' },
            { icon: '💌', text: 'LDR Realtime' },
            { icon: '🖨️', text: 'Print & Share' },
          ].map(({ icon, text }) => (
            <div key={text} className="badge badge-pink flex items-center gap-1 py-1 px-2.5">
              <span>{icon}</span>
              <span className="text-xs">{text}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex items-center gap-2 text-gray-300 text-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Made with love for cute moments
          <Sparkles className="w-3.5 h-3.5" />
        </motion.div>
      </motion.main>

      {/* Bottom ticker */}
      <div
        className="w-full overflow-hidden py-2 text-xs font-semibold text-white/80"
        style={{ background: 'rgba(255,143,171,0.5)', letterSpacing: '0.05em' }}
      >
        <div className="ticker-tape" style={{ animationDirection: 'reverse' }}>
          {[TICKER, TICKER].map((t, i) => (
            <span key={i} style={{ paddingRight: '2rem' }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
