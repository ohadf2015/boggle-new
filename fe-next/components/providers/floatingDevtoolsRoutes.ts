import { isEducationPath } from '@/lib/navigation/sectionHome';

const LOCALE_MULTIPLAYER = /^\/[a-z]{2}\/multiplayer\/?$/;

/** Education and classroom-room surfaces keep primary actions bottom-right, where a floating devtools bubble would sit on them. */
export function hidesFloatingDevtools(pathname: string, search: string): boolean {
  if (!pathname) return false;
  if (isEducationPath(pathname)) return true;
  if (!LOCALE_MULTIPLAYER.test(pathname.split('?')[0])) return false;
  return new URLSearchParams(search.replace(/^\?/, '')).get('classroom') === 'true';
}
