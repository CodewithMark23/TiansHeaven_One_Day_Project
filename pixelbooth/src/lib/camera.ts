import type { FilterType } from '../types';
import { FILTER_OPTIONS } from '../types';

// ─── Camera Stream Management ──────────────────────────────────────────────────

export async function startCamera(
  videoEl: HTMLVideoElement,
  facingMode: 'user' | 'environment' = 'user'
): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play();
  return stream;
}

export function stopCamera(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

// ─── Filter CSS Lookup ─────────────────────────────────────────────────────────

export function getFilterCSS(filter: FilterType): string {
  const found = FILTER_OPTIONS.find((f) => f.id === filter);
  return found?.cssFilter ?? 'none';
}

// ─── Canvas Capture ────────────────────────────────────────────────────────────

/**
 * Captures a frame from a video element with optional mirror.
 * Crops to 3:4 portrait ratio and applies CSS filter via canvas.
 */
export function captureFrame(
  videoEl: HTMLVideoElement,
  filter: FilterType,
  mirrorX = true
): string {
  const canvas = document.createElement('canvas');
  const vw = videoEl.videoWidth  || videoEl.offsetWidth  || 640;
  const vh = videoEl.videoHeight || videoEl.offsetHeight || 480;

  // Crop to 3:4 portrait
  const targetRatio = 3 / 4;
  let srcX = 0, srcY = 0, srcW = vw, srcH = vh;
  if (vw / vh > targetRatio) {
    srcW = vh * targetRatio;
    srcX = (vw - srcW) / 2;
  } else {
    srcH = vw / targetRatio;
    srcY = (vh - srcH) / 2;
  }

  const outW = 480, outH = 640;
  canvas.width  = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;

  ctx.filter = getFilterCSS(filter);

  if (mirrorX) {
    ctx.translate(outW, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(videoEl, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = 'none';

  return canvas.toDataURL('image/png');
}

export function isCameraSupported(): boolean {
  return !!(navigator.mediaDevices?.getUserMedia);
}
