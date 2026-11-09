/**
 * Pages where the proxy refreshes the Supabase session before render. API routes
 * handle their own auth; public pages skip it for faster navigation.
 */
import { eduSectionOf, type EduSection } from './eduSections';

const GAME_ROUTES = [
  '/multiplayer', '/education/live', '/singleplayer', '/adventure', '/daily',
  '/challenge', '/brain', '/custom', '/party-screen',
  '/auth', '/settings', '/profile',
];

// The role hub (/classroom) routes by the signed-in role, so it needs a fresh session too.
const SIGNED_IN_EDU_SECTIONS: readonly EduSection[] = ['teacher', 'student', 'join', 'classroom'];

const LOCALE_PREFIX = /^\/(en|he|sv|ja|es|ru)/;

export function needsSessionRefresh(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const section = eduSectionOf(pathname);
  if (section && SIGNED_IN_EDU_SECTIONS.includes(section)) return true;
  const path = pathname.replace(LOCALE_PREFIX, '');
  return GAME_ROUTES.some((route) => path.startsWith(route));
}
