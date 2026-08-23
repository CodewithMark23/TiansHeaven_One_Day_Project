import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useLDRBooth } from '../hooks/useLDRBooth';

export default function LDRCreatePage() {
  const navigate = useNavigate();
  const { createBooth } = useLDRBooth();
  const [hostName, setHostName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!hostName.trim()) return;
    setIsCreating(true);
    const code = await createBooth(hostName.trim());
    setIsCreating(false);
    if (code) {
      navigate(`/ldr/booth/${code}`, {
        state: { role: 'host', userName: hostName.trim() },
      });
    }
  };

  return (
    <div className="bg-scrapbook min-h-dvh flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-stationery p-8 w-full max-w-md text-center"
      >
        <div className="text-4xl mb-4">🏠</div>
        <h1 className="font-display text-3xl mb-2" style={{ color: '#D98FA8' }}>Create a Booth</h1>
        <p className="font-cute text-sm mb-6" style={{ color: '#B8A0A8' }}>Set your name and start your shared photobooth ♡</p>
        <input
          type="text"
          placeholder="Your name..."
          className="cute-input mb-4 text-center font-cute"
          value={hostName}
          onChange={(e) => setHostName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          autoFocus
          maxLength={20}
          id="input-host-name"
        />
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="btn-scrapbook w-full mb-3"
          onClick={handleCreate}
          disabled={!hostName.trim() || isCreating}
          id="btn-create-confirm"
        >
          {isCreating ? (
            <motion.div
              className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full mx-auto"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            '✨ Create Booth'
          )}
        </motion.button>
        <button className="btn-ghost w-full font-cute" onClick={() => navigate('/ldr')}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </motion.div>
    </div>
  );
}
