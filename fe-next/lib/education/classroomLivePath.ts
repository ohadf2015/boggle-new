/** The route itself says "classroom": every link is built here and every reader asks readClassroomLiveFlags. */

const LIVE_PATH_RE = /^(?:\/[a-z]{2})?\/education\/live\/?$/;
const LEGACY_MP_RE = /^(\/[a-z]{2})?\/multiplayer\/?$/;

export interface ClassroomLivePathOptions {
  host?: boolean;
  /** Host only: open the board with the teacher's own student view beside it. */
  practice?: boolean;
}

export function classroomLivePath(locale: string, gameCode: string, { host = false, practice = false }: ClassroomLivePathOptions = {}): string {
  const room = `room=${encodeURIComponent(gameCode)}`;
  return `/${locale}/education/live?${room}${host ? '&host=1' : ''}${host && practice ? '&practice=1' : ''}`;
}

/** The student page the teacher plays from in a practice run (frame, new tab or phone). Never a host page. */
export function practiceSeatPath(locale: string, gameCode: string): string {
  return `/${locale}/education/live?room=${encodeURIComponent(gameCode)}&practiceSeat=1`;
}

export function isClassroomLivePathname(pathname: string | null | undefined): boolean {
  return !!pathname && LIVE_PATH_RE.test(pathname);
}

function isHostParam(value: string | null): boolean {
  return value === '1' || value === 'true';
}

export interface ClassroomLiveFlags {
  isClassroomMode: boolean;
  isClassroomHost: boolean;
  /** Host board with the practice student view beside it. */
  isPracticeRun: boolean;
}

/** Live route implies classroom; the legacy `/multiplayer?classroom=true` flags still read the same. */
export function readClassroomLiveFlags(
  pathname: string | null | undefined,
  params: Pick<URLSearchParams, 'get'> | null | undefined,
): ClassroomLiveFlags {
  const onLiveRoute = isClassroomLivePathname(pathname);
  const isClassroomMode = onLiveRoute || params?.get('classroom') === 'true';
  // A practice seat page is a student page, whatever else its URL says.
  const isPracticeSeat = params?.get('practiceSeat') === '1';
  const isClassroomHost = !isPracticeSeat && isHostParam(params?.get('host') ?? null);
  return {
    isClassroomMode,
    isClassroomHost,
    isPracticeRun: isClassroomHost && params?.get('practice') === '1',
  };
}

/** Where an old `/multiplayer?classroom=true…` link now lives, or null when it is not one. */
export function legacyClassroomLiveRedirect(pathname: string, search: string): string | null {
  const match = LEGACY_MP_RE.exec(pathname);
  if (!match) return null;
  const params = new URLSearchParams(search);
  if (params.get('classroom') !== 'true') return null;
  const prefix = match[1] ?? '';
  const room = params.get('room');
  const next = new URLSearchParams();
  if (room) next.set('room', room);
  if (room && isHostParam(params.get('host'))) next.set('host', '1');
  const query = next.toString();
  return `${prefix}/education/live${query ? `?${query}` : ''}`;
}
