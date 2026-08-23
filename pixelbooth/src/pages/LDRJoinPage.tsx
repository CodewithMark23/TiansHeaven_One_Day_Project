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
    if (code.length !== 6 || !guestName.trim()) return;
    setIsJoining(true);
    const success = await joinBooth(code, guestName.trim());
    if (success) {
      navigate(`/ldr/booth/${code}`, {
        state: { role: 'guest', userName: guestName },
      });
    }
    setIsJoining(false);
  };

  return (
    <div className="min-h-dvh bg-ldr-gradient flex items-center justify-center p-4">
      <div className="blob w-64 h-64 -top-10 -right-10" style={{ background: '#aed9e0' }} />
      <div className="blob w-72 h-72 -bottom-10 -left-10" style={{ background: '#c9b1ff' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass-card p-8 w-full max-w-md"
      >
        <button className="btn-ghost mb-4" onClick={() => navigate('/ldr')}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔑</div>
          <h1 className="font-display text-3xl mb-1" style={{ color: '#7c5cbf' }}>
            Join a Booth
          </h1>
          <p className="text-gray-400 text-sm">
            Enter the code your partner shared with you 💌
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Name input */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
              Your name
            </label>
            <input
              type="text"
              placeholder="e.g. Luna ✨"
              className="cute-input"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              maxLength={20}
              id="input-guest-name"
            />
          </div>

          {/* Code input */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
              Booth code
            </label>
            <div className="flex gap-1.5 justify-center mb-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="w-10 h-12 flex items-center justify-center rounded-xl font-bold text-gray-600 text-lg"
                  style={{
                    background: code[i]
                      ? 'rgba(201,177,255,0.25)'
                      : 'rgba(255,255,255,0.6)',
                    border: code[i]
                      ? '2px solid rgba(201,177,255,0.6)'
                      : '2px solid rgba(209,213,219,0.5)',
                    transition: 'all 0.2s',
                  }}
                >
                  {code[i] || ''}
                </div>
              ))}
            </div>
            <input
              type="text"
              placeholder="e.g. ABCD12"
              className="cute-input text-center tracking-[0.3em] font-bold uppercase"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
              maxLength={6}
              id="input-booth-code"
            />
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
              style={{ background: 'rgba(255,143,171,0.15)', color: '#d4607c' }}
            >
              😕 {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-primary w-full"
            onClick={handleJoin}
            disabled={code.length !== 6 || !guestName.trim() || isJoining}
            id="btn-join-confirm"
          >
            {isJoining ? (
              <motion.div
                className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              '💌 Join Booth'
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
