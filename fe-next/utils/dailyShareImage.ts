/**
 * Personalized Share Image Generator for Daily Challenge
 *
 * Generates visually appealing neo-brutalist share images with:
 * - Prominent rank display (the focal point)
 * - Funny, encouraging sentences in multiple languages
 * - Clean, focused design without revealing the word
 *
 * Uses Canvas API for client-side generation.
 */

import type { Language } from '@/types';
import logger from '@/utils/logger';

// ==========================================
// Types
// ==========================================

export interface DailyShareImageOptions {
  // Game mode
  gameType: 'puzzle' | 'wordHunt';

  // Core stats
  rank: number | null;
  totalPlayers: number;
  puzzleNumber: number;
  language: Language;

  // For Word Hunt
  solved?: boolean;
  attemptsUsed?: number;

  // For Daily Puzzle
  score?: number;
  wordCount?: number;

  // Player info (optional)
  displayName?: string;
  avatarEmoji?: string;
  avatarImage?: string | null;
}

export interface ShareImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

// ==========================================
// Funny Share Sentences by Language
// ==========================================

/**
 * Funny, encouraging sentences that don't reveal the word
 * These are shown on the share image to encourage others to play
 * Only includes languages the game actually supports
 */
const FUNNY_SENTENCES: Partial<Record<Language, string[]>> = {
  en: [
    "Think you're smarter? Prove it!",
    "I dare you to beat this!",
    "My brain is on fire today!",
    "Bet you can't solve it faster!",
    "Warning: This puzzle is addictive!",
    "I crushed it. Your turn!",
    "Easy peasy... or was it?",
    "My vocabulary just flexed!",
  ],
  he: [
    "חושב שאתה יותר חכם? הוכח!",
    "אני מאתגר אותך לנצח את זה!",
    "המוח שלי בוער היום!",
    "בטוח שאתה לא יכול לפתור יותר מהר!",
    "אזהרה: הפאזל הזה ממכר!",
    "ריסקתי את זה. תורך!",
    "קל קל... או שלא?",
    "אוצר המילים שלי הרגע התגמש!",
  ],
  sv: [
    "Tror du att du är smartare? Bevisa det!",
    "Jag utmanar dig att slå detta!",
    "Min hjärna brinner idag!",
    "Du klarar inte det snabbare!",
    "Varning: Detta pussel är beroendeframkallande!",
    "Jag krossade det. Din tur!",
    "Lätt som en plätt... eller?",
    "Mitt ordförråd just flexade!",
  ],
  ja: [
    "君より賢いと思う？証明して！",
    "これに勝てるかな？",
    "今日は頭がキレてる！",
    "もっと早く解けないでしょ！",
    "警告：このパズルは中毒性あり！",
    "完璧！次は君の番！",
    "簡単だった...かな？",
    "語彙力を見せつけた！",
  ],
  es: [
    "¿Crees que eres más listo? ¡Demuéstralo!",
    "¡Te reto a superar esto!",
    "¡Mi cerebro está en llamas hoy!",
    "¡Apuesto a que no puedes resolverlo más rápido!",
    "Advertencia: ¡Este puzzle es adictivo!",
    "Lo aplasté. ¡Tu turno!",
    "Pan comido... ¿o no?",
    "¡Mi vocabulario acaba de presumir!",
  ],
  // French and German not included - game doesn't support them yet
  // Fallback to English will be used for unsupported languages
};

/**
 * Get a random funny sentence for the given language
 */
export function getRandomFunnySentence(language: Language): string {
  const sentences = FUNNY_SENTENCES[language] ?? FUNNY_SENTENCES.en ?? [];
  if (sentences.length === 0) return "Think you can beat this?";
  const randomIndex = Math.floor(Math.random() * sentences.length);
  return sentences[randomIndex];
}

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

  // Rank colors
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',

  // Background colors
  neoNavy: '#1a1a2e',
  neoNavyLight: '#252542',
  neoNavyDark: '#0f0f14',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray600: '#4B5563',
  gray400: '#9CA3AF',
};

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
    maxWidth?: number;
  }
) {
  const {
    font,
    fillColor = COLORS.white,
    strokeColor,
    strokeWidth = 2,
    align = 'center',
    baseline = 'middle',
    maxWidth,
  } = options;

  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  // Draw stroke first if specified
  if (strokeColor && strokeWidth > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    if (maxWidth) {
      ctx.strokeText(text, x, y, maxWidth);
    } else {
      ctx.strokeText(text, x, y);
    }
  }

  // Draw fill
  ctx.fillStyle = fillColor;
  if (maxWidth) {
    ctx.fillText(text, x, y, maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
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
    spacing = 16,
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
 * Get rank display info (emoji and color)
 */
function getRankDisplay(rank: number): { emoji: string; color: string; text: string } {
  if (rank === 1) return { emoji: '🥇', color: COLORS.gold, text: '1st' };
  if (rank === 2) return { emoji: '🥈', color: COLORS.silver, text: '2nd' };
  if (rank === 3) return { emoji: '🥉', color: COLORS.bronze, text: '3rd' };
  return { emoji: '🏆', color: COLORS.neoCyan, text: `#${rank}` };
}

/**
 * Get game mode icon
 */
function getGameModeIcon(gameType: 'puzzle' | 'wordHunt'): string {
  return gameType === 'wordHunt' ? '🎯' : '📝';
}

/**
 * Get game mode label
 */
function getGameModeLabel(gameType: 'puzzle' | 'wordHunt'): string {
  return gameType === 'wordHunt' ? 'WORD HUNT' : 'DAILY PUZZLE';
}

// ==========================================
// Main Image Generator
// ==========================================

/**
 * Generate a personalized share image for the daily challenge
 *
 * Design focuses on:
 * - Large, prominent rank display (the focal point)
 * - Funny sentence to encourage others
 * - Clean, focused layout
 * - Puzzle number in subtle, small text
 */
export async function generateDailyShareImage(
  options: DailyShareImageOptions
): Promise<ShareImageResult> {
  const {
    gameType,
    rank,
    totalPlayers,
    puzzleNumber,
    language,
    solved,
    attemptsUsed,
    score,
    wordCount,
    displayName,
    avatarEmoji,
  } = options;

  // Image dimensions (OG standard)
  const width = 1200;
  const height = 630;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // === Background ===
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, COLORS.neoNavyDark);
  gradient.addColorStop(0.5, COLORS.neoNavy);
  gradient.addColorStop(1, COLORS.neoNavyDark);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Halftone texture
  drawHalftonePattern(ctx, width, height);

  // === Brand Header (subtle) ===
  drawText(ctx, '🎮 LEXICLASH', width / 2, 40, {
    font: "bold 28px 'Fredoka', 'Rubik', sans-serif",
    fillColor: COLORS.gray600,
  });

  // === Game Mode Badge ===
  const modeBadgeWidth = 200;
  const modeBadgeHeight = 40;
  const modeBadgeY = 70;
  drawNeoBrutalistRect(ctx, width / 2 - modeBadgeWidth / 2, modeBadgeY, modeBadgeWidth, modeBadgeHeight, {
    fillColor: gameType === 'wordHunt' ? COLORS.neoCyan : COLORS.neoYellow,
    borderColor: COLORS.black,
    borderWidth: 3,
    shadowOffset: 4,
    radius: 6,
  });
  drawText(ctx, `${getGameModeIcon(gameType)} ${getGameModeLabel(gameType)}`, width / 2, modeBadgeY + modeBadgeHeight / 2, {
    font: "bold 18px 'Fredoka', 'Rubik', sans-serif",
    fillColor: COLORS.black,
  });

  // === Puzzle Number (subtle, small) ===
  drawText(ctx, `#${puzzleNumber}`, width / 2, modeBadgeY + modeBadgeHeight + 25, {
    font: "16px 'Rubik', sans-serif",
    fillColor: COLORS.gray400,
  });

  // === MAIN: Rank Display (THE FOCAL POINT) ===
  const rankY = 200;

  if (rank !== null && rank > 0) {
    const rankInfo = getRankDisplay(rank);

    // Large rank container
    const rankBoxWidth = 500;
    const rankBoxHeight = 180;
    const rankBoxX = width / 2 - rankBoxWidth / 2;

    // Gradient background for rank box
    const rankGradient = ctx.createLinearGradient(rankBoxX, rankY, rankBoxX + rankBoxWidth, rankY + rankBoxHeight);
    rankGradient.addColorStop(0, 'rgba(255,255,255,0.05)');
    rankGradient.addColorStop(1, 'rgba(255,255,255,0.02)');

    drawNeoBrutalistRect(ctx, rankBoxX, rankY, rankBoxWidth, rankBoxHeight, {
      fillColor: COLORS.neoNavyLight,
      borderColor: rankInfo.color,
      borderWidth: 4,
      shadowOffset: 6,
      radius: 16,
    });

    // Rank emoji and text (HUGE)
    const rankCenterY = rankY + rankBoxHeight / 2;

    // Draw emoji
    ctx.font = "120px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rankInfo.emoji, width / 2 - 100, rankCenterY);

    // Draw rank text
    drawText(ctx, rankInfo.text, width / 2 + 80, rankCenterY, {
      font: "bold 100px 'Fredoka', 'Rubik', sans-serif",
      fillColor: rankInfo.color,
      strokeColor: COLORS.black,
      strokeWidth: 4,
    });

    // "out of X players" below
    drawText(ctx, `out of ${totalPlayers} players`, width / 2, rankY + rankBoxHeight + 30, {
      font: "20px 'Rubik', sans-serif",
      fillColor: COLORS.gray400,
    });
  } else {
    // No rank available - show performance instead
    const performanceY = rankY + 40;

    if (gameType === 'wordHunt') {
      // Word Hunt: Show solved status
      const statusEmoji = solved ? '✅' : '❌';
      const statusText = solved ? `Solved in ${attemptsUsed}/10!` : 'Gave it my best!';

      ctx.font = "80px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(statusEmoji, width / 2, performanceY);

      drawText(ctx, statusText, width / 2, performanceY + 80, {
        font: "bold 40px 'Fredoka', 'Rubik', sans-serif",
        fillColor: solved ? COLORS.neoLime : COLORS.neoOrange,
      });
    } else {
      // Puzzle: Show score
      drawText(ctx, String(score || 0), width / 2, performanceY + 20, {
        font: "bold 100px 'Fredoka', 'Rubik', sans-serif",
        fillColor: COLORS.neoYellow,
        strokeColor: COLORS.black,
        strokeWidth: 4,
      });

      drawText(ctx, `${wordCount || 0} words found`, width / 2, performanceY + 100, {
        font: "24px 'Rubik', sans-serif",
        fillColor: COLORS.gray400,
      });
    }
  }

  // === Player Info (if available) ===
  if (displayName || avatarEmoji) {
    const playerY = 430;
    const playerBoxWidth = 280;
    const playerBoxHeight = 50;

    drawNeoBrutalistRect(ctx, width / 2 - playerBoxWidth / 2, playerY, playerBoxWidth, playerBoxHeight, {
      fillColor: COLORS.neoNavyLight,
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 2,
      shadowOffset: 3,
      radius: 8,
    });

    const emoji = avatarEmoji || '🎮';
    const name = displayName || 'Player';

    ctx.font = "28px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, width / 2 - 80, playerY + playerBoxHeight / 2);

    drawText(ctx, name, width / 2 + 20, playerY + playerBoxHeight / 2, {
      font: "bold 22px 'Rubik', sans-serif",
      fillColor: COLORS.white,
      maxWidth: 180,
    });
  }

  // === Funny Sentence (the hook!) ===
  const funnySentence = getRandomFunnySentence(language);
  const funnyY = 510;

  drawNeoBrutalistRect(ctx, width / 2 - 400, funnyY, 800, 60, {
    fillColor: COLORS.neoOrange,
    borderColor: COLORS.black,
    borderWidth: 3,
    shadowOffset: 4,
    radius: 8,
  });

  drawText(ctx, funnySentence, width / 2, funnyY + 30, {
    font: "bold 26px 'Fredoka', 'Rubik', sans-serif",
    fillColor: COLORS.white,
    maxWidth: 780,
  });

  // === Footer ===
  drawText(ctx, 'lexiclash.live/daily', width / 2, height - 25, {
    font: "16px 'Rubik', sans-serif",
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
 * Download the generated share image
 */
export function downloadDailyShareImage(
  imageResult: ShareImageResult,
  gameType: 'puzzle' | 'wordHunt',
  puzzleNumber: number
): void {
  const filename = gameType === 'wordHunt'
    ? `lexiclash-wordhunt-${puzzleNumber}.png`
    : `lexiclash-daily-${puzzleNumber}.png`;

  const link = document.createElement('a');
  link.href = imageResult.dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Share the generated image using Web Share API
 */
export async function shareDailyImage(
  imageResult: ShareImageResult,
  shareText: string,
  gameType: 'puzzle' | 'wordHunt',
  puzzleNumber: number
): Promise<boolean> {
  const filename = gameType === 'wordHunt'
    ? `lexiclash-wordhunt-${puzzleNumber}.png`
    : `lexiclash-daily-${puzzleNumber}.png`;

  // Check if Web Share API with files is supported
  if (typeof navigator !== 'undefined' && 'share' in navigator && navigator.canShare) {
    try {
      const file = new File([imageResult.blob], filename, { type: 'image/png' });

      // Check if we can share files
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: shareText,
        });
        return true;
      }
    } catch (error) {
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
      return false;
    }
  }

  return false;
}
