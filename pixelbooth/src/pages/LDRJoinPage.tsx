import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useLDRBooth } from '../hooks/useLDRBooth';

export default function LDRJoinPage() {
  const navigate = useNavigate();
  const { joinBooth, error } = useLDRBooth();
  const [code, setCode] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleCodeChange = (val: string) => {
    setCode(val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
  };

  const handleJoin = async () => {
    if (!code || code.length !== 6 || !guestName.trim()) return;
    setIsJoining(true);
    const session = await joinBooth(code, guestName.trim());
    setIsJoining(false);
    if (session) {
      navigate(`/ldr/booth/${code}`, { state: { role: 'guest', userName: guestName.trim() } });
    }
  };

  return (
    <div className="bg-scrapbook min-h-dvh flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-stationery p-8 w-full max-w-md text-center"
      >
        <div className="text-4xl mb-4">🔑</div>
        <h1 className="font-display text-3xl mb-2" style={{ color: '#D98FA8' }}>Join a Booth</h1>
        <p className="font-cute text-sm mb-6" style={{ color: '#B8A0A8' }}>Enter the 6-digit code from your partner! 💌</p>

        <div className="flex flex-col gap-4 mb-6">
          <input
            type="text"
            placeholder="Your name..."
            className="cute-input text-center font-cute"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            maxLength={20}
            id="input-guest-name"
          />
          <input
            type="text"
            placeholder="BOOTH CODE"
            className="cute-input text-center font-hand font-bold tracking-[0.35em] text-xl"
            style={{ color: '#D98FA8' }}
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            maxLength={6}
            id="input-booth-code"
          />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="badge badge-pink mb-4 w-full justify-center py-1.5 font-cute"
          >
            😕 {error}
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="btn-scrapbook w-full mb-3"
          onClick={handleJoin}
          disabled={code.length !== 6 || !guestName.trim() || isJoining}
          id="btn-join-confirm"
        >
          {isJoining
            ? <motion.div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full mx-auto" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
            : '♡ Join Booth'
          }
        </motion.button>
        <button className="btn-ghost w-full font-cute" onClick={() => navigate('/ldr')}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </motion.div>
    </div>
  );
}
