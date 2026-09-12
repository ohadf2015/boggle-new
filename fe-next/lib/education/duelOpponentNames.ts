/**
 * Whose name goes on a duel card.
 *
 * Three sources exist and every one of them can be empty at the moment a card
 * renders:
 *  - the `duel:challenge-received` socket event carries `challengerName`, but
 *    only for the seconds around the challenge, and never after a reload;
 *  - the lobby presence roster has a display name for everyone ONLINE;
 *  - the classroom roster is the only durable one, and a student reading it
 *    through the `profiles(...)` embed can get zero rows with `error: null`
 *    (own-row RLS; the membership FK points at auth.users, not profiles).
 *
 * Measured live 2026-09-12: the roster came back empty, so the async turn card
 * read "YOUR MOVE VS OPPONENT" and the reveal said "OPPONENT" — a duel against
 * a nameless stranger. One source that can silently return nothing is not a
 * source (recurring-pitfalls Class 4), so resolve across all of them and
 * remember the live one for next time.
 */

const STORAGE_PREFIX = 'lexiclash:duel-opponent:';
const STUDENT_PREFIX = 'lexiclash:duel-student:';

function storageKey(duelId: string): string {
  return `${STORAGE_PREFIX}${duelId}`;
}

function studentKey(userId: string): string {
  return `${STUDENT_PREFIX}${userId}`;
}

/**
 * A usable display name: not blank, and not the uuid we were trying to replace.
 */
function usable(candidate: string | undefined | null, challengerId?: string): string | null {
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  if (challengerId && trimmed === challengerId) return null;
  return trimmed;
}

/** Remember the name a live challenge carried, so a reload keeps it. */
export function rememberChallengerName(duelId: string, name: string): void {
  if (typeof window === 'undefined') return;
  const clean = usable(name);
  if (!duelId || !clean) return;
  try {
    window.localStorage.setItem(storageKey(duelId), clean);
  } catch {
    // Blocked storage. The name still shows for this session.
  }
}

export function readChallengerName(duelId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return usable(window.localStorage.getItem(duelId ? storageKey(duelId) : ''));
  } catch {
    return null;
  }
}

/**
 * Remember a classmate's name against their user id.
 *
 * The duel SCREEN has neither a roster nor the challenge event — only an
 * opponent id and `getProfile()`, which hands back a null row with
 * `error: null` for anyone but yourself. Whoever sees a name first (the lobby
 * roster, the challenge dialog, the challenge event) writes it here so the
 * scoreboard and the reveal can say who you just played.
 */
export function rememberStudentName(userId: string, name: string): void {
  if (typeof window === 'undefined') return;
  const clean = usable(name, userId);
  if (!userId || !clean) return;
  try {
    window.localStorage.setItem(studentKey(userId), clean);
  } catch {
    // Blocked storage — the caller's own render still has the name.
  }
}

export function readStudentName(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  if (!userId) return null;
  try {
    return usable(window.localStorage.getItem(studentKey(userId)), userId);
  } catch {
    return null;
  }
}

export interface ResolveDuelOpponentNameArgs {
  duelId: string;
  /** The other student's user id — the key both roster maps use. */
  challengerId: string;
  /** duelId -> name, straight off the `duel:challenge-received` event. */
  fromChallenge?: Record<string, string>;
  /** userId -> display name, from the live lobby presence roster. */
  fromPresence?: Record<string, string>;
  /** userId -> name, from the classroom roster (can legitimately be empty). */
  fromRoster?: Record<string, string>;
  /** Translated last resort, e.g. t('common.opponent'). */
  fallback: string;
}

/**
 * Most trustworthy first: the event that named them, then who is online now,
 * then the persisted roster, then what we remembered from an earlier session.
 */
export function resolveDuelOpponentName({
  duelId,
  challengerId,
  fromChallenge,
  fromPresence,
  fromRoster,
  fallback,
}: ResolveDuelOpponentNameArgs): string {
  return (
    usable(fromChallenge?.[duelId], challengerId) ??
    usable(fromPresence?.[challengerId], challengerId) ??
    usable(fromRoster?.[challengerId], challengerId) ??
    readChallengerName(duelId) ??
    readStudentName(challengerId) ??
    fallback
  );
}
