import type { HolidayKey } from '@/lib/holidays/calendar';
import { stripEmoji } from '@/lib/share/stripEmoji';

const SIZE = 1080;

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function rgbToken(name: string): string {
  const v = token(name);
  return v.includes(' ') && !v.startsWith('#') ? `rgb(${v})` : v;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fitContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.min(w / img.width, h / img.height);
  ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
}

export async function holidayShareCard(i: {
  holiday: HolidayKey;
  lit: number;
  total: number;
  headline: string;
  footer: string;
  avatarUrl: string | null;
}): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const navy = token('--neo-navy') || token('--neo-navy-light');
  const gold = token('--neo-holiday-gold');
  const accent = token(i.holiday === 'hanukkah' ? '--neo-holiday-blue' : '--neo-holiday-red');
  const snow = token('--neo-holiday-snow');
  const black = rgbToken('--neo-black');

  ctx.fillStyle = navy;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, SIZE, 28);
  ctx.strokeStyle = black;
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, SIZE - 16, SIZE - 16);

  const [avatar, prop] = await Promise.all([
    i.avatarUrl ? loadImage(i.avatarUrl) : Promise.resolve(null),
    loadImage(i.holiday === 'hanukkah' ? '/holidays/props-candle.webp' : '/holidays/props-gift-red.webp'),
  ]);
  if (avatar) fitContain(ctx, avatar, SIZE / 2 - 210, 90, 420, 420);
  else {
    const mascot = await loadImage(i.holiday === 'hanukkah' ? '/holidays/m-hanukkah.webp' : '/holidays/m-christmas.webp');
    if (mascot) fitContain(ctx, mascot, SIZE / 2 - 210, 90, 420, 420);
  }

  if (prop) {
    const cols = Math.min(i.total, 12);
    const slot = Math.min(110, (SIZE - 160) / cols);
    const startX = (SIZE - slot * cols) / 2;
    for (let n = 0; n < cols; n++) {
      ctx.globalAlpha = n < i.lit ? 1 : 0.25;
      fitContain(ctx, prop, startX + n * slot, 560, slot - 8, 150);
    }
    ctx.globalAlpha = 1;
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = gold;
  ctx.font = 'bold 76px Fredoka, Rubik, system-ui, sans-serif';
  ctx.fillText(i.headline, SIZE / 2, 820, SIZE - 120);
  ctx.fillStyle = snow;
  ctx.font = 'bold 44px Rubik, system-ui, sans-serif';
  ctx.fillText(i.footer, SIZE / 2, 920, SIZE - 120);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export async function shareHolidayCard(blob: Blob, text: string, url: string): Promise<'shared' | 'downloaded' | 'failed'> {
  const file = new File([blob], 'lexiclash-holiday.png', { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: stripEmoji(text), url });
      return 'shared';
    }
  } catch {
    return 'failed';
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return 'downloaded';
}
