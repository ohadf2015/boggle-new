/** The route itself says "classroom": every link is built here and every reader asks readClassroomLiveFlags. */

const LIVE_PATH_RE = /^(?:\/[a-z]{2})?\/education\/live\/?$/;
const LEGACY_MP_RE = /^(\/[a-z]{2})?\/multiplayer\/?$/;

export interface ClassroomLivePathOptions {
  host?: boolean;
}

export function classroomLivePath(locale: string, gameCode: string, { host = false }: ClassroomLivePathOptions = {}): string {
  const room = `room=${encodeURIComponent(gameCode)}`;
  return `/${locale}/education/live?${room}${host ? '&host=1' : ''}`;
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
}

/** Live route implies classroom; the legacy `/multiplayer?classroom=true` flags still read the same. */
export function readClassroomLiveFlags(
  pathname: string | null | undefined,
  params: Pick<URLSearchParams, 'get'> | null | undefined,
): ClassroomLiveFlags {
  const onLiveRoute = isClassroomLivePathname(pathname);
  const isClassroomMode = onLiveRoute || params?.get('classroom') === 'true';
  return {
    isClassroomMode,
    isClassroomHost: isHostParam(params?.get('host') ?? null),
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
