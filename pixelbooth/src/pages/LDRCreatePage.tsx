import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useLDRBooth } from '../hooks/useLDRBooth';
import BoothCode from '../components/UI/BoothCode';
import WaitingRoom from '../components/UI/WaitingRoom';

export default function LDRCreatePage() {
  const navigate = useNavigate();
  const { session, createBooth, isPartnerOnline } = useLDRBooth();
  const [hostName, setHostName] = useState('');
  const [nameSet, setNameSet] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!hostName.trim()) return;
    setIsCreating(true);
    await createBooth(hostName.trim());
    setIsCreating(false);
    setNameSet(true);
  };

  useEffect(() => {
    if (isPartnerOnline && session?.code) {
      setTimeout(() => {
        navigate(`/ldr/booth/${session.code}`, {
          state: { session, role: 'host', userName: hostName },
        });
      }, 800);
    }
  }, [isPartnerOnline, session, navigate, hostName]);

  if (!nameSet || !session) {
    return (
      <div className="bg-snappy min-h-dvh flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-white p-8 w-full max-w-md text-center"
        >
          <div className="text-4xl mb-4">🏠</div>
          <h1 className="font-display text-3xl mb-2" style={{ color: '#7c5cbf' }}>Create a Booth</h1>
          <p className="text-gray-400 text-sm mb-6">Set your name and share the code with your partner ✨</p>
          <input
            type="text"
            placeholder="Your name..."
            className="cute-input mb-4 text-center"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            autoFocus maxLength={20} id="input-host-name"
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-snappy w-full mb-3"
            onClick={handleCreate}
            disabled={!hostName.trim() || isCreating}
            id="btn-create-confirm"
          >
            {isCreating
              ? <motion.div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
              : '✨ Create Booth'
            }
          </motion.button>
          <button className="btn-ghost w-full" onClick={() => navigate('/ldr')}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-snappy min-h-dvh flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-white p-8 w-full max-w-md"
      >
        {isPartnerOnline ? (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-display text-2xl mb-2" style={{ color: '#C0304F' }}>Partner joined!</h2>
            <p className="text-gray-400 text-sm">Starting the booth…</p>
            <motion.div className="mt-4 h-1 rounded-full bg-gradient-to-r from-pink-300 to-purple-300"
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8 }}
              style={{ transformOrigin: 'left' }}
            />
          </motion.div>
        ) : (
          <div className="flex flex-col gap-6">
            <WaitingRoom hostName={hostName} boothCode={session.code} />
            <BoothCode code={session.code} label="Share this code" />
            <p className="text-center text-xs text-gray-400">
              Ask your partner to go to{' '}
              <span className="font-semibold text-purple-400">Snappy → LDR → Join with Code</span>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
