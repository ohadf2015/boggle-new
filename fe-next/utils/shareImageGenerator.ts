/**
 * Canvas-based Share Image Generator for LexiClash Daily Challenge
 *
 * Generates visually appealing neo-brutalist share images for social media.
 * Optimized for 1200x630 (Open Graph) or 600x400 (compact) sizes.
 */

import type { DailyChallengeResult, DailyStreak } from './dailyChallenge';
import logger from '@/utils/logger';

// ==========================================
// Neo-Brutalist Color Palette
// ==========================================

const COLORS = {
  // Primary palette
  neoYellow: '#FFE135',
  neoOrange: '#FF6B35',
  neoCyan: '#00D9FF',
  neoPink: '#FF1493',
  neoLime: '#39FF14',
  neoPurple: '#9945FF',

  // Background colors
  neoNavy: '#1a1a2e',
  neoNavyLight: '#252542',
  neoNavyDark: '#0f0f1a',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray600: '#4B5563',
};

// ==========================================
// Types
// ==========================================

export interface ShareImageOptions {
  result: DailyChallengeResult;
  streak: DailyStreak | null;
  longestWord: string;
  size?: 'og' | 'compact'; // og = 1200x630, compact = 600x400
}

export interface ShareImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

// ==========================================
// Canvas Drawing Utilities
// ==========================================

/**
 * Draw a rounded rectangle with hard shadow (neo-brutalist style)
 */
function drawNeoBrutalistRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    fillColor: string;
    borderColor?: string;
    borderWidth?: number;
    shadowOffset?: number;
    shadowColor?: string;
    radius?: number;
  }
) {
  const {
    fillColor,
    borderColor = COLORS.black,
    borderWidth = 3,
    shadowOffset = 4,
    shadowColor = COLORS.black,
    radius = 8,
  } = options;

  // Draw hard shadow (no blur - critical for neo-brutalist)
  if (shadowOffset > 0) {
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.roundRect(x + shadowOffset, y + shadowOffset, width, height, radius);
    ctx.fill();
  }

  // Draw main rectangle
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();

  // Draw border
  if (borderWidth > 0) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.stroke();
  }
}

/**
 * Draw text with optional stroke for better visibility
 */
function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    font: string;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
  }
) {
  const {
    font,
    fillColor = COLORS.white,
    strokeColor,
    strokeWidth = 2,
    align = 'center',
    baseline = 'middle',
  } = options;

  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  // Draw stroke first if specified
  if (strokeColor && strokeWidth > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.strokeText(text, x, y);
  }

  // Draw fill
  ctx.fillStyle = fillColor;
  ctx.fillText(text, x, y);
}

/**
 * Draw the LexiClash logo as text (fallback for canvas)
 */
function drawLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  // Draw "LEXI" in yellow
  ctx.font = `bold ${size}px 'Fredoka', 'Rubik', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Measure text to position parts
  const lexiWidth = ctx.measureText('LEXI').width;
  const clashWidth = ctx.measureText('CLASH').width;
  const totalWidth = lexiWidth + clashWidth;
  const startX = x - totalWidth / 2;

  // Draw LEXI
  ctx.fillStyle = COLORS.neoYellow;
  ctx.fillText('LEXI', startX + lexiWidth / 2, y);

  // Draw CLASH
  ctx.fillStyle = COLORS.neoOrange;
  ctx.fillText('CLASH', startX + lexiWidth + clashWidth / 2, y);
}

/**
 * Draw halftone dot pattern background texture
 */
function drawHalftonePattern(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: {
    dotSize?: number;
    spacing?: number;
    color?: string;
    opacity?: number;
  } = {}
) {
  const {
    dotSize = 2,
    spacing = 12,
    color = COLORS.white,
    opacity = 0.03,
  } = options;

  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;

  for (let x = 0; x < width; x += spacing) {
    for (let y = 0; y < height; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}

/**
 * Draw a stat card with icon, value, and label
 */
function drawStatCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    icon: string;
    value: string | number;
    label: string;
    accentColor: string;
    scale: number;
  }
) {
  const { icon, value, label, accentColor, scale } = options;

  // Card background
  drawNeoBrutalistRect(ctx, x, y, width, height, {
    fillColor: COLORS.neoNavyLight,
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2 * scale,
    shadowOffset: 3 * scale,
    radius: 6 * scale,
  });

  // Icon
  ctx.font = `${24 * scale}px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accentColor;
  ctx.fillText(icon, x + width / 2, y + height * 0.25);

  // Value
  drawText(ctx, String(value), x + width / 2, y + height * 0.55, {
    font: `bold ${20 * scale}px 'Fredoka', 'Rubik', sans-serif`,
    fillColor: COLORS.white,
  });

  // Label
  drawText(ctx, label, x + width / 2, y + height * 0.8, {
    font: `${11 * scale}px 'Rubik', sans-serif`,
    fillColor: COLORS.gray600,
  });
}

// ==========================================
// Word Length Emoji Bar
// ==========================================

const LENGTH_COLORS: Record<number, string> = {
  2: '#9CA3AF', // gray
  3: '#FFE135', // yellow
  4: '#39FF14', // green/lime
  5: '#00D9FF', // blue/cyan
  6: '#9945FF', // purple
  7: '#FF6B35', // orange
  8: '#FF6B35', // orange (same for 8+)
};

function getWordLengthColor(length: number): string {
  if (length >= 7) return LENGTH_COLORS[7];
  return LENGTH_COLORS[length] || LENGTH_COLORS[3];
}

/**
 * Draw word length distribution as colored bars
 */
function drawWordLengthBars(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  wordsByLength: Record<number, number>,
  scale: number
) {
  const sortedLengths = Object.entries(wordsByLength)
    .sort(([a], [b]) => Number(a) - Number(b))
    .slice(0, 5); // Max 5 rows

  if (sortedLengths.length === 0) return;

  const rowHeight = height / Math.max(sortedLengths.length, 3);
  const barMaxWidth = width - 40 * scale;
  const maxCount = Math.max(...sortedLengths.map(([, count]) => count), 1);

  sortedLengths.forEach(([len, count], index) => {
    const rowY = y + index * rowHeight;
    const barWidth = (count / maxCount) * barMaxWidth;
    const color = getWordLengthColor(Number(len));

    // Length label
    drawText(ctx, `${len}`, x + 15 * scale, rowY + rowHeight / 2, {
      font: `bold ${14 * scale}px 'Rubik', sans-serif`,
      fillColor: COLORS.gray600,
    });

    // Bar background
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(x + 30 * scale, rowY + 4 * scale, barMaxWidth, rowHeight - 8 * scale, 4 * scale);
    ctx.fill();

    // Colored bar
    if (barWidth > 0) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x + 30 * scale, rowY + 4 * scale, barWidth, rowHeight - 8 * scale, 4 * scale);
      ctx.fill();
    }

    // Count
    drawText(ctx, String(count), x + 35 * scale + barWidth, rowY + rowHeight / 2, {
      font: `bold ${12 * scale}px 'Rubik', sans-serif`,
      fillColor: COLORS.white,
      align: 'left',
    });
  });
}

// ==========================================
// Main Image Generator
// ==========================================

/**
 * Generate a share image for daily challenge results
 */
export async function generateShareImage(
  options: ShareImageOptions
): Promise<ShareImageResult> {
  const { result, streak, longestWord, size = 'og' } = options;

  // Determine dimensions
  const width = size === 'og' ? 1200 : 600;
  const height = size === 'og' ? 630 : 400;
  const scale = size === 'og' ? 1 : 0.5;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // === Background ===
  // Gradient from neoNavyDark to neoNavy
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, COLORS.neoNavyDark);
  gradient.addColorStop(1, COLORS.neoNavy);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Halftone texture overlay
  drawHalftonePattern(ctx, width, height, { spacing: 16 * scale });

  // === Header Section ===
  const headerY = 40 * scale;

  // Logo
  drawLogo(ctx, width / 2, headerY + 30 * scale, 36 * scale);

  // "Daily Challenge" badge
  const badgeY = headerY + 70 * scale;
  const badgeWidth = 220 * scale;
  const badgeHeight = 36 * scale;
  drawNeoBrutalistRect(ctx, width / 2 - badgeWidth / 2, badgeY, badgeWidth, badgeHeight, {
    fillColor: COLORS.neoCyan,
    borderColor: COLORS.black,
    borderWidth: 3 * scale,
    shadowOffset: 4 * scale,
    radius: 6 * scale,
  });
  drawText(ctx, 'DAILY CHALLENGE', width / 2, badgeY + badgeHeight / 2, {
    font: `bold ${14 * scale}px 'Fredoka', 'Rubik', sans-serif`,
    fillColor: COLORS.black,
  });

  // Puzzle number
  const puzzleY = badgeY + badgeHeight + 20 * scale;
  drawText(ctx, `PUZZLE #${result.puzzleNumber}`, width / 2, puzzleY, {
    font: `bold ${16 * scale}px 'Rubik', sans-serif`,
    fillColor: COLORS.gray600,
  });

  // === Score Section ===
  const scoreY = puzzleY + 40 * scale;

  // Score value (large, yellow)
  drawText(ctx, String(result.score), width / 2, scoreY + 50 * scale, {
    font: `bold ${80 * scale}px 'Fredoka', 'Rubik', sans-serif`,
    fillColor: COLORS.neoYellow,
    strokeColor: COLORS.black,
    strokeWidth: 3 * scale,
  });

  // "POINTS" label
  drawText(ctx, 'POINTS', width / 2, scoreY + 100 * scale, {
    font: `${18 * scale}px 'Rubik', sans-serif`,
    fillColor: COLORS.gray600,
  });

  // === Stats Cards ===
  const statsY = scoreY + 140 * scale;
  const cardWidth = 120 * scale;
  const cardHeight = 90 * scale;
  const cardGap = 20 * scale;
  const totalCardsWidth = 3 * cardWidth + 2 * cardGap;
  const cardsStartX = (width - totalCardsWidth) / 2;

  // Words stat
  drawStatCard(ctx, cardsStartX, statsY, cardWidth, cardHeight, {
    icon: '\uD83D\uDCD6', // book emoji
    value: result.wordCount,
    label: 'WORDS',
    accentColor: COLORS.neoCyan,
    scale,
  });

  // Streak stat
  const currentStreak = streak?.currentStreak ?? 0;
  drawStatCard(ctx, cardsStartX + cardWidth + cardGap, statsY, cardWidth, cardHeight, {
    icon: '\uD83D\uDD25', // fire emoji
    value: currentStreak,
    label: 'STREAK',
    accentColor: COLORS.neoOrange,
    scale,
  });

  // Time stat
  const minutes = Math.floor(result.timeSeconds / 60);
  const seconds = result.timeSeconds % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  drawStatCard(ctx, cardsStartX + 2 * (cardWidth + cardGap), statsY, cardWidth, cardHeight, {
    icon: '\u23F1', // stopwatch emoji
    value: timeStr,
    label: 'TIME',
    accentColor: COLORS.neoPurple,
    scale,
  });

  // === Word Length Distribution ===
  const barsY = statsY + cardHeight + 30 * scale;
  const barsWidth = 200 * scale;
  const barsHeight = 100 * scale;

  // Draw label
  drawText(ctx, 'WORD LENGTHS', width / 2, barsY - 10 * scale, {
    font: `bold ${12 * scale}px 'Rubik', sans-serif`,
    fillColor: COLORS.gray600,
  });

  // Draw bars
  drawWordLengthBars(
    ctx,
    width / 2 - barsWidth / 2,
    barsY,
    barsWidth,
    barsHeight,
    result.wordsByLength,
    scale
  );

  // === Longest Word Badge ===
  if (longestWord && longestWord.length >= 4) {
    const longestY = barsY + barsHeight + 20 * scale;
    const longestBadgeWidth = 180 * scale;
    const longestBadgeHeight = 40 * scale;

    drawNeoBrutalistRect(ctx, width / 2 - longestBadgeWidth / 2, longestY, longestBadgeWidth, longestBadgeHeight, {
      fillColor: COLORS.neoYellow,
      borderColor: COLORS.black,
      borderWidth: 3 * scale,
      shadowOffset: 4 * scale,
      radius: 6 * scale,
    });

    drawText(ctx, `"${longestWord.toUpperCase()}"`, width / 2, longestY + longestBadgeHeight / 2, {
      font: `bold ${16 * scale}px 'Fredoka', 'Rubik', sans-serif`,
      fillColor: COLORS.black,
    });
  }

  // === Streak Milestone Banner ===
  if (streak && streak.currentStreak >= 7) {
    const milestoneBannerY = height - 80 * scale;
    const bannerWidth = 260 * scale;
    const bannerHeight = 50 * scale;

    // Gradient banner
    const bannerGradient = ctx.createLinearGradient(
      width / 2 - bannerWidth / 2,
      0,
      width / 2 + bannerWidth / 2,
      0
    );
    bannerGradient.addColorStop(0, COLORS.neoOrange);
    bannerGradient.addColorStop(1, COLORS.neoPink);

    drawNeoBrutalistRect(ctx, width / 2 - bannerWidth / 2, milestoneBannerY, bannerWidth, bannerHeight, {
      fillColor: COLORS.neoOrange,
      borderColor: COLORS.black,
      borderWidth: 3 * scale,
      shadowOffset: 4 * scale,
      radius: 6 * scale,
    });

    // Overwrite with gradient
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(width / 2 - bannerWidth / 2, milestoneBannerY, bannerWidth, bannerHeight, 6 * scale);
    ctx.clip();
    ctx.fillStyle = bannerGradient;
    ctx.fill();
    ctx.restore();

    // Text
    drawText(ctx, `\uD83D\uDD25 ${streak.currentStreak} DAY STREAK! \uD83D\uDD25`, width / 2, milestoneBannerY + bannerHeight / 2, {
      font: `bold ${16 * scale}px 'Fredoka', 'Rubik', sans-serif`,
      fillColor: COLORS.white,
    });
  }

  // === Footer ===
  const footerY = height - 25 * scale;
  drawText(ctx, 'lexiclash.live/daily', width / 2, footerY, {
    font: `${14 * scale}px 'Rubik', sans-serif`,
    fillColor: COLORS.gray600,
  });

  // === Generate output ===
  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) {
        resolve(b);
      } else {
        reject(new Error('Failed to generate blob'));
      }
    }, 'image/png');
  });

  return {
    blob,
    dataUrl,
    width,
    height,
  };
}

/**
 * Share the generated image using Web Share API
 */
export async function shareImageWithNativeShare(
  imageResult: ShareImageResult,
  shareText: string
): Promise<boolean> {
  // Check if Web Share API with files is supported
  if (typeof navigator !== 'undefined' && 'share' in navigator && navigator.canShare) {
    try {
      const file = new File([imageResult.blob], 'lexiclash-daily.png', { type: 'image/png' });

      // Check if we can share files
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: shareText,
        });
        return true;
      }
    } catch (error) {
      // User cancelled or error - fall through to text-only share
      logger.log('Image share failed, trying text only:', error);
    }
  }

  // Fallback: Try text-only share
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({
        text: shareText,
      });
      return true;
    } catch {
      // User cancelled
      return false;
    }
  }

  return false;
}

/**
 * Download the generated image
 */
export function downloadShareImage(imageResult: ShareImageResult, filename: string = 'lexiclash-daily.png'): void {
  const link = document.createElement('a');
  link.href = imageResult.dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
