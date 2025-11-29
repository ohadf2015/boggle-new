import toast from 'react-hot-toast';
import logger from '@/utils/logger';

/**
 * Translation function type
 */
type TranslationFunction = (key: string) => string;

/**
 * Get the join URL for a game room
 * @param gameCode - The game code
 * @returns The full URL to join the game
 */
export const getJoinUrl = (gameCode: string): string => {
  if (typeof window === 'undefined') return '';
  if (!gameCode) return '';
  const publicUrl = process.env.REACT_APP_PUBLIC_URL || window.location.origin;
  return `${publicUrl}?room=${gameCode}`;
};

/**
 * Copy the join URL to clipboard
 * @param gameCode - The game code
 * @param t - Translation function (optional for backward compatibility)
 * @returns Success status
 */
export const copyJoinUrl = async (gameCode: string, t: TranslationFunction | null = null): Promise<boolean> => {
  const url = getJoinUrl(gameCode);

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
  const url = getJoinUrl(gameCode);

  const roomText = roomName ? `\n${t('share.room')}: ${roomName}` : '';
  const message = `🎮 ${t('share.inviteMessage')}\n${roomText}\n${t('share.code')}: ${gameCode}\n\n${t('share.joinViaLink')}:\n${url}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
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
 * Game result data for personalized sharing
 */
export interface GameResultForShare {
  score: number;
  wordCount: number;
  isWinner: boolean;
  achievements?: Array<{ id: string; icon?: string }>;
  longestWord?: string;
  streakDays?: number;
}

/**
 * Generate a personalized share message based on game results
 * @param gameCode - The game code
 * @param result - Game result data
 * @param language - Language code ('en', 'he', 'sv', 'ja')
 * @returns Personalized share message
 */
export const generatePersonalizedShareMessage = (
  gameCode: string,
  result: GameResultForShare,
  language: string = 'en'
): string => {
  const url = getJoinUrl(gameCode);
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
 * Generate random share message variants for A/B testing
 * @param gameCode - The game code
 * @param result - Game result data
 * @param language - Language code
 * @returns Array of message variants
 */
export const getShareMessageVariants = (
  gameCode: string,
  result: GameResultForShare,
  language: string = 'en'
): string[] => {
  const url = getJoinUrl(gameCode);
  const { score, wordCount, isWinner } = result;

  if (language === 'he') {
    return [
      `🎮 מצאתי ${wordCount} מילים ב-LexiClash! תצליחו יותר?\n${url}`,
      `⚡ מבחן מהירות: מצאתי מילים מהר יותר מהחברים שלי! הצטרפו:\n${url}`,
      `📚 ${isWinner ? 'אלוף' : 'שחקן'} מילים פה! בואו ל-LexiClash:\n${url}`,
    ];
  }

  return [
    `🎮 Just found ${wordCount} words in LexiClash! Can you beat that?\n${url}`,
    `⚡ Speed test: I found words faster than my friends! Join me:\n${url}`,
    `📚 Word ${isWinner ? 'champion' : 'enthusiast'} here! Join me in LexiClash:\n${url}`,
    `🏆 ${score} points in LexiClash - beat my score!\n${url}`,
  ];
};
