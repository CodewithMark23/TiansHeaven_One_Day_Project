import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import type {
  BoothStep, CapturedPhoto, StickerItem,
  CountdownDuration, PhotoCount, FilterType, FrameTemplate,
} from '../types';
import { DEFAULT_BOOTH_CONFIG, FRAME_TEMPLATES } from '../types';

import CountdownSelector from '../components/Setup/CountdownSelector';
import FrameSelector from '../components/Setup/FrameSelector';
import PhotoCountSelector from '../components/Setup/PhotoCountSelector';
import FilterSelector from '../components/Setup/FilterSelector';
import CameraSession from '../components/Camera/CameraSession';
import RetakeReview from '../components/Retake/RetakeReview';
import StripCanvas from '../components/Strip/StripCanvas';
import type { StripCanvasRef } from '../components/Strip/StripCanvas';
import PrintAnimation from '../components/Print/PrintAnimation';

// ─── Step metadata ─────────────────────────────────────────────────────────────
const STEPS: { key: BoothStep; label: string; emoji: string }[] = [
  { key: 'setup',     label: 'Setup',    emoji: '⚙️' },
  { key: 'camera',    label: 'Camera',   emoji: '📷' },
  { key: 'retake',    label: 'Review',   emoji: '👀' },
  { key: 'customize', label: 'Style',    emoji: '✨' },
  { key: 'print',     label: 'Print',    emoji: '🖨️' },
];

const STEP_ORDER: BoothStep[] = ['setup', 'camera', 'retake', 'customize', 'print'];

function stepIndex(step: BoothStep) { return STEP_ORDER.indexOf(step); }

// ─── Page transitions ──────────────────────────────────────────────────────────
const pageVariants = {
  enter:  { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit:   { opacity: 0, x: -40 },
};

export default function SoloBoothPage() {
  const navigate = useNavigate();

  // ── Booth config ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<BoothStep>('setup');
  const [userName, setUserName] = useState('');
  const [nameSet, setNameSet] = useState(false);

  const [countdown, setCountdown] = useState<CountdownDuration>(DEFAULT_BOOTH_CONFIG.countdown);
  const [frameTemplate, setFrameTemplate] = useState<FrameTemplate>(FRAME_TEMPLATES[0]);
  const [frameColor, setFrameColor] = useState('#FFFFFF');
  const [filter, setFilter] = useState<FilterType>('original');
  const [photoCount, setPhotoCount] = useState<PhotoCount>(4);

  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [caption, setCaption] = useState('');
  const [stripDataUrl, setStripDataUrl] = useState('');

  const stripRef = useRef<StripCanvasRef>(null);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = () => {
    const idx = stepIndex(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  };
  const goBack = () => {
    const idx = stepIndex(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
    else navigate('/');
  };

  const handleCameraComplete = useCallback((captured: CapturedPhoto[]) => {
    setPhotos(captured);
    setStep('retake');
  }, []);

  const handleRetakeConfirm = useCallback(() => {
    setStep('customize');
  }, []);

  const handleRetakeUpdate = useCallback((updated: CapturedPhoto[]) => {
    setPhotos(updated);
    if (updated.length === 0) setStep('camera'); // retake all → back to camera
  }, []);

  const handleGenerateStrip = useCallback(async () => {
    if (!stripRef.current) return;
    const dataUrl = await stripRef.current.getDataUrl();
    setStripDataUrl(dataUrl);
    setStep('print');
  }, []);

  // ── Name gate ─────────────────────────────────────────────────────────────
  if (!nameSet) {
    return (
      <div className="bg-scrapbook min-h-dvh flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-stationery p-8 w-full max-w-sm text-center"
        >
          <div className="text-5xl mb-4">📷</div>
          <h1 className="font-display text-3xl mb-1" style={{ color: '#D98FA8' }}>Solo Booth</h1>
          <p className="font-cute text-sm mb-6" style={{ color: '#B8A0A8' }}>What should we call you? 🌸</p>
          <input
            type="text"
            placeholder="Your name..."
            className="cute-input mb-4 text-center font-cute"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && userName.trim()) setNameSet(true); }}
            autoFocus
            maxLength={20}
            id="input-user-name"
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-scrapbook w-full"
            onClick={() => setNameSet(true)}
            disabled={!userName.trim()}
            id="btn-enter-booth"
          >
            Enter Booth ♡
          </motion.button>
          <button className="btn-ghost mt-3 w-full font-cute" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </motion.div>
      </div>
    );
  }

  const currentIdx = stepIndex(step);

  return (
    <div className="bg-scrapbook-soft min-h-dvh flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between"
        style={{ background: 'rgba(255,249,233,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(216,191,199,0.3)' }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={goBack}
          className="btn-ghost font-cute"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 'setup' ? 'Home' : 'Back'}
        </motion.button>

        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`step-dot ${
                i === currentIdx ? 'active' : i < currentIdx ? 'done' : ''
              }`}
            />
          ))}
        </div>

        <div className="badge badge-pink">{STEPS[currentIdx].emoji} {STEPS[currentIdx].label}</div>
      </header>

      {/* Step content */}
      <div className="flex-1 container-snappy py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >

            {/* ── STEP 0: Setup ───────────────────────────────────────────────── */}
            {step === 'setup' && (
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <h1 className="font-display text-3xl mb-1" style={{ color: '#D98FA8' }}>
                    Booth Setup 🎀
                  </h1>
                  <p className="font-cute text-sm" style={{ color: '#B8A0A8' }}>
                    Hey {userName}! Customize your session before we start. ♡
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left column */}
                  <div className="flex flex-col gap-4">
                    <div className="card p-5">
                      <CountdownSelector value={countdown} onChange={setCountdown} />
                    </div>
                    <div className="card p-5">
                      <PhotoCountSelector value={photoCount} onChange={setPhotoCount} />
                    </div>
                    <div className="card p-5">
                      <FilterSelector selected={filter} onChange={setFilter} />
                    </div>
                  </div>

                  {/* Right column — frame */}
                  <div className="card p-5">
                    <FrameSelector
                      selectedFrame={frameTemplate}
                      selectedColor={frameColor}
                      onFrameChange={setFrameTemplate}
                      onColorChange={setFrameColor}
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-scrapbook w-full mt-6"
                  onClick={goNext}
                >
                  Start Session 📸
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            )}

            {/* ── STEP 1: Camera ──────────────────────────────────────────────── */}
            {step === 'camera' && (
              <CameraSession
                filter={filter}
                countdown={countdown}
                photoCount={photoCount}
                userName={userName}
                onComplete={handleCameraComplete}
                onCancel={() => setStep('setup')}
              />
            )}

            {/* ── STEP 2: Retake ──────────────────────────────────────────────── */}
            {step === 'retake' && (
              <RetakeReview
                photos={photos}
                filter={filter}
                countdown={countdown}
                onUpdate={handleRetakeUpdate}
                onConfirm={handleRetakeConfirm}
              />
            )}

            {/* ── STEP 3: Customize ───────────────────────────────────────────── */}
            {step === 'customize' && (
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-6">
                  <h1 className="font-display text-3xl mb-1" style={{ color: '#C0304F' }}>
                    Style your strip ✨
                  </h1>
                  <p className="text-gray-400 text-sm">
                    Add stickers, a caption, and pick your frame color!
                  </p>
                </div>

                <div className="card p-5">
                  <StripCanvas
                    ref={stripRef}
                    photos={photos}
                    frameTemplate={frameTemplate}
                    frameColor={frameColor}
                    caption={caption}
                    stickers={stickers}
                    onCaptionChange={setCaption}
                    onStickersChange={setStickers}
                    userName={userName}
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-snappy w-full mt-5"
                  onClick={handleGenerateStrip}
                >
                  Generate Strip 🖨️
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            )}

            {/* ── STEP 4: Print ───────────────────────────────────────────────── */}
            {step === 'print' && (
              <div className="max-w-sm mx-auto">
                <div className="text-center mb-4">
                  <h1 className="font-display text-3xl mb-1" style={{ color: '#C0304F' }}>
                    Almost done! 🎉
                  </h1>
                </div>
                <div className="card-white p-6">
                  <PrintAnimation
                    stripDataUrl={stripDataUrl}
                    caption={caption}
                    frame={frameTemplate.id}
                    frameColor={frameColor}
                    onBack={() => {
                      setPhotos([]);
                      setStickers([]);
                      setCaption('');
                      setStripDataUrl('');
                      setStep('setup');
                    }}
                  />
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
