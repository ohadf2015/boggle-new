import type { Metadata } from 'next';

/**
 * Play, settings and hub screens kept out of Google's index and the sitemap. AdSense
 * reads an indexed app screen as a page with no publisher content; each one's search
 * intent is covered by an indexed landing or guide. Pages stay usable and linked.
 */
export const APP_SCREEN_PATHS = [
  '/daily',
  '/daily/archive',
  '/adventure',
  '/word-tower',
  '/connections',
  '/leaderboard',
  '/community',
  '/teacher/upgrade',
  '/accessibility',
  '/tools',
  '/word-of-the-day',
  '/words',
] as const;

export const APP_SCREEN_ROBOTS: Metadata['robots'] = { index: false, follow: true };

export function isAppScreen(path: string): boolean {
  return (APP_SCREEN_PATHS as readonly string[]).includes(path);
}

export function isAppScreenUrl(url: string): boolean {
  const path = new URL(url).pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
  return isAppScreen(path);
}
