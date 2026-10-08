/**
 * Destinations for education exits that were decided inline in components or
 * hooks. Kept pure so the route matrix can pin them.
 */
import { educationHomeFor } from '@/lib/navigation/educationBackHref';

/** Quick Play opened from the student Academy goes back to the Academy, not the arcade home. */
export function quickPlayBackHref(locale: string, academy: boolean): string | undefined {
  return academy ? `/${locale}/student` : undefined;
}

/** A join that resolves to a live game walks straight into the room, keeping classroom context. */
export function joinSuccessHref(locale: string, gameCode: string | null | undefined): string {
  return gameCode ? `/${locale}/multiplayer?room=${gameCode}&classroom=true` : `/${locale}/student`;
}

const CLASSROOM_GAME_RE = /^\/([a-z]{2})\/education\/classroom-game\/?$/;

/**
 * Android back on classroom-game for a teacher. The landing replaces an approved
 * teacher straight back onto this page, so the URL parent would loop. Null means
 * "no override, use the URL parent".
 */
export function classroomGameAndroidBackHref(pathname: string | null | undefined, isTeacher: boolean): string | null {
  const match = CLASSROOM_GAME_RE.exec(pathname || '');
  return match && isTeacher ? educationHomeFor(match[1], 'teacher') : null;
}
