import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Users } from 'lucide-react';

export default function LDRPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-ldr-gradient flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Blobs */}
      <div className="blob w-72 h-72 -top-10 -left-10" style={{ background: '#F7C8D5' }} />
      <div className="blob w-64 h-64 -bottom-10 -right-10" style={{ background: '#DDF5F7' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md"
      >
        <button
          className="btn-ghost mb-4 font-cute"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>

        <div className="card-stationery p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="text-4xl"
            >
              💌
            </motion.div>
          </div>

          <h1 className="font-display text-3xl mb-1" style={{ color: '#D98FA8' }}>
            LDR Booth
          </h1>
          <p className="font-cute text-sm mb-6 leading-relaxed" style={{ color: '#B8A0A8' }}>
            YOU ♡ ME — take photos together with your partner, no matter the distance 🌍💕
          </p>

          <div className="flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/ldr/create')}
              className="btn-scrapbook w-full justify-center"
              id="btn-create-booth"
            >
              <Heart className="w-4 h-4 fill-current" />
              Create a Booth
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/ldr/join')}
              className="btn-scrapbook-blue w-full justify-center font-body font-bold text-sm py-3 px-6 rounded-full border border-sky-200"
              id="btn-join-booth"
            >
              <Users className="w-4 h-4" />
              Join with Code
            </motion.button>
          </div>

          <p className="font-cute text-xs mt-6" style={{ color: '#C4A8B4' }}>
            ✿ Share a code · Take photos · Download your strip together ✿
          </p>
        </div>
      </motion.div>
    </div>
  );
}
