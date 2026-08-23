import { useState, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import type { FilterType, CapturedPhoto, Sticker } from '../types';
import { captureFrame } from '../lib/camera';

export interface UsePhotoCaptureReturn {
  photos: CapturedPhoto[];
  isCountingDown: boolean;
  countdown: number;
  isFlashing: boolean;
  capturePhoto: (
    videoEl: HTMLVideoElement,
    filter: FilterType,
    stickers: Sticker[],
    takerName: string
  ) => Promise<CapturedPhoto | null>;
  clearPhotos: () => void;
  canCapture: boolean;
}

const MAX_PHOTOS = 4;
const COUNTDOWN_START = 3;

export function usePhotoCapture(): UsePhotoCaptureReturn {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [isFlashing, setIsFlashing] = useState(false);
  const isCapturingRef = useRef(false);

  const capturePhoto = useCallback(
    async (
      videoEl: HTMLVideoElement,
      filter: FilterType,
      stickers: Sticker[],
      takerName: string
    ): Promise<CapturedPhoto | null> => {
      if (isCapturingRef.current || photos.length >= MAX_PHOTOS) return null;
      isCapturingRef.current = true;

      // Countdown
      setIsCountingDown(true);
      let count = COUNTDOWN_START;
      setCountdown(count);

      await new Promise<void>((resolve) => {
        const tick = setInterval(() => {
          count--;
          setCountdown(count);
          if (count <= 0) {
            clearInterval(tick);
            resolve();
          }
        }, 1000);
      });

      setIsCountingDown(false);

      // Flash
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 600);

      // Capture frame
      const dataUrl = captureFrame(videoEl, filter);

      const photo: CapturedPhoto = {
        id: nanoid(),
        dataUrl,
        filter,
        stickers: [...stickers],
        takerName,
        position: photos.length + 1,
        timestamp: Date.now(),
      };

      setPhotos((prev) => [...prev, photo]);
      isCapturingRef.current = false;

      return photo;
    },
    [photos.length]
  );

  const clearPhotos = useCallback(() => {
    setPhotos([]);
  }, []);

  return {
    photos,
    isCountingDown,
    countdown,
    isFlashing,
    capturePhoto,
    clearPhotos,
    canCapture: photos.length < MAX_PHOTOS && !isCountingDown,
  };
}
