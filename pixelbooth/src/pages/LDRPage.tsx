import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Users } from 'lucide-react';

export default function LDRPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-ldr-gradient flex flex-col items-center justify-center p-4">
      {/* Blobs */}
      <div className="blob w-72 h-72 -top-10 -left-10" style={{ background: '#c9b1ff' }} />
      <div className="blob w-64 h-64 -bottom-10 -right-10" style={{ background: '#ffdac1' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md"
      >
        <button
          className="btn-ghost mb-4"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>

        <div className="glass-card p-8 text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-5xl mb-4"
          >
            💌
          </motion.div>
          <h1 className="font-display text-3xl mb-2" style={{ color: '#7c5cbf' }}>
            LDR Booth
          </h1>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Take photos together with your partner, no matter the distance 🌍💕
          </p>

          <div className="flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/ldr/create')}
              className="btn-primary w-full justify-center"
              id="btn-create-booth"
            >
              <Heart className="w-4 h-4 fill-white" />
              Create a Booth
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/ldr/join')}
              className="btn-secondary w-full justify-center"
              id="btn-join-booth"
            >
              <Users className="w-4 h-4" />
              Join with Code
            </motion.button>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            ✨ Share a code · Take photos · Download your strip together
          </p>
        </div>
      </motion.div>
    </div>
  );
}
