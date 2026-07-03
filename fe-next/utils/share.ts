import toast from 'react-hot-toast';
import posthog from '@/lib/analytics/lazyPosthog';
import logger from '@/utils/logger';
import { trackReferralInviteSent } from '@/utils/viralTracking';
import { trackGrowthEvent } from '@/utils/growthTracking';

export type ShareMethod =
  | 'whatsapp'
  | 'facebook'
  | 'telegram'
  | 'twitter'
  | 'discord'
  | 'email'
  | 'sms'
  | 'clipboard'
  | 'web_share_api'
  | 'fallback_clipboard';

/**
 * Unified share-completion event. Fires alongside surface-specific events
 * (share_whatsapp_clicked etc.) so the "Share Action (Any Method)" PostHog
 * goal can match without knowing every channel name. Caller passes the
 * concrete `method` so we can break down conversion by channel.
 */
export function trackShareCompleted(
  method: ShareMethod,
  extras?: Record<string, string | number | boolean>,
): void {
  trackGrowthEvent('share_completed', { method, ...(extras ?? {}) });
}

/**
 * Translation function type
 */
type TranslationFunction = (
  key: string,
  params?: Record<string, string | number>,
) => string;

/**
 * Get the join URL for a game room
 * @param gameCode - The game code
 * @param utmSource - Optional UTM source to track where link came from
 * @param hostName - Optional host display name (truncated to 24 chars). When set,
 *   appended as `host=<encoded>` so the recipient's onboarding can name them.
 * @returns The full URL to join the game
 */
export const getJoinUrl = (gameCode: string, utmSource?: string, hostName?: string): string => {
  if (typeof window === 'undefined') return '';
  if (!gameCode) return '';
  const origin = window.location.origin;
  // Extract current locale from the URL path (e.g. /en/..., /he/...)
  const localeMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
  const locale = localeMatch?.[1] || 'en';
  const params = new URLSearchParams();
  params.set('room', gameCode);
  if (utmSource) {
    params.set('utm_source', utmSource);
    params.set('utm_medium', 'referral');
    params.set('utm_campaign', 'player_invite');
  }
  if (hostName && hostName.trim()) {
    params.set('host', hostName.trim().slice(0, 24));
  }
  return `${origin}/${locale}?${params.toString()}`;
};

/**
 * Share URL for the MP results brag card. The room outlives the game (it's
 * held open for the rematch), so while a code exists the card carries a LIVE
 * join link — a friend who taps it lands in the room for the next round.
 * Without a code (or during SSR) it falls back to the homepage.
 */
export const getBragShareUrl = (gameCode?: string): string => {
  const joinUrl = gameCode ? getJoinUrl(gameCode, 'brag_card') : '';
  return joinUrl || 'https://lexiclash.live';
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
    trackReferralInviteSent();
    trackShareCompleted('clipboard', { utm_source: utmSource });
    return true;
  } catch (clipboardError) {
    // Fallback 1: execCommand for older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (success) {
        const successMessage = t ? t('share.linkCopied') : 'Link copied! 📋';
        toast.success(successMessage, {
          duration: 2000,
          icon: '✅',
        });
        trackReferralInviteSent();
        trackShareCompleted('fallback_clipboard', { utm_source: utmSource });
        return true;
      }
      throw new Error('execCommand copy returned false');
    } catch {
      // Fallback 2: Web Share API (works on most mobile browsers)
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ url });
          trackShareCompleted('web_share_api', { utm_source: utmSource });
          return true;
        } catch (shareError) {
          // User cancelled or share failed — only log if not user-cancelled
          if (shareError instanceof DOMException && shareError.name === 'AbortError') {
            return false;
          }
          logger.warn('Share API also failed:', shareError);
        }
      }

      // All methods failed — show URL in toast for manual copying
      const isNotAllowed = clipboardError instanceof DOMException && clipboardError.name === 'NotAllowedError';
      if (isNotAllowed) {
        logger.warn('Clipboard copy failed (NotAllowedError, all fallbacks exhausted)');
      } else {
        logger.warn('Failed to copy URL:', clipboardError);
      }
      const manualCopyMsg = t ? t('share.manualCopy') : 'Copy this link:';
      toast(`${manualCopyMsg}\n${url}`, {
        duration: 8000,
        icon: '📋',
      });
      return false;
    }
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
  trackReferralInviteSent();
  trackShareCompleted('whatsapp');
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
  trackShareCompleted('facebook');
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
  trackShareCompleted('telegram');
};

/**
 * Share game via Twitter/X
 * Opens Twitter's intent URL with pre-filled text
 * @param message - The message to tweet
 * @param url - The URL to include
 */
export const shareViaTwitter = (message: string, url?: string): void => {
  // Twitter/X Web Intent URL
  const text = url ? `${message}\n${url}` : message;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(twitterUrl, '_blank', 'width=550,height=420');
  trackShareCompleted('twitter');
};

/**
 * Share game via Discord
 * Copies a formatted message to clipboard for pasting in Discord
 * Discord doesn't have a direct share URL, so we copy to clipboard
 * @param message - The message to share
 * @param url - The URL to include
 * @param t - Translation function
 * @returns Promise resolving to success status
 */
export const shareViaDiscord = async (message: string, url: string, t: TranslationFunction | null = null): Promise<boolean> => {
  // Discord-optimized formatting with embed-friendly URL
  const discordMessage = `${message}\n${url}`;

  try {
    await navigator.clipboard.writeText(discordMessage);
    const successMessage = t ? t('share.discordCopied') : 'Copied for Discord! Paste in your server 💬';
    toast.success(successMessage, {
      duration: 3000,
      icon: '🎮',
    });
    trackShareCompleted('discord');
    return true;
  } catch (error) {
    logger.error('Failed to copy for Discord:', error);
    const errorMessage = t ? t('share.copyError') : 'Error copying message';
    toast.error(errorMessage, { duration: 2000 });
    return false;
  }
};

/**
 * Share game via Email
 * Opens the default email client with pre-filled subject and body
 * @param subject - Email subject line
 * @param body - Email body content
 * @param url - The URL to include in the body
 */
export const shareViaEmail = (subject: string, body: string, url: string): void => {
  // Build mailto URL with subject and body
  const fullBody = `${body}\n\n${url}`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullBody)}`;
  window.location.href = mailtoUrl;
  trackShareCompleted('email');
};

/**
 * Share game via SMS
 * Opens the native SMS app with pre-filled message (mobile only)
 * @param message - The message to send
 * @param url - The URL to include
 */
export const shareViaSms = (message: string, url: string): void => {
  // SMS URL format - works on iOS and Android
  // Using body parameter which is more widely supported
  const fullMessage = `${message}\n${url}`;
  // iOS uses &body=, Android uses ?body= - use ? for broader compatibility
  const smsUrl = `sms:?body=${encodeURIComponent(fullMessage)}`;
  window.location.href = smsUrl;
  trackShareCompleted('sms');
};

/**
 * Check if SMS sharing is likely supported (mobile device)
 * @returns boolean indicating if SMS share is available
 */
export const canShareViaSms = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  // Check for mobile user agents
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /iphone|ipad|ipod|android|webos|blackberry|windows phone/i.test(userAgent);

  return isMobile;
};

/**
 * Copy the game code to clipboard
 * @param gameCode - The game code
 * @param t - Translation function (optional for backward compatibility)
 * @returns Success status
 */
export const copyGameCode = async (gameCode: string, t: TranslationFunction | null = null): Promise<boolean> => {
  const showSuccess = () => {
    const successMessage = t ? t('share.codeCopied') : 'הקוד הועתק ללוח! 🎯';
    toast.success(successMessage, { duration: 2000, icon: '✅' });
  };

  try {
    await navigator.clipboard.writeText(gameCode);
    showSuccess();
    return true;
  } catch {
    // Fallback: execCommand for older browsers / permission-denied
    try {
      const textarea = document.createElement('textarea');
      textarea.value = gameCode;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) {
        showSuccess();
        return true;
      }
    } catch {
      // execCommand also failed
    }

    // All methods failed — show code in toast for manual copy
    logger.warn('Failed to copy game code, showing manual fallback');
    const manualMsg = t ? t('share.manualCopy') : 'Copy this code:';
    toast(`${manualMsg} ${gameCode}`, { duration: 6000, icon: '📋' });
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
  trackReferralInviteSent();
  trackShareCompleted('whatsapp', { surface: 'results' });
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

  // Send to PostHog so A/B test data can be analyzed at scale
  try {
    posthog.capture('share_variant_event', { variantId, event });
  } catch {
    // PostHog not initialized
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
  const { score, wordCount, isWinner, longestWord, maxCombo } = result;

  // Score tier for message selection
  const isLegendary = score > 150;
  const isAmazing = score > 100;

  // Language-specific variants with different tones
  const variants: Record<string, ShareVariant[]> = {
    en: [
      { id: 'en_challenge', tone: 'challenge', message: `🎮 ${wordCount} words. ${score} points. Think you can beat that?\n${url}` },
      { id: 'en_achievement', tone: 'achievement', message: `${isLegendary ? '🔥' : '🏆'} ${score} points in LexiClash!${longestWord ? ` Found "${longestWord}" 💎` : ''}${maxCombo && maxCombo >= 10 ? ` ${maxCombo}x combo! ⚡` : ''}\n${url}` },
      { id: 'en_social', tone: 'social', message: `Word battle happening NOW! ${isWinner ? 'Come challenge the champ' : 'Join the fight'} 🎮\n${url}` },
      { id: 'en_competitive', tone: 'competitive', message: `${isAmazing ? 'The letters feared me today. ' : ''}${score} points${isWinner ? ' and the W' : ''}. Your turn.\n${url}` },
    ],
    he: [
      { id: 'he_challenge', tone: 'challenge', message: `${wordCount} מילים. ${score} נקודות. תצליחו יותר? 🎮\n${url}` },
      { id: 'he_achievement', tone: 'achievement', message: `${isLegendary ? '🔥' : '🏆'} ${score} נקודות ב-LexiClash!${longestWord ? ` מצאתי "${longestWord}" 💎` : ''}${maxCombo && maxCombo >= 10 ? ` קומבו ${maxCombo}x! ⚡` : ''}\n${url}` },
      { id: 'he_social', tone: 'social', message: `קרב מילים עכשיו! ${isWinner ? 'בואו לאתגר את האלוף' : 'הצטרפו לקרב'} 🎮\n${url}` },
      { id: 'he_competitive', tone: 'competitive', message: `${isAmazing ? 'האותיות פחדו ממני היום. ' : ''}${score} נקודות${isWinner ? ' וניצחון' : ''}. תורכם.\n${url}` },
    ],
    sv: [
      { id: 'sv_challenge', tone: 'challenge', message: `${wordCount} ord. ${score} poäng. Slår du det? 🎮\n${url}` },
      { id: 'sv_achievement', tone: 'achievement', message: `${isLegendary ? '🔥' : '🏆'} ${score} poäng i LexiClash!${longestWord ? ` Hittade "${longestWord}" 💎` : ''}\n${url}` },
      { id: 'sv_social', tone: 'social', message: `Ordstrid pågår! ${isWinner ? 'Utmana mästaren' : 'Gå med i kampen'} 🎮\n${url}` },
      { id: 'sv_competitive', tone: 'competitive', message: `${isAmazing ? 'Bokstäverna fruktade mig idag. ' : ''}${score} poäng${isWinner ? ' och vinst' : ''}. Din tur.\n${url}` },
    ],
    ja: [
      { id: 'ja_challenge', tone: 'challenge', message: `${wordCount}語。${score}ポイント。勝てる？🎮\n${url}` },
      { id: 'ja_achievement', tone: 'achievement', message: `${isLegendary ? '🔥' : '🏆'} LexiClashで${score}ポイント！${longestWord ? `「${longestWord}」発見 💎` : ''}\n${url}` },
      { id: 'ja_social', tone: 'social', message: `単語バトル開催中！${isWinner ? 'チャンプに挑戦して' : '参加しよう'} 🎮\n${url}` },
      { id: 'ja_competitive', tone: 'competitive', message: `${isAmazing ? '文字たちは怯えていた。' : ''}${score}ポイント${isWinner ? 'で勝利' : ''}。君の番だ。\n${url}` },
    ],
    es: [
      { id: 'es_challenge', tone: 'challenge', message: `${wordCount} palabras. ${score} puntos. ¿Puedes superarlo? 🎮\n${url}` },
      { id: 'es_achievement', tone: 'achievement', message: `${isLegendary ? '🔥' : '🏆'} ¡${score} puntos en LexiClash!${longestWord ? ` Encontré "${longestWord}" 💎` : ''}${maxCombo && maxCombo >= 10 ? ` ¡Combo ${maxCombo}x! ⚡` : ''}\n${url}` },
      { id: 'es_social', tone: 'social', message: `¡Batalla de palabras EN VIVO! ${isWinner ? 'Desafía al campeón' : 'Únete a la lucha'} 🎮\n${url}` },
      { id: 'es_competitive', tone: 'competitive', message: `${isAmazing ? 'Las letras me temían hoy. ' : ''}${score} puntos${isWinner ? ' y victoria' : ''}. Tu turno.\n${url}` },
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

// ─── UGC Share Functions ─────────────────────────────────────────

/**
 * Get the URL for a community board
 */
export const getBoardUrl = (boardCode: string, locale: string = 'en'): string => {
  if (typeof window === 'undefined') return '';
  const baseUrl = process.env.REACT_APP_PUBLIC_URL || window.location.origin;
  return `${baseUrl}/${locale}/community/${boardCode}?utm_source=share&utm_medium=board`;
};

/**
 * Share a community board via various channels
 */
export const shareBoard = (
  boardCode: string,
  title: string,
  creatorName: string,
  locale: string,
  t: TranslationFunction
): void => {
  const url = getBoardUrl(boardCode, locale);
  const message = `${t('ugc.board.shareMessage')}\n${t('ugc.board.createdBy', { name: creatorName })}\n\n${url}`;

  if (navigator.share) {
    navigator.share({ title, text: message, url })
      .then(() => trackShareCompleted('web_share_api', { surface: 'board' }))
      .catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(message)
          .then(() => trackShareCompleted('clipboard', { surface: 'board' }))
          .catch(() => {});
      });
  } else {
    navigator.clipboard.writeText(message).then(() => {
      toast.success(t('share.linkCopied') || 'Link copied!', { duration: 2000, icon: '✅' });
      trackShareCompleted('clipboard', { surface: 'board' });
    }).catch(() => {});
  }
};

/**
 * Get the URL for a word pack
 */
export const getWordPackUrl = (packId: string, locale: string = 'en'): string => {
  if (typeof window === 'undefined') return '';
  const baseUrl = process.env.REACT_APP_PUBLIC_URL || window.location.origin;
  return `${baseUrl}/${locale}/community?tab=packs&pack=${packId}&utm_source=share&utm_medium=pack`;
};

/**
 * Share a word pack
 */
export const shareWordPack = (
  packId: string,
  name: string,
  creatorName: string,
  locale: string,
  t: TranslationFunction
): void => {
  const url = getWordPackUrl(packId, locale);
  const message = `${t('ugc.pack.shareMessage')}\n"${name}" ${t('ugc.board.createdBy', { name: creatorName })}\n\n${url}`;

  if (navigator.share) {
    navigator.share({ title: name, text: message, url })
      .then(() => trackShareCompleted('web_share_api', { surface: 'word_pack' }))
      .catch(() => {
        navigator.clipboard.writeText(message)
          .then(() => trackShareCompleted('clipboard', { surface: 'word_pack' }))
          .catch(() => {});
      });
  } else {
    navigator.clipboard.writeText(message).then(() => {
      toast.success(t('share.linkCopied') || 'Link copied!', { duration: 2000, icon: '✅' });
      trackShareCompleted('clipboard', { surface: 'word_pack' });
    }).catch(() => {});
  }
};
