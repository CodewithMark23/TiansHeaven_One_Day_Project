import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LandingPage from './pages/LandingPage';
import SoloBoothPage from './pages/SoloBoothPage';
import LDRPage from './pages/LDRPage';
import LDRCreatePage from './pages/LDRCreatePage';
import LDRJoinPage from './pages/LDRJoinPage';
import LDRBoothPage from './pages/LDRBoothPage';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/solo" element={<SoloBoothPage />} />
        <Route path="/ldr" element={<LDRPage />} />
        <Route path="/ldr/create" element={<LDRCreatePage />} />
        <Route path="/ldr/join" element={<LDRJoinPage />} />
        <Route path="/ldr/booth/:code" element={<LDRBoothPage />} />
        {/* 404 fallback */}
        <Route
          path="*"
          element={
            <div className="min-h-dvh bg-booth-gradient flex flex-col items-center justify-center gap-4 text-center p-6">
              <div className="text-6xl">🎞️</div>
              <h1 className="font-display text-4xl" style={{ color: '#d4607c' }}>
                Oops! Film not found
              </h1>
              <p className="text-gray-400">This page doesn't exist.</p>
              <a href="/" className="btn-primary mt-2">
                Go Home 🏠
              </a>
            </div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
