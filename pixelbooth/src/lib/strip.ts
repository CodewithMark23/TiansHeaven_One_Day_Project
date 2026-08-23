import type { CapturedPhoto, StripOptions } from '../types';

const STRIP_WIDTH = 520;
const PHOTO_WIDTH = 480;
const PHOTO_HEIGHT = 640;
const PADDING = 20;
const GAP = 8;
const FOOTER_HEIGHT = 60;

export function calcStripHeight(photoCount = 4): number {
  return (
    PADDING * 2 +
    photoCount * PHOTO_HEIGHT +
    (photoCount - 1) * GAP +
    FOOTER_HEIGHT
  );
}

/**
 * Renders a photo strip onto a canvas and returns it.
 */
export async function buildStrip(
  photos: CapturedPhoto[],
  options: StripOptions
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const stripH = calcStripHeight(photos.length);
  canvas.width = STRIP_WIDTH;
  canvas.height = stripH;

  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = options.borderColor;
  ctx.fillRect(0, 0, STRIP_WIDTH, stripH);

  // Rounded inner background
  const innerX = (STRIP_WIDTH - PHOTO_WIDTH) / 2;

  // Draw each photo
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const y = PADDING + i * (PHOTO_HEIGHT + GAP);

    await drawPhotoToCanvas(ctx, photo.dataUrl, innerX, y, PHOTO_WIDTH, PHOTO_HEIGHT);
  }

  // Footer text
  const footerY = PADDING + photos.length * (PHOTO_HEIGHT + GAP) - GAP + 12;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.font = 'bold 18px "Outfit", sans-serif';
  ctx.textAlign = 'center';

  if (options.title) {
    ctx.fillText(options.title, STRIP_WIDTH / 2, footerY + 16);
  }

  if (options.date) {
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    ctx.font = '14px "Outfit", sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillText(dateStr, STRIP_WIDTH / 2, footerY + 38);
  }

  // PixelBooth watermark
  ctx.font = '12px "Outfit", sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillText('📸 PixelBooth', STRIP_WIDTH / 2, stripH - 10);

  return canvas;
}

function drawPhotoToCanvas(
  ctx: CanvasRenderingContext2D,
  dataUrl: string,
  x: number,
  y: number,
  w: number,
  h: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Clip to rounded rect
      ctx.save();
      roundedRect(ctx, x, y, w, h, 8);
      ctx.clip();
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
      resolve();
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Triggers a download of the canvas as a PNG file.
 */
export function downloadStrip(canvas: HTMLCanvasElement, filename = 'pixelbooth-strip.png'): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}
