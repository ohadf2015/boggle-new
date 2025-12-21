/**
 * Dynamic OG Image Share Utilities
 *
 * Generates shareable URLs that include personalized Open Graph images
 * for better social media previews.
 */

const BASE_URL = typeof window !== 'undefined'
  ? `${window.location.origin}`
  : 'https://www.lexiclash.live';

/**
 * Generate a shareable URL with dynamic OG image for a player's score
 */
export function getScoreShareUrl(params: {
  player: string;
  score: number;
  locale?: string;
}): string {
  const ogImageUrl = new URL('/api/og', BASE_URL);
  ogImageUrl.searchParams.set('player', params.player);
  ogImageUrl.searchParams.set('score', String(params.score));
  if (params.locale) {
    ogImageUrl.searchParams.set('locale', params.locale);
  }
  return ogImageUrl.toString();
}

/**
 * Generate a shareable URL with dynamic OG image for a room invite
 */
export function getRoomShareUrl(roomCode: string, locale?: string): string {
  const ogImageUrl = new URL('/api/og', BASE_URL);
  ogImageUrl.searchParams.set('room', roomCode);
  if (locale) {
    ogImageUrl.searchParams.set('locale', locale);
  }
  return ogImageUrl.toString();
}

/**
 * Generate a shareable URL with dynamic OG image for an achievement
 */
export function getAchievementShareUrl(achievementId: string, locale?: string): string {
  const ogImageUrl = new URL('/api/og', BASE_URL);
  ogImageUrl.searchParams.set('achievement', achievementId);
  if (locale) {
    ogImageUrl.searchParams.set('locale', locale);
  }
  return ogImageUrl.toString();
}

/**
 * Generate a shareable URL with dynamic OG image for a streak milestone
 */
export function getStreakShareUrl(streakDays: number, locale?: string): string {
  const ogImageUrl = new URL('/api/og', BASE_URL);
  ogImageUrl.searchParams.set('streak', String(streakDays));
  if (locale) {
    ogImageUrl.searchParams.set('locale', locale);
  }
  return ogImageUrl.toString();
}

/**
 * Generate Open Graph meta tags for dynamic image
 */
export function getOgMetaTags(type: 'score' | 'room' | 'achievement' | 'streak', params: {
  player?: string;
  score?: number;
  roomCode?: string;
  achievementId?: string;
  streakDays?: number;
  locale?: string;
}): { property: string; content: string }[] {
  let imageUrl: string;

  switch (type) {
    case 'score':
      imageUrl = getScoreShareUrl({
        player: params.player || 'Player',
        score: params.score || 0,
        locale: params.locale,
      });
      break;
    case 'room':
      imageUrl = getRoomShareUrl(params.roomCode || '', params.locale);
      break;
    case 'achievement':
      imageUrl = getAchievementShareUrl(params.achievementId || '', params.locale);
      break;
    case 'streak':
      imageUrl = getStreakShareUrl(params.streakDays || 0, params.locale);
      break;
  }

  return [
    { property: 'og:image', content: imageUrl },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'twitter:image', content: imageUrl },
    { property: 'twitter:card', content: 'summary_large_image' },
  ];
}

/**
 * Share content with dynamic OG image using Web Share API
 */
export async function shareWithOgImage(params: {
  title: string;
  text: string;
  url: string;
  imageUrl?: string;
}): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({
        title: params.title,
        text: params.text,
        url: params.url,
      });
      return true;
    } catch {
      // User cancelled or error
      return false;
    }
  }
  return false;
}
