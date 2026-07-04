/**
 * Daily Challenge Share Utilities
 *
 * Generate shareable result text for social platforms
 */

import type {
  DailyChallengeResult,
  WordHuntResult,
  TranslationFn,
  ShareTranslationFn,
} from './types';
import { getWordLengthEmoji } from './constants';

/**
 * Generate a shareable result string (Wordle-style)
 * Shows word length distribution as a visual bar chart
 * @param result - The daily challenge result
 * @param siteUrl - Optional site URL override
 * @param t - Optional translation function for localized messages
 */
export function generateShareableResult(
  result: DailyChallengeResult,
  siteUrl?: string,
  t?: TranslationFn
): string {
  // Build word length distribution display
  // Group by length and show as horizontal bars
  const sortedLengths = Object.entries(result.wordsByLength)
    .sort(([a], [b]) => Number(a) - Number(b));

  // Create visual bar for each word length
  const wordBars = sortedLengths
    .map(([len, count]) => {
      const emoji = getWordLengthEmoji(Number(len));
      const bar = emoji.repeat(Math.min(count, 8)); // Cap at 8 for visual clarity
      const overflow = count > 8 ? `+${count - 8}` : '';
      return `${len}⃣ ${bar}${overflow}`;
    })
    .join('\n');

  // Format streak with milestone callouts
  let streakText = '';
  if (result.streakDays >= 30) {
    const text = t
      ? t('daily.share.streakMilestone30', { days: result.streakDays })
      : `${result.streakDays} day streak! 🏆`;
    streakText = `🔥 ${text}\n`;
  } else if (result.streakDays >= 7) {
    const text = t
      ? t('daily.share.streakMilestone7', { days: result.streakDays })
      : `${result.streakDays} day streak! 💪`;
    streakText = `🔥 ${text}\n`;
  } else if (result.streakDays > 1) {
    const text = t
      ? t('daily.share.streak', { days: result.streakDays })
      : `${result.streakDays} day streak!`;
    streakText = `🔥 ${text}\n`;
  }

  // Build URL with current origin and language
  let dailyUrl = 'lexiclash.live/daily';
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const language = result.language;
    dailyUrl = `${origin}/${language}/daily`;
  } else if (siteUrl) {
    dailyUrl = `${siteUrl}/${result.language}/daily`;
  }

  // Score-based brag line
  let bragLine = '';
  if (result.score >= 500) {
    bragLine = t ? t('daily.share.bragDomination') : 'Absolute word domination 👑';
  } else if (result.score >= 300) {
    bragLine = t ? t('daily.share.bragCrushed') : 'The board never stood a chance';
  } else if (result.score >= 150) {
    bragLine = t ? t('daily.share.bragSolid') : 'Solid word hunting today';
  }

  // Get translated strings
  const header = t
    ? t('daily.share.header', { number: result.puzzleNumber })
    : `LexiClash Daily #${result.puzzleNumber}`;
  const stats = t
    ? t('daily.share.stats', { score: result.score, words: result.wordCount })
    : `${result.score} pts | ${result.wordCount} words`;
  const cta = t ? t('daily.share.cta') : 'Think you can beat this? 🎮';

  // Build the shareable text with competitive CTA
  return `🎯 ${header}

${wordBars}

📊 ${stats}${bragLine ? `\n${bragLine}` : ''}
${streakText}
${cta}
${dailyUrl}`;
}

/**
 * Generate Word Hunt share text
 * Clean, simple, and engaging - no emoji grid, just the result
 * NOTE: URL is NOT included here - it's added by the share mechanisms to avoid duplication
 *
 * @param result - The word hunt result
 * @param t - Optional translation function. If provided, uses translated messages.
 * @param siteUrl - Optional site URL (deprecated, kept for backward compatibility)
 */
export function generateWordHuntShareableResult(
  result: WordHuntResult,
  t?: ShareTranslationFn,
  _siteUrl?: string
): string {
  // Format the main result message
  const resultEmoji = result.solved ? '🎯' : '💪';

  // Get translated result text
  const resultText = result.solved
    ? (t ? t('wordHunt.shareMessage.solvedIn').replace('{attempts}', String(result.attemptsUsed)) : `Solved in ${result.attemptsUsed}/10`)
    : (t ? t('wordHunt.shareMessage.failedAttempt') : `X/10 - so close!`);

  // Get translated header
  const header = t
    ? t('wordHunt.shareMessage.header').replace('{number}', String(result.puzzleNumber))
    : `LexiClash Word Hunt #${result.puzzleNumber}`;

  // Performance message tiers with translation keys
  const performanceTiers = {
    genius: ['genius1', 'genius2', 'genius3', 'genius4'],
    great: ['great1', 'great2', 'great3', 'great4'],
    good: ['good1', 'good2', 'good3', 'good4'],
    close: ['close1', 'close2', 'close3', 'close4'],
    fail: ['fail1', 'fail2', 'fail3', 'fail4'],
  };

  // Fallback English messages for when no translation function is provided
  const fallbackMessages = {
    genius: ['🧠 Too easy!', '🔥 Didn\'t even break a sweat', '⚡ Is this thing on easy mode?', '👑 Bow down, peasants!'],
    great: ['⚡ Crushed it!', '💥 That was satisfying', '🎯 On point today!', '✨ Feeling sharp!'],
    good: ['✨ Got there!', '💫 Brain still works!', '🙌 Not bad!', '👏 That\'ll do!'],
    close: ['😅 That was TOO close!', '💫 Squeaked through!', '🎉 Survival mode: activated!', '😮‍💨 Phew!'],
    fail: ['💪 Next time!', '🔄 Tomorrow\'s mine!', '😤 This word was unfair!', '🎲 Bad board!'],
  };

  let performanceMsg = '';
  if (result.solved) {
    let tier: keyof typeof performanceTiers;
    if (result.attemptsUsed <= 2) tier = 'genius';
    else if (result.attemptsUsed <= 4) tier = 'great';
    else if (result.attemptsUsed <= 6) tier = 'good';
    else tier = 'close';

    const keys = performanceTiers[tier];
    const randomIdx = Math.floor(Math.random() * keys.length);
    performanceMsg = t
      ? t(`wordHunt.shareMessage.${keys[randomIdx]}`)
      : fallbackMessages[tier][randomIdx];
  } else {
    const keys = performanceTiers.fail;
    const randomIdx = Math.floor(Math.random() * keys.length);
    performanceMsg = t
      ? t(`wordHunt.shareMessage.${keys[randomIdx]}`)
      : fallbackMessages.fail[randomIdx];
  }

  // Pick a random competitive CTA for variety
  const ctaKeys = ['cta1', 'cta2', 'cta3', 'cta4', 'cta5'];
  const fallbackCTAs = [
    'Think you can do better?',
    'Your turn.',
    'Beat that.',
    'I dare you to try.',
    'Good luck topping this!',
  ];
  const ctaRandomIdx = Math.floor(Math.random() * ctaKeys.length);
  const cta = t
    ? t(`wordHunt.shareMessage.${ctaKeys[ctaRandomIdx]}`)
    : fallbackCTAs[ctaRandomIdx];

  // Build the shareable text - simple and engaging (URL added separately by share mechanisms)
  return `${resultEmoji} ${header}

${resultText} ${performanceMsg}

${cta} 🎮`;
}

/**
 * Generate share text for different platforms (Word Hunt)
 * Now returns the same clean text for all platforms
 */
export function getWordHuntShareTextForPlatform(
  result: WordHuntResult,
  _platform: 'whatsapp' | 'twitter' | 'telegram' | 'copy',
  t?: ShareTranslationFn,
  siteUrl = 'lexiclash.live'
): string {
  // Same clean text for all platforms - no extra messages to avoid duplicate links
  return generateWordHuntShareableResult(result, t, siteUrl);
}

/**
 * Generate share text for different platforms (LEGACY - old daily challenge format)
 */
export function getShareTextForPlatform(
  result: DailyChallengeResult,
  platform: 'whatsapp' | 'twitter' | 'telegram' | 'copy',
  siteUrl = 'lexiclash.live'
): string {
  const baseText = generateShareableResult(result, siteUrl);

  // Platform-specific tweaks
  switch (platform) {
    case 'twitter':
      // Twitter has character limits, keep it concise
      return baseText;
    case 'whatsapp':
    case 'telegram':
      // Add a bit more context for messaging apps
      return `${baseText}\n\nCan you beat my score?`;
    case 'copy':
    default:
      return baseText;
  }
}

/**
 * Generate a simple challenge URL for sharing
 *
 * PRIVACY NOTE: We intentionally keep the URL simple (no encoded player data)
 * to avoid exposing any game-specific information that could:
 * 1. Spoil the puzzle for others
 * 2. Leak player statistics unnecessarily
 *
 * The URL just links to the daily challenge page for the correct language.
 */
export function generateChallengeUrl(result: WordHuntResult): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://lexiclash.live';
  return `${baseUrl}/${result.language}/daily`;
}

/**
 * Generate a challenge share URL with sender score for head-to-head comparison
 *
 * Includes whName, whEmoji, whScore, and whPuzzle params for "beat me" loop.
 * WhatsApp-safe format (short, no word list).
 *
 * @param result - Word hunt result
 * @param displayName - Sender's display name
 * @param avatarEmoji - Sender's emoji
 * @param score - Sender's score for this puzzle
 * @param streakDays - Optional streak count to display on receiver's link
 * @param siteUrl - Optional site URL override
 */
export function generateChallengeShareUrl(
  result: WordHuntResult,
  displayName: string,
  avatarEmoji: string,
  score: number,
  streakDays?: number,
  siteUrl?: string
): string {
  const baseUrl = siteUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://lexiclash.live');

  const params = new URLSearchParams({
    whName: displayName,
    whEmoji: avatarEmoji,
    whScore: String(score),
    whPuzzle: String(result.puzzleNumber),
  });

  if (streakDays && streakDays > 0) {
    params.append('whStreak', String(streakDays));
  }

  return `${baseUrl}/${result.language}/daily?${params.toString()}`;
}

/**
 * Parse a legacy challenge URL parameter (for backwards compatibility)
 * New URLs don't include challenge data, but we keep this for old links.
 */
export function parseChallengeParam(encoded: string): {
  puzzleNumber: number;
  attemptsUsed: number;
  solved: boolean;
  efficiencyScore: number;
  wordsDiscovered: number;
} | null {
  try {
    const decoded = JSON.parse(atob(encoded));
    return {
      puzzleNumber: decoded.p,
      attemptsUsed: decoded.a,
      solved: decoded.s === 1,
      efficiencyScore: decoded.e || 0,
      wordsDiscovered: decoded.w || 0,
    };
  } catch {
    return null;
  }
}
