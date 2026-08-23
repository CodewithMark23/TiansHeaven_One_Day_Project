import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const TICKER = 'happy heart! ♥  cute memories ♥  snap & keep ♥  dreamy moments ♥  love & laughter ♥  ';

// Scrapbook decorative floaters — SVG-style unicode shapes, not emojis
const FLOATERS = [
  { char: '♡', x: '5%', y: '16%', delay: 0, duration: 5, size: '1.5rem', color: '#F2AFC2' },
  { char: '✿', x: '88%', y: '10%', delay: 0.5, duration: 6, size: '1.3rem', color: '#F2AFC2' },
  { char: '☆', x: '92%', y: '42%', delay: 0.9, duration: 4.5, size: '1.1rem', color: '#DDF5F7' },
  { char: '♡', x: '3%', y: '58%', delay: 1.3, duration: 5.5, size: '1.2rem', color: '#F7C8D5' },
  { char: '✿', x: '84%', y: '70%', delay: 0.2, duration: 4, size: '1.4rem', color: '#F2AFC2' },
  { char: '✿', x: '10%', y: '80%', delay: 0.7, duration: 6.5, size: '1.1rem', color: '#C9EFC8' },
  { char: '☆', x: '76%', y: '86%', delay: 1.1, duration: 5, size: '1rem', color: '#a4f7ffff' },
  { char: '♡', x: '20%', y: '25%', delay: 0.3, duration: 4.8, size: '0.9rem', color: '#F7C8D5' },
  { char: '✿', x: '48%', y: '10%', delay: 1, duration: 6, size: '1.3rem', color: '#D8F5D2' },
  { char: '☆', x: '63%', y: '15%', delay: 0.6, duration: 5.2, size: '1rem', color: '#DDF5F7' },
  { char: '☆', x: '15%', y: '42%', delay: 0.4, duration: 5.8, size: '1.2rem', color: '#DDF5F7' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 160, damping: 22 } },
} as const;

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-scrapbook min-h-dvh relative overflow-hidden flex flex-col">

      {/* Local styles for seamless ticker loop + Pinyon Script import */}
      <style>{`
        @keyframes ticker-scroll-ltr {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
        .ticker-loop {
          display: flex;
          width: max-content;
          animation: ticker-scroll-ltr 18s linear infinite;
          will-change: transform;
        }
        .ticker-loop-reverse {
          animation-direction: reverse;
        }
        .ticker-item {
          display: inline-block;
          white-space: nowrap;
          flex-shrink: 0;
          margin-right: 2rem;
        }
      `}</style>

      {/* Soft background blobs */}
      <div className="blob w-96 h-80 -top-20 -left-20" style={{ background: '#F7C8D5' }} />
      <div className="blob w-72 h-72 -bottom-10 -right-10" style={{ background: '#DDF5F7' }} />
      <div className="blob w-56 h-56 top-1/3 right-1/3" style={{ background: '#D8F5D2', opacity: 0.2 }} />

      {/* Floating decorative chars — boosted pop, same colors */}
      {FLOATERS.map(({ char, x, y, delay, duration, size, color }) => (
        <motion.span
          key={char + x}
          className="absolute pointer-events-none select-none font-cute"
          style={{
            left: x,
            top: y,
            fontSize: size,
            color,
            opacity: 0.95,
            fontWeight: 700,
            zIndex: 1,
            filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 10px ${color})`,
            textShadow: `0 0 8px ${color}, 0 0 14px ${color}`,
          }}
          animate={{ y: [0, -10, 0], rotate: [-5, 5, -5] }}
          transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
        >
          {char}
        </motion.span>
      ))}

      {/* Top ticker tape — seamless loop, light blue gradient */}
      <div
        className="w-full overflow-hidden py-1.5 relative z-10 my-2"
        style={{
          background: 'linear-gradient(90deg, rgba(221,245,247,0.25), rgba(200,238,242,0.5), rgba(221,245,247,0.25))',
          border: '2px solid rgba(200,238,242,0.5)',
        }}
      >
        <div className="ticker-loop">
          {[TICKER, TICKER, TICKER, TICKER].map((t, i) => (
            <span
              key={i}
              className="ticker-item font-cute text-xs"
              style={{ color: '#4A90A4', letterSpacing: '0.04em' }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Header nav */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-between px-6 pt-4 pb-2"
      >
        <div className="flex items-center gap-2">
          <span
            className="font-display text-xl"
            style={{
              color: '#faaec8ff',
              letterSpacing: '0.01em',
              WebkitTextStroke: '0.5px rgba(0, 0, 0, 0.21)',
            }}
          >
            Snappy
          </span>
        </div>
        <span className="sticker-label" style={{ transform: 'rotate(1.5deg)' }}>✿ photobooth</span>
      </motion.header>

      {/* Hero */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-10 text-center"
      >
        {/* Headline — Berkshire Swash display style */}
        <motion.div variants={itemVariants} className="mb-4">
          <div
            className="font-display shimmer-text"
            style={{
              fontSize: 'clamp(2.4rem, 9vw, 4.2rem)',
              lineHeight: 1.05,
              WebkitTextStroke: '0.5px rgba(0, 0, 0, 0.21)',
            }}
          >
            Photobooth
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span style={{ color: '#D8BFC7', fontSize: '0.85rem' }}>♡</span>
            <p
              className="font-cute text-sm"
              style={{ color: '#C4A8B4' }}
            >
              capture moments, keep them forever
            </p>
            <span style={{ color: '#D8BFC7', fontSize: '0.85rem' }}>♡</span>
          </div>
        </motion.div>

        {/* Mode cards — stationery style */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mb-8"
        >
          {/* Solo Booth card */}
          <motion.button
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/solo')}
            className="card-stationery p-6 text-left group cursor-pointer relative"
            id="btn-solo-mode"
            style={{
              background: 'linear-gradient(145deg, #FFFBF4, #FFF4F5)',
              border: '1.5px solid rgba(216,191,199,0.6)',
              boxShadow: '0 4px 22px rgba(247,200,213,0.22)',
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

            {/* Decorative flower sticker */}
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                top: '-10px',
                right: '16px',
                fontSize: '1.3rem',
                color: '#F2AFC2',
                filter: 'drop-shadow(0 1px 3px rgba(242,175,194,0.5))',
                zIndex: 20,
              }}
            >
              ✿
            </motion.span>

            {/* Washi tape accent */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-0.5 rounded-sm text-[10px] font-cute"
              style={{
                background: 'rgba(247,200,213,0.6)',
                color: '#D98FA8',
                border: '1px solid rgba(242,175,194,0.4)',
                letterSpacing: '0.06em',
              }}
            >
              ♡ solo
            </div>

            <div className="flex flex-col gap-3 mt-2 relative z-10">


              {/* Star row */}
              <div className="flex gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '14px',
                      lineHeight: 1,
                      color: '#F2AFC2',
                      filter: 'drop-shadow(0 1px 2px rgba(242,175,194,0.4))',
                    }}
                  >
                    ☆
                  </span>
                ))}
              </div>

              <div>
                <h2
                  className="font-display text-xl mb-1"
                  style={{ color: '#D98FA8' }}
                >
                  Solo Booth
                </h2>
                <p className="font-cute text-xs leading-relaxed" style={{ color: '#B8A0A8' }}>
                  A personal session just for you. Frames, filters, stickers & more ✿
                </p>
              </div>
              <div
                className="flex items-center gap-1 text-xs font-semibold font-cute"
                style={{ color: '#D98FA8' }}
              >
                Start shooting ♡
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </motion.button>

          {/* LDR Booth card */}
          {/* LDR Booth card */}
          <motion.button
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/ldr')}
            className="card-stationery p-6 text-left group cursor-pointer relative"
            id="btn-ldr-mode"
            style={{
              background: 'linear-gradient(145deg, #F5FFF7, #EEFBF2)',
              border: '1.5px solid rgba(180,220,190,0.6)',
              boxShadow: '0 4px 22px rgba(201,239,200,0.22)',
            }}
          >
            {/* Inner border — double stationery effect */}
            <div
              style={{
                position: 'absolute',
                inset: '5px',
                border: '1px solid rgba(180,220,190,0.3)',
                borderRadius: '0.9rem',
                pointerEvents: 'none',
              }}
            />

            {/* Decorative flower sticker */}
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
                zIndex: 20,
              }}
            >
              ✿
            </motion.span>

            {/* Washi tape accent */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-0.5 rounded-sm text-[10px] font-cute"
              style={{
                background: 'rgba(201,239,200,0.6)',
                color: '#4A8C6A',
                border: '1px solid rgba(180,220,190,0.4)',
                letterSpacing: '0.06em',
              }}
            >
              ♡ together
            </div>

            <div className="flex flex-col gap-3 mt-2 relative z-10">
              {/* Heart row */}
              <div className="flex gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '14px',
                      lineHeight: 1,
                      color: '#C9EFC8',
                      filter: 'drop-shadow(0 1px 2px rgba(201,239,200,0.4))',
                    }}
                  >
                    ♡
                  </span>
                ))}
              </div>

              <div>
                <h2
                  className="font-display text-xl mb-1"
                  style={{ color: '#4A8C6A' }}
                >
                  LDR Booth
                </h2>
                <p className="font-cute text-xs leading-relaxed" style={{ color: '#8ABAAA' }}>
                  YOU ♡ ME — share a code, take photos together from anywhere ☘
                </p>
              </div>
              <div
                className="flex items-center gap-1 text-xs font-semibold font-cute"
                style={{ color: '#4A7F90' }}
              >
                Connect together ♡
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </motion.button>
        </motion.div>

        {/* Feature sticker pills — washi tape style */}
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2 justify-center mb-6">
          {[
            { icon: '🖼️', text: '11 Frames', bg: 'rgba(247,200,213,0.6)', border: 'rgba(242,175,194,0.4)', color: '#D98FA8', rotate: -1.5 },
            { icon: '🎨', text: '10 Filters', bg: 'rgba(221,245,247,0.7)', border: 'rgba(200,238,242,0.5)', color: '#4A7F90', rotate: 1.2 },
            { icon: '✿', text: 'Stickers', bg: 'rgba(216,245,210,0.65)', border: 'rgba(201,239,200,0.5)', color: '#4A8C6A', rotate: -1 },
            { icon: '📸', text: '1–6 Photos', bg: 'rgba(247,200,213,0.6)', border: 'rgba(242,175,194,0.4)', color: '#D98FA8', rotate: 1.5 },
            { icon: '♡', text: 'LDR Realtime', bg: 'rgba(221,245,247,0.7)', border: 'rgba(200,238,242,0.5)', color: '#4A7F90', rotate: -1.2 },
            { icon: '🖨️', text: 'Print & Share', bg: 'rgba(216,245,210,0.65)', border: 'rgba(201,239,200,0.5)', color: '#4A8C6A', rotate: 1 },
          ].map(({ icon, text, bg, border, color, rotate }) => (
            <div
              key={text}
              className="flex items-center gap-1 py-1 px-2.5 rounded-sm"
              style={{
                background: bg,
                border: `1px solid ${border}`,
                transform: `rotate(${rotate}deg)`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <span>{icon}</span>
              <span className="font-cute text-xs" style={{ color }}>{text}</span>
            </div>
          ))}
        </motion.div>

        {/* Handwritten footer note */}
        <motion.div
          variants={itemVariants}
          className="font-hand text-xs"
          style={{ color: '#C4A8B4', fontSize: '0.9rem' }}
        >
          ✿ made with love for cute moments ✿
        </motion.div>
      </motion.main>

      {/* Bottom ticker — reverse direction, seamless loop */}
      <div
        className="w-full overflow-hidden py-1.5 relative z-10"
        style={{
          background: 'linear-gradient(90deg, rgba(221,245,247,0.25), rgba(200,238,242,0.5), rgba(221,245,247,0.25))',
          border: '1px solid rgba(200,238,242,0.5)',
          marginTop: '0.5rem',
          marginBottom: '0.5rem',
        }}
      >
        <div className="ticker-loop ticker-loop-reverse">
          {[TICKER, TICKER, TICKER, TICKER].map((t, i) => (
            <span
              key={i}
              className="ticker-item font-cute text-xs"
              style={{ color: '#4A90A4', letterSpacing: '0.04em' }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
