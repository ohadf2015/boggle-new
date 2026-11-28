import type { ShareImageResult } from '@/utils/shareImageGenerator';
import type { HolidayKey } from '@/lib/holidays/calendar';
import type { WrappedSlide } from './wrappedSlides';

const W = 1080;
const H = 1350;

function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function buildWrappedImage(opts: {
  holiday: HolidayKey;
  title: string;
  rows: { value: string; label: string }[];
  art: string;
  footer: string;
}): Promise<ShareImageResult | null> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const navy = token('--neo-navy', '#1a1a2e');
  const accent = opts.holiday === 'hanukkah' ? token('--neo-holiday-blue', '#3d7bff') : token('--neo-holiday-red', '#e8283c');
  const cream = token('--neo-cream', '#fff8e7');
  const black = token('--neo-black', '#000000');

  ctx.fillStyle = navy;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 24);
  ctx.textAlign = 'center';
  ctx.fillStyle = cream;
  ctx.font = 'bold 76px Fredoka, sans-serif';
  ctx.fillText(opts.title, W / 2, 150, W - 120);

  const art = await loadImage(opts.art);
  if (art) ctx.drawImage(art, W / 2 - 160, 190, 320, 320);

  opts.rows.slice(0, 5).forEach((r, i) => {
    const y = 600 + i * 132;
    ctx.fillStyle = black;
    ctx.fillRect(108, y + 8, W - 200, 108);
    ctx.fillStyle = cream;
    ctx.fillRect(100, y, W - 200, 108);
    ctx.fillStyle = navy;
    ctx.textAlign = 'start';
    ctx.font = 'bold 60px Fredoka, sans-serif';
    ctx.fillText(r.value, 140, y + 76, 360);
    ctx.font = '36px Rubik, sans-serif';
    ctx.fillText(r.label, 480, y + 68, W - 620);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = cream;
  ctx.font = 'bold 44px Fredoka, sans-serif';
  ctx.fillText(opts.footer, W / 2, H - 60, W - 120);

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) return null;
  return { blob, dataUrl: canvas.toDataURL('image/png'), width: W, height: H };
}
