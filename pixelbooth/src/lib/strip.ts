import type { CapturedPhoto, StripOptions, StickerItem } from '../types';

const STRIP_WIDTH = 520;
const PHOTO_WIDTH = 480;
const PHOTO_HEIGHT = 360;
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
  options: StripOptions,
  stickers: StickerItem[] = []
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

  // Draw stickers on top of the whole photo area
  const photoAreaHeight = photos.length * PHOTO_HEIGHT + (photos.length - 1) * GAP;
  for (const sticker of stickers) {
    await drawStickerToCanvas(ctx, sticker, innerX, PADDING, PHOTO_WIDTH, photoAreaHeight);
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
      ctx.save();
      roundedRect(ctx, x, y, w, h, 8);
      ctx.clip();

      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, w, h);

      const boxRatio = w / h;
      const imgRatio = img.naturalWidth / img.naturalHeight;

      let drawW = w;
      let drawH = h;

      if (imgRatio > boxRatio) {
        drawW = w;
        drawH = w / imgRatio;
      } else {
        drawH = h;
        drawW = h * imgRatio;
      }

      const drawX = x + (w - drawW) / 2;
      const drawY = y + (h - drawH) / 2;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
      resolve();
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Draws a single sticker (emoji or uploaded image) onto the canvas.
 * sticker.x / sticker.y are percentages relative to the photo area (areaX/areaY/areaW/areaH).
 */
function drawStickerToCanvas(
  ctx: CanvasRenderingContext2D,
  sticker: StickerItem,
  areaX: number,
  areaY: number,
  areaW: number,
  areaH: number
): Promise<void> {
  return new Promise((resolve) => {
    const cx = areaX + (sticker.x / 100) * areaW;
    const cy = areaY + (sticker.y / 100) * areaH;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((sticker.rotation * Math.PI) / 180);

    if (sticker.type === 'emoji') {
      const fontSize = Math.round(36 * sticker.scale * (areaW / 480));
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sticker.content, 0, 0);
      ctx.restore();
      resolve();
    } else {
      const img = new Image();
      img.onload = () => {
        const size = Math.round(65 * sticker.scale * (areaW / 480));
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
        resolve();
      };
      img.onerror = () => {
        ctx.restore();
        resolve();
      };
      img.src = sticker.content;
    }
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