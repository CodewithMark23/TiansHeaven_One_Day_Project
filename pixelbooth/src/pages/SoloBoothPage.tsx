import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import type {
  BoothStep, CapturedPhoto, StickerItem,
  CountdownDuration, PhotoCount, FilterType, FrameTemplate, PhotoLayoutId, PhotoLayoutOption,
} from '../types';
import { DEFAULT_BOOTH_CONFIG, FRAME_TEMPLATES } from '../types';

import CountdownSelector from '../components/Setup/CountdownSelector';
import FrameSelector from '../components/Setup/FrameSelector';
import PhotoLayoutSelector from '../components/Setup/PhotoLayoutSelector';
import FilterSelector from '../components/Setup/FilterSelector';
import CameraSession from '../components/Camera/CameraSession';
import RetakeReview from '../components/Retake/RetakeReview';
import StripCanvas from '../components/Strip/StripCanvas';
import type { StripCanvasRef } from '../components/Strip/StripCanvas';
import PrintAnimation from '../components/Print/PrintAnimation';

// ─── Step metadata ─────────────────────────────────────────────────────────────
const STEPS: { key: BoothStep; label: string; emoji: string }[] = [
  { key: 'setup', label: 'Setup', emoji: '⚙️' },
  { key: 'camera', label: 'Camera', emoji: '📷' },
  { key: 'retake', label: 'Review', emoji: '👀' },
  { key: 'customize', label: 'Style', emoji: '✨' },
  { key: 'print', label: 'Print', emoji: '🖨️' },
];

const STEP_ORDER: BoothStep[] = ['setup', 'camera', 'retake', 'customize', 'print'];

function stepIndex(step: BoothStep) { return STEP_ORDER.indexOf(step); }

// ─── Page transitions ──────────────────────────────────────────────────────────
const pageVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export default function SoloBoothPage() {
  const navigate = useNavigate();

  // ── Booth config ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<BoothStep>('setup');
  const [userName] = useState('');

  const [countdown, setCountdown] = useState<CountdownDuration>(DEFAULT_BOOTH_CONFIG.countdown);
  const [frameTemplate, setFrameTemplate] = useState<FrameTemplate>(FRAME_TEMPLATES[0]);
  const [frameColor, setFrameColor] = useState('#FFFFFF');
  const [filter, setFilter] = useState<FilterType>('original');
  const [photoCount, setPhotoCount] = useState<PhotoCount>(4);
  const [layoutId, setLayoutId] = useState<PhotoLayoutId>('4-vertical');

  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [caption, setCaption] = useState('');
  const [stripDataUrl, setStripDataUrl] = useState('');

  const stripRef = useRef<StripCanvasRef>(null);

  const handleLayoutChange = (layout: PhotoLayoutOption) => {
    setLayoutId(layout.id);
    setPhotoCount(layout.photoCount);
  };

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

  const currentIdx = stepIndex(step);

  return (
    <div className="bg-scrapbook-soft min-h-dvh flex flex-col">
      {/* Header — blue stationery style */}
      <header
        className="sticky top-0 z-30 px-6 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(244, 251, 255, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1.5px solid rgba(180, 225, 235, 0.65)',
          boxShadow: '0 3px 18px rgba(200, 238, 242, 0.35)',
        }}
      >

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={goBack}
          className="px-4 py-1.5 text-xs flex items-center gap-1.5 font-cute cursor-pointer"
          style={{
            background: 'transparent',
            color: '#D98FA8',
            border: 'none',
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 'setup' ? 'Home' : 'Back'}
        </motion.button>

        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`step-dot ${i === currentIdx ? 'active' : i < currentIdx ? 'done' : ''}`}
            />
          ))}
        </div>

        <div className="w-16" />
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
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-6 mt-4">
                  <h1 className="font-display text-3xl mb-1" style={{ color: '#D98FA8' }}>
                    Solo Booth Setup
                  </h1>
                  <p className="font-cute text-sm" style={{ color: '#B8A0A8' }}>
                    Customize your session layout, countdown, filters & frame ♡
                  </p>
                </div>

                <div className="flex flex-col gap-5">
                  {/* Photo Layout Selector */}
                  <div className="card-stationery-blue p-6 relative">
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
                    <PhotoLayoutSelector selectedId={layoutId} onChange={handleLayoutChange} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Left column */}
                    <div className="flex flex-col gap-5">
                      <div className="card-stationery-mint p-5 relative">
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
                        <CountdownSelector value={countdown} onChange={setCountdown} />
                      </div>
                      <div
                        className="card-stationery-mint p-5 relative"
                        style={{
                          background: 'linear-gradient(145deg, #FFFDF5, #FFF6DC)',
                          border: '1.5px solid rgba(230, 200, 90, 0.5)',
                          boxShadow: '0 3px 18px rgba(230, 200, 90, 0.25)',
                        }}
                      >
                        <motion.span
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                          style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '16px',
                            fontSize: '1.3rem',
                            color: '#E6C85A',
                            filter: 'drop-shadow(0 1px 3px rgba(230,200,90,0.5))',
                            zIndex: 20,
                          }}
                        >
                          ✿
                        </motion.span>
                        <FilterSelector selected={filter} onChange={setFilter} />
                      </div>
                    </div>

                    {/* Right column — frame */}
                    <div className="card-stationery p-5 relative">
                      <motion.span
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '16px',
                          fontSize: '1.3rem',
                          color: '#afdbf2ff',
                          filter: 'drop-shadow(0 1px 3px rgba(175, 234, 242, 0.5))',
                          zIndex: 20,
                        }}
                      >
                        ✿
                      </motion.span>
                      <FrameSelector
                        selectedFrame={frameTemplate}
                        selectedColor={frameColor}
                        onFrameChange={setFrameTemplate}
                        onColorChange={setFrameColor}
                      />
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-scrapbook w-full mt-6 mb-8 py-3.5 text-base"
                  onClick={goNext}
                >
                  Start Session 📸
                  <ArrowRight className="w-5 h-5" />
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
              <div className="max-w-3xl mx-auto pt-6 md:pt-8">
                <div className="text-center mb-6">
                  <h1 className="font-display text-3xl mb-1" style={{ color: '#D98FA8' }}>
                    Style your strip ✨
                  </h1>
                  <p className="font-cute text-sm" style={{ color: '#B8A0A8' }}>
                    Add stickers, a caption, and pick your frame color!
                  </p>
                </div>

                <div className="card-stationery p-6">
                  <StripCanvas
                    ref={stripRef}
                    photos={photos}
                    frameTemplate={frameTemplate}
                    frameColor={frameColor}
                    caption={caption}
                    stickers={stickers}
                    layoutId={layoutId}
                    onCaptionChange={setCaption}
                    onStickersChange={setStickers}
                    userName={userName}
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-scrapbook w-full mt-5 mb-8 py-3.5 text-base"
                  onClick={handleGenerateStrip}
                >
                  Generate Strip 🖨️
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            )}

            {/* ── STEP 4: Print ───────────────────────────────────────────────── */}
            {step === 'print' && (
              <div className="max-w-3xl mx-auto pt-6 md:pt-8">
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
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
