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
