/**
 * Streak Share Card Generator
 *
 * Canvas-based PNG image generator for a Wordle-style streak share card.
 *
 * Layout:
 *   ┌──────────────────────┐
 *   │  🎮 LEXICLASH        │
 *   │  DAILY                │
 *   │                       │
 *   │        🔥             │
 *   │    7-DAY STREAK       │
 *   │                       │
 *   │  Found 28/32 words    │
 *   │  Beat 73% of players  │
 *   │                       │
 *   │  → lexiclash.live     │
 *   └──────────────────────┘
 */

import type { Language } from '@/types';
import { getStreakMilestoneMessage } from './streaks';

export interface StreakShareCardOptions {
  streakDays: number;
  puzzleNumber: number;
  language: Language;
  solved: boolean;
  wordsFound: number;
  totalWords: number;
  rankPercent: number | null; // null if unranked (e.g. 73 means "Beat 73% of players")
  displayName?: string;
}

export interface ShareImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

// ── Neo-brutalist palette ────────────────────────────────────────────
const C = {
  navy: '#1a1a2e',
  navyLight: '#252542',
  navyDark: '#0f0f14',
  white: '#FFFFFF',
  black: '#000000',
  lime: '#BFFF00',
  cyan: '#00D9FF',
  pink: '#FF1493',
  yellow: '#FFE135',
  orange: '#FF6B35',
  gray: '#9CA3AF',
  grayDark: '#4B5563',
};

/** Streak-tier accent colors matching StreakCounter.tsx tiers */
function getStreakColor(days: number): string {
  if (days >= 30) return C.pink;
  if (days >= 14) return C.cyan;
  if (days >= 7)  return C.lime;
  return C.yellow;
}

function getStreakEmoji(days: number): string {
  if (days >= 100) return '🏆';
  if (days >= 30)  return '👑';
  if (days >= 14)  return '🌟';
  if (days >= 7)   return '🔥';
  return '🔥';
}

// ── Canvas helpers ───────────────────────────────────────────────────

function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  fill: string,
  borderColor = C.black,
  borderWidth = 3,
  radius = 8,
  shadowOffset = 4,
) {
  // Hard shadow
  if (shadowOffset > 0) {
    ctx.fillStyle = C.black;
    ctx.beginPath();
    ctx.roundRect(x + shadowOffset, y + shadowOffset, w, h, radius);
    ctx.fill();
  }
  // Fill
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  // Border
  if (borderWidth > 0) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.stroke();
  }
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  opts: {
    font: string;
    fillColor?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
    maxWidth?: number;
  },
) {
  ctx.font = opts.font;
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = opts.baseline ?? 'middle';
  ctx.fillStyle = opts.fillColor ?? C.white;
  if (opts.maxWidth) {
    ctx.fillText(text, x, y, opts.maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
}

function drawHalftone(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = C.white;
  ctx.globalAlpha = 0.03;
  for (let x = 0; x < w; x += 16) {
    for (let y = 0; y < h; y += 16) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ── Main generator ───────────────────────────────────────────────────

/**
 * Generate a streak share card as a canvas PNG image.
 * Returns a blob + dataUrl ready for download or share.
 *
 * Design: dark neo-brutalist, streak-centred, with a large flame emoji,
 * streak count, tier label, and performance summary.
 */
export async function generateStreakShareCard(
  options: StreakShareCardOptions,
): Promise<ShareImageResult> {
  const {
    streakDays,
    puzzleNumber,
    solved,
    wordsFound,
    totalWords,
    rankPercent,
    displayName,
  } = options;

  const width = 1080;
  const height = 1080;
  const cx = width / 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // ── Background gradient ──
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, C.navyDark);
  grad.addColorStop(0.5, C.navy);
  grad.addColorStop(1, C.navyDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Halftone texture
  drawHalftone(ctx, width, height);

  const accentColor = getStreakColor(streakDays);
  const emoji = getStreakEmoji(streakDays);

  // ── Brand header ──
  drawText(ctx, '🎮 LEXICLASH', cx, 60, {
    font: "bold 36px 'Fredoka','Rubik',sans-serif",
    fillColor: C.grayDark,
  });

  // ── Mode badge ──
  const badgeW = 200, badgeH = 46;
  drawRect(ctx, cx - badgeW / 2, 100, badgeW, badgeH, accentColor, C.black, 3, 8, 5);
  drawText(ctx, `DAILY #${puzzleNumber}`, cx, 100 + badgeH / 2, {
    font: "bold 22px 'Fredoka','Rubik',sans-serif",
    fillColor: C.black,
  });

  // ── Streak emoji (large) ──
  const emojiY = 260;
  ctx.font = "160px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, cx, emojiY);

  // ── Streak count ──
  const streakText = `${streakDays}${streakDays === 1 ? '-DAY' : '-DAY STREAK'}`;
  drawText(ctx, streakText, cx, emojiY + 120, {
    font: "bold 88px 'Fredoka','Rubik',sans-serif",
    fillColor: accentColor,
  });

  // ── Milestone label (if applicable) ──
  const milestoneMsg = getStreakMilestoneMessage(streakDays);
  if (milestoneMsg) {
    drawText(ctx, milestoneMsg.title, cx, emojiY + 195, {
      font: "bold 32px 'Fredoka','Rubik',sans-serif",
      fillColor: accentColor,
    });
  }

  // ── Divider line ──
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 200, emojiY + 255);
  ctx.lineTo(cx + 200, emojiY + 255);
  ctx.stroke();

  // ── Stats rows ──
  const statsY = emojiY + 300;

  // Words found
  const solvedEmoji = solved ? '✅' : '❌';
  drawText(ctx, `${solvedEmoji}  Found ${wordsFound}/${totalWords} words`, cx, statsY, {
    font: "bold 36px 'Fredoka','Rubik',sans-serif",
    fillColor: C.white,
  });

  // Rank percentile
  if (rankPercent !== null) {
    const pctColor = rankPercent >= 90 ? C.lime : rankPercent >= 70 ? C.cyan : C.gray;
    drawText(ctx, `📊  Beat ${rankPercent}% of players`, cx, statsY + 65, {
      font: "bold 36px 'Fredoka','Rubik',sans-serif",
      fillColor: pctColor,
    });
  }

  // Player name (optional)
  if (displayName) {
    drawText(ctx, `— ${displayName} —`, cx, statsY + 130, {
      font: "24px 'Rubik',sans-serif",
      fillColor: C.gray,
    });
  }

  // ── CTA bar ──
  const ctaY = height - 130;
  drawRect(ctx, cx - 280, ctaY, 560, 58, accentColor, C.black, 3, 10, 6);
  drawText(ctx, 'PLAY AT LEXICLASH.LIVE 🎮', cx, ctaY + 29, {
    font: "bold 28px 'Fredoka','Rubik',sans-serif",
    fillColor: C.black,
  });

  // ── Convert to blob ──
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas toBlob failed'));
        return;
      }
      resolve({
        blob,
        dataUrl: canvas.toDataURL('image/png'),
        width,
        height,
      });
    }, 'image/png', 0.92);
  });
}

/**
 * Trigger a download of the streak share card in the browser.
 */
export function downloadStreakCard(dataUrl: string, streakDays: number): void {
  const link = document.createElement('a');
  link.download = `lexiclash-streak-${streakDays}d.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}