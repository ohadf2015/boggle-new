import toast from 'react-hot-toast';
import logger from '@/utils/logger';

/**
 * Translation function type
 */
type TranslationFunction = (key: string) => string;

/**
 * Get the join URL for a game room
 * @param gameCode - The game code
 * @param utmSource - Optional UTM source to track where link came from
 * @returns The full URL to join the game
 */
export const getJoinUrl = (gameCode: string, utmSource?: string): string => {
  if (typeof window === 'undefined') return '';
  if (!gameCode) return '';
  const publicUrl = process.env.REACT_APP_PUBLIC_URL || window.location.origin;
  const params = new URLSearchParams();
  params.set('room', gameCode);
  if (utmSource) {
    params.set('utm_source', utmSource);
    params.set('utm_medium', 'share');
  }
  return `${publicUrl}?${params.toString()}`;
};

/**
 * Copy the join URL to clipboard
 * @param gameCode - The game code
 * @param t - Translation function (optional for backward compatibility)
 * @param utmSource - UTM source for tracking (defaults to 'copy')
 * @returns Success status
 */
export const copyJoinUrl = async (gameCode: string, t: TranslationFunction | null = null, utmSource: string = 'copy'): Promise<boolean> => {
  const url = getJoinUrl(gameCode, utmSource);

  try {
    await navigator.clipboard.writeText(url);
    const successMessage = t ? t('share.linkCopied') : 'Link copied! 📋';
    toast.success(successMessage, {
      duration: 2000,
      icon: '✅',
    });
    return true;
  } catch (error) {
    logger.error('Failed to copy URL:', error);
    const errorMessage = t ? t('share.copyError') : 'Error copying link';
    toast.error(errorMessage, {
      duration: 2000,
    });
    return false;
  }
};

/**
 * Share game via WhatsApp
 * @param gameCode - The game code
 * @param roomName - The room name (optional)
 * @param t - Translation function
 */
export const shareViaWhatsApp = (gameCode: string, roomName: string = '', t: TranslationFunction): void => {
  // Use utm_source=whatsapp to track shares from WhatsApp
  const url = getJoinUrl(gameCode, 'whatsapp');

  const roomText = roomName ? `\n${t('share.room')}: ${roomName}` : '';
  const message = `🎮 ${t('share.inviteMessage')}\n${roomText}\n${t('share.code')}: ${gameCode}\n\n${t('share.joinViaLink')}:\n${url}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
};

/**
 * Share game via Facebook
 * Opens Facebook's share dialog with the game URL
 * @param url - The URL to share (with UTM params)
 */
export const shareViaFacebook = (url: string): void => {
  // Facebook share dialog - uses sharer.php for simple URL sharing
  // Note: Facebook doesn't support pre-filled text in sharer, only URL
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(facebookUrl, '_blank', 'width=600,height=400');
};

/**
 * Share game via Telegram
 * Opens Telegram's share dialog with message and URL
 * @param message - The message to share
 * @param url - The URL to include (optional, can be part of message)
 */
export const shareViaTelegram = (message: string, url?: string): void => {
  // Telegram share URL format - supports both text and url params
  const telegramUrl = url
    ? `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`
    : `https://t.me/share/url?text=${encodeURIComponent(message)}`;
  window.open(telegramUrl, '_blank', 'width=600,height=400');
};

/**
 * Copy the game code to clipboard
 * @param gameCode - The game code
 * @param t - Translation function (optional for backward compatibility)
 * @returns Success status
 */
export const copyGameCode = async (gameCode: string, t: TranslationFunction | null = null): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(gameCode);
    const successMessage = t ? t('share.codeCopied') : 'הקוד הועתק ללוח! 🎯';
    toast.success(successMessage, {
      duration: 2000,
      icon: '✅',
    });
    return true;
  } catch (error) {
    logger.error('Failed to copy game code:', error);
    const errorMessage = t ? t('share.codeCopyError') : 'שגיאה בהעתקת הקוד';
    toast.error(errorMessage, {
      duration: 2000,
    });
    return false;
  }
};

/**
 * Player archetype for enhanced share cards
 */
export interface ShareArchetype {
  id: string;
  name: string;
  emoji: string;
}

/**
 * Game result data for personalized sharing
 */
export interface GameResultForShare {
  score: number;
  wordCount: number;
  isWinner: boolean;
  achievements?: Array<{ id: string; icon?: string; name?: string }>;
  longestWord?: string;
  streakDays?: number;
  /** Max combo level achieved during the game */
  maxCombo?: number;
  /** Player archetype based on playstyle */
  archetype?: ShareArchetype;
  /** Placement in the game (1st, 2nd, etc.) */
  placement?: number;
  /** Total players in the game */
  totalPlayers?: number;
}

/**
 * Generate a personalized share message based on game results
 * @param gameCode - The game code
 * @param result - Game result data
 * @param language - Language code ('en', 'he', 'sv', 'ja')
 * @param utmSource - UTM source for tracking (defaults to 'whatsapp')
 * @returns Personalized share message
 */
export const generatePersonalizedShareMessage = (
  gameCode: string,
  result: GameResultForShare,
  language: string = 'en',
  utmSource: string = 'whatsapp'
): string => {
  const url = getJoinUrl(gameCode, utmSource);
  const { score, wordCount, isWinner, achievements = [], longestWord, streakDays } = result;

  // Score-based emoji
  const getScoreEmoji = (): string => {
    if (score > 150) return '🔥';
    if (score > 100) return '⚡';
    if (score > 50) return '⭐';
    return '🎮';
  };

  // Achievement icons (max 3)
  const achievementIcons = achievements
    .slice(0, 3)
    .map(a => a.icon || '🏆')
    .join('');

  // Streak text
  const streakText = streakDays && streakDays > 1
    ? language === 'he'
      ? `\n🔥 רצף של ${streakDays} ימים!`
      : `\n🔥 ${streakDays} day streak!`
    : '';

  // Hebrew messages
  if (language === 'he') {
    if (isWinner) {
      if (score > 100 && achievements.length > 0) {
        return `${getScoreEmoji()} ניצחתי ב-LexiClash עם ${score} נקודות! ${achievementIcons}\nמצאתי ${wordCount} מילים${longestWord ? ` (הכי ארוכה: ${longestWord})` : ''}.${streakText}\n\nמי יכול לנצח אותי?\n${url}`;
      }
      if (score > 100) {
        return `${getScoreEmoji()} השגתי ${score} נקודות ב-LexiClash!\n${wordCount} מילים. תצליחו לנצח אותי?${streakText}\n\n${url}`;
      }
      return `🏆 ניצחתי ב-LexiClash!\nמצאתי ${wordCount} מילים וצברתי ${score} נקודות.${streakText}\n\nבואו לשחק: ${url}`;
    }
    return `🎮 שיחקתי ב-LexiClash ומצאתי ${wordCount} מילים!\nבואו לשחק איתי: ${url}`;
  }

  // Swedish messages
  if (language === 'sv') {
    if (isWinner) {
      if (score > 100) {
        return `${getScoreEmoji()} Vann just LexiClash med ${score} poäng! ${achievementIcons}\nHittade ${wordCount} ord.${streakText}\n\nKan du slå mig?\n${url}`;
      }
      return `🏆 Vann LexiClash!\nHittade ${wordCount} ord och fick ${score} poäng.${streakText}\n\nSpela med mig: ${url}`;
    }
    return `🎮 Spelade precis LexiClash och hittade ${wordCount} ord!\nGå med mig: ${url}`;
  }

  // Japanese messages
  if (language === 'ja') {
    if (isWinner) {
      if (score > 100) {
        return `${getScoreEmoji()} LexiClashで${score}ポイント獲得！${achievementIcons}\n${wordCount}語を見つけました。${streakText}\n\n私に勝てますか？\n${url}`;
      }
      return `🏆 LexiClashで勝利！\n${wordCount}語を見つけ、${score}ポイント獲得。${streakText}\n\n一緒に遊ぼう: ${url}`;
    }
    return `🎮 LexiClashで${wordCount}語を見つけました！\n参加してね: ${url}`;
  }

  // English (default)
  if (isWinner) {
    if (score > 100 && achievements.length > 0) {
      return `${getScoreEmoji()} Just crushed it in LexiClash with ${score} points! ${achievementIcons}\nFound ${wordCount} words${longestWord ? ` (longest: ${longestWord})` : ''}.${streakText}\n\nThink you can beat me?\n${url}`;
    }
    if (score > 100) {
      return `${getScoreEmoji()} Just scored ${score} points in LexiClash!\n${wordCount} words found. Can you beat my score?${streakText}\n\n${url}`;
    }
    return `🏆 Won at LexiClash!\nFound ${wordCount} words and scored ${score} points.${streakText}\n\nJoin me: ${url}`;
  }
  return `🎮 Just played LexiClash and found ${wordCount} words!\nJoin my game: ${url}`;
};

/**
 * Share game results via WhatsApp with personalized message
 * @param gameCode - The game code
 * @param result - Game result data
 * @param language - Language code
 */
export const shareResultsViaWhatsApp = (
  gameCode: string,
  result: GameResultForShare,
  language: string = 'en'
): void => {
  const message = generatePersonalizedShareMessage(gameCode, result, language);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
};

/**
 * A/B Testing Infrastructure for Share Messages
 */

export interface ShareVariant {
  id: string;
  message: string;
  tone: 'challenge' | 'achievement' | 'social' | 'competitive';
}

interface VariantPerformance {
  variantId: string;
  shown: number;
  clicked: number;
  converted: number; // User who received shared link joined
}

const VARIANT_STORAGE_KEY = 'lexiclash_share_variant';
const PERFORMANCE_STORAGE_KEY = 'lexiclash_variant_performance';

/**
 * Get or assign a consistent variant bucket for the user
 * Users see the same variant style for consistency
 */
const getUserVariantBucket = (): number => {
  if (typeof window === 'undefined') return 0;

  const stored = localStorage.getItem(VARIANT_STORAGE_KEY);
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed)) return parsed;
  }

  // Assign new bucket (0-3 for 4 variant types)
  const bucket = Math.floor(Math.random() * 4);
  localStorage.setItem(VARIANT_STORAGE_KEY, bucket.toString());
  return bucket;
};

/**
 * Track variant performance locally
 */
const trackVariantEvent = (variantId: string, event: 'shown' | 'clicked' | 'converted'): void => {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(PERFORMANCE_STORAGE_KEY);
    const performance: Record<string, VariantPerformance> = stored ? JSON.parse(stored) : {};

    if (!performance[variantId]) {
      performance[variantId] = { variantId, shown: 0, clicked: 0, converted: 0 };
    }

    if (event === 'shown') performance[variantId].shown++;
    if (event === 'clicked') performance[variantId].clicked++;
    if (event === 'converted') performance[variantId].converted++;

    localStorage.setItem(PERFORMANCE_STORAGE_KEY, JSON.stringify(performance));
  } catch {
    // Storage full or unavailable
  }
};

/**
 * Get variant performance data for analytics
 */
export const getVariantPerformance = (): VariantPerformance[] => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(PERFORMANCE_STORAGE_KEY);
    if (!stored) return [];
    const performance: Record<string, VariantPerformance> = JSON.parse(stored);
    return Object.values(performance);
  } catch {
    return [];
  }
};

/**
 * Generate share message variants for all languages
 */
const generateVariants = (
  gameCode: string,
  result: GameResultForShare,
  language: string,
  utmSource: string
): ShareVariant[] => {
  const url = getJoinUrl(gameCode, utmSource);
  const { score, wordCount, isWinner, longestWord } = result;

  // Language-specific variants with different tones
  const variants: Record<string, ShareVariant[]> = {
    en: [
      { id: 'en_challenge', tone: 'challenge', message: `🎮 Just found ${wordCount} words in LexiClash! Can you beat that?\n${url}` },
      { id: 'en_achievement', tone: 'achievement', message: `🏆 ${score} points in LexiClash${longestWord ? ` (longest: ${longestWord})` : ''}!\n${url}` },
      { id: 'en_social', tone: 'social', message: `⚡ Playing LexiClash - it's addictive! Join me:\n${url}` },
      { id: 'en_competitive', tone: 'competitive', message: `📚 Word ${isWinner ? 'champion' : 'master'} here! Think you can beat ${score} points?\n${url}` },
    ],
    he: [
      { id: 'he_challenge', tone: 'challenge', message: `🎮 מצאתי ${wordCount} מילים ב-LexiClash! תצליחו יותר?\n${url}` },
      { id: 'he_achievement', tone: 'achievement', message: `🏆 השגתי ${score} נקודות${longestWord ? ` (הכי ארוכה: ${longestWord})` : ''}!\n${url}` },
      { id: 'he_social', tone: 'social', message: `⚡ משחק ממכר! הצטרפו ל-LexiClash:\n${url}` },
      { id: 'he_competitive', tone: 'competitive', message: `📚 ${isWinner ? 'אלוף' : 'שחקן'} מילים! מי ינצח ${score} נקודות?\n${url}` },
    ],
    sv: [
      { id: 'sv_challenge', tone: 'challenge', message: `🎮 Hittade ${wordCount} ord i LexiClash! Kan du slå det?\n${url}` },
      { id: 'sv_achievement', tone: 'achievement', message: `🏆 ${score} poäng i LexiClash!\n${url}` },
      { id: 'sv_social', tone: 'social', message: `⚡ Spelar LexiClash - det är beroendeframkallande! Gå med:\n${url}` },
      { id: 'sv_competitive', tone: 'competitive', message: `📚 Ord${isWinner ? 'mästare' : 'entusiast'} här! Slå ${score} poäng?\n${url}` },
    ],
    ja: [
      { id: 'ja_challenge', tone: 'challenge', message: `🎮 LexiClashで${wordCount}語見つけた！勝てる？\n${url}` },
      { id: 'ja_achievement', tone: 'achievement', message: `🏆 LexiClashで${score}ポイント獲得！\n${url}` },
      { id: 'ja_social', tone: 'social', message: `⚡ LexiClash面白い！一緒に遊ぼう：\n${url}` },
      { id: 'ja_competitive', tone: 'competitive', message: `📚 ${isWinner ? 'チャンピオン' : '挑戦者'}！${score}ポイント超えられる？\n${url}` },
    ],
    es: [
      { id: 'es_challenge', tone: 'challenge', message: `🎮 ¡Encontré ${wordCount} palabras en LexiClash! ¿Puedes superarlo?\n${url}` },
      { id: 'es_achievement', tone: 'achievement', message: `🏆 ¡${score} puntos en LexiClash${longestWord ? ` (más larga: ${longestWord})` : ''}!\n${url}` },
      { id: 'es_social', tone: 'social', message: `⚡ ¡LexiClash es adictivo! Únete:\n${url}` },
      { id: 'es_competitive', tone: 'competitive', message: `📚 ¡${isWinner ? 'Campeón' : 'Maestro'} de palabras! ¿Puedes superar ${score} puntos?\n${url}` },
    ],
  };

  return variants[language] || variants.en;
};

/**
 * Get the optimal share message variant for the user
 * Uses consistent bucketing for A/B testing
 * @param gameCode - The game code
 * @param result - Game result data
 * @param language - Language code
 * @param utmSource - UTM source for tracking
 * @returns Selected variant with tracking
 */
export const getOptimalShareVariant = (
  gameCode: string,
  result: GameResultForShare,
  language: string = 'en',
  utmSource: string = 'share'
): ShareVariant => {
  const variants = generateVariants(gameCode, result, language, utmSource);
  const bucket = getUserVariantBucket();
  const variant = variants[bucket % variants.length];

  // Track that this variant was shown
  trackVariantEvent(variant.id, 'shown');

  return variant;
};

/**
 * Track when a share variant was clicked (user actually shared)
 */
export const trackShareVariantClick = (variantId: string): void => {
  trackVariantEvent(variantId, 'clicked');
};

/**
 * Track when a share led to a conversion (new player joined)
 * Call this when detecting a user came from a shared link
 */
export const trackShareConversion = (variantId?: string): void => {
  if (!variantId) return;
  trackVariantEvent(variantId, 'converted');
};

/**
 * Generate random share message variants for A/B testing
 * @param gameCode - The game code
 * @param result - Game result data
 * @param language - Language code
 * @param utmSource - UTM source for tracking (defaults to 'share')
 * @returns Array of message variants
 * @deprecated Use getOptimalShareVariant for better A/B testing
 */
export const getShareMessageVariants = (
  gameCode: string,
  result: GameResultForShare,
  language: string = 'en',
  utmSource: string = 'share'
): string[] => {
  const variants = generateVariants(gameCode, result, language, utmSource);
  return variants.map(v => v.message);
};
