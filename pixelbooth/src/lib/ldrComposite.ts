/**
 * Composites two photos (Host & Guest) side-by-side into a single photo frame.
 */
export async function createSideBySideComposite(
  hostPhotoUrl: string | null,
  guestPhotoUrl: string | null,
  hostName: string = 'You',
  guestName: string = 'Partner'
): Promise<string> {
  const canvas = document.createElement('canvas');
  const WIDTH = 640;
  const HEIGHT = 480;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext('2d')!;

  // 1. Background
  ctx.fillStyle = '#FFF9F0';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const halfWidth = (WIDTH - 12) / 2; // 6px gap in center
  const photoHeight = HEIGHT - 16;
  const photoY = 8;

  // 2. Draw Left Half (Host)
  const leftX = 8;
  if (hostPhotoUrl) {
    await drawRoundedImage(ctx, hostPhotoUrl, leftX, photoY, halfWidth - 4, photoHeight, 12);
  } else {
    drawPlaceholder(ctx, leftX, photoY, halfWidth - 4, photoHeight, hostName);
  }

  // Draw Left Badge
  drawNameBadge(ctx, hostName, leftX + 12, photoY + photoHeight - 32);

  // 3. Draw Center Divider Heart
  ctx.fillStyle = 'rgba(255, 143, 171, 0.9)';
  ctx.beginPath();
  ctx.arc(WIDTH / 2, HEIGHT / 2, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('♡', WIDTH / 2, HEIGHT / 2 + 1);

  // 4. Draw Right Half (Guest)
  const rightX = WIDTH / 2 + 4;
  if (guestPhotoUrl) {
    await drawRoundedImage(ctx, guestPhotoUrl, rightX, photoY, halfWidth - 4, photoHeight, 12);
  } else {
    drawPlaceholder(ctx, rightX, photoY, halfWidth - 4, photoHeight, guestName);
  }

  // Draw Right Badge
  drawNameBadge(ctx, guestName, rightX + 12, photoY + photoHeight - 32);

  return canvas.toDataURL('image/png', 1.0);
}

function drawRoundedImage(
  ctx: CanvasRenderingContext2D,
  dataUrl: string,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      roundRectPath(ctx, x, y, w, h, r);
      ctx.clip();

      // Aspect cover calculation
      const imgRatio = img.width / img.height;
      const targetRatio = w / h;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;

      if (imgRatio > targetRatio) {
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / targetRatio;
        sy = (img.height - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
      ctx.restore();
      resolve();
    };
    img.onerror = () => {
      drawPlaceholder(ctx, x, y, w, h, 'Photo unavailable');
      resolve();
    };
    img.src = dataUrl;
  });
}

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  name: string
) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 12);
  ctx.fillStyle = '#FFE4EC';
  ctx.fill();
  ctx.strokeStyle = '#FFB6C1';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FF8FAB';
  ctx.fillText('⏳', x + w / 2, y + h / 2 - 14);

  ctx.font = 'bold 12px "Outfit", sans-serif';
  ctx.fillStyle = '#C0304F';
  ctx.fillText(`Waiting for ${name}…`, x + w / 2, y + h / 2 + 18);

  ctx.restore();
}

function drawNameBadge(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number
) {
  ctx.save();
  ctx.font = 'bold 11px "Outfit", sans-serif';
  const textWidth = ctx.measureText(name).width;
  const paddingX = 8;
  const badgeW = textWidth + paddingX * 2;
  const badgeH = 22;

  roundRectPath(ctx, x, y, badgeW, badgeH, 11);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 182, 193, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#C0304F';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, x + paddingX, y + badgeH / 2);
  ctx.restore();
}

function roundRectPath(
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
