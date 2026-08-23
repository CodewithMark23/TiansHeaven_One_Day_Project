import { motion } from 'framer-motion';
import { Heart, Wifi } from 'lucide-react';

interface WaitingRoomProps {
  hostName: string;
  boothCode: string;
}

const floatingEmojis = ['💕', '🌸', '✨', '💫', '🌟', '🎀', '💝', '🦋'];

export default function WaitingRoom({ hostName, boothCode }: WaitingRoomProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-6 py-8 px-4 text-center"
    >
      {/* Floating emoji decorations */}
      <div className="relative w-32 h-32">
        {floatingEmojis.map((emoji, i) => {
          const angle = (i / floatingEmojis.length) * 360;
          const radius = 52;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;
          return (
            <motion.span
              key={emoji}
              className="absolute text-xl select-none"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
              }}
              animate={{
                y: [0, -6, 0],
                rotate: [-5, 5, -5],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2 + i * 0.3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.2,
              }}
            >
              {emoji}
            </motion.span>
          );
        })}

        {/* Center heart */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #F7C8D5, #FADDE5)',
              boxShadow: '0 4px 20px rgba(247,200,213,0.4)',
              border: '1.5px solid rgba(242,175,194,0.6)',
            }}
          >
            <Heart className="w-8 h-8 text-pink-400 fill-pink-300" />
          </motion.div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-display text-2xl" style={{ color: '#D98FA8' }}>
          Waiting for your partner…
        </h2>
        <p className="font-cute text-sm" style={{ color: '#B8A0A8' }}>
          Share the code below with <span className="font-semibold" style={{ color: '#D98FA8' }}>{hostName.split(' ')[0] === hostName ? 'them' : 'your partner'}</span>
        </p>
      </div>

      {/* Live indicator */}
      <motion.div
        className="flex items-center gap-2 px-4 py-2 rounded-full font-cute"
        style={{ background: 'rgba(216, 245, 210, 0.4)', border: '1.5px solid rgba(201, 239, 200, 0.6)' }}
      >
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{ background: '#4A8C4A' }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <Wifi className="w-3.5 h-3.5" style={{ color: '#4A8C4A' }} />
        <span className="text-xs font-semibold" style={{ color: '#4A8C4A' }}>Booth is live</span>
      </motion.div>

      <p className="font-cute text-xs mt-2" style={{ color: '#C4A8B4' }}>
        Booth code: <span className="font-bold font-hand text-base" style={{ color: '#D98FA8' }}>{boothCode}</span>
      </p>
    </motion.div>
  );
}
