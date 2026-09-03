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
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const start = useCallback(async () => {
    if (!videoRef.current) return;
    if (streamRef.current) stopCamera(streamRef.current);
    setIsLoading(true);
    setError(null);
    try {
      const s = await startCamera(videoRef.current);
      streamRef.current = s;
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
    stopCamera(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setIsReady(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera(streamRef.current);
    };
  }, []);

  return { videoRef, stream, isLoading, error, start, stop, isReady };
}
