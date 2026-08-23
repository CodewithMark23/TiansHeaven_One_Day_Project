import { useRef, useState, useCallback, useEffect } from 'react';
import { startCamera, stopCamera } from '../lib/camera';

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  isReady: boolean;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const start = useCallback(async () => {
    if (!videoRef.current) return;
    setIsLoading(true);
    setError(null);
    try {
      const s = await startCamera(videoRef.current);
      setStream(s);
      setIsReady(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Camera access denied';
      setError(
        msg.includes('Permission')
          ? 'Camera permission denied. Please allow camera access.'
          : `Camera error: ${msg}`
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stop = useCallback(() => {
    stopCamera(stream);
    setStream(null);
    setIsReady(false);
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera(stream);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { videoRef, stream, isLoading, error, start, stop, isReady };
}
