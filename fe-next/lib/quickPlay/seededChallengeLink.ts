/**
 * Stateless "beat my board" link.
 *
 * A challenge row needs a signed-in sender. Guests (and a dead API) used to
 * share a mode-only URL, so a signed-out friend played a different board.
 * The seed and the score to beat ride in the query instead: the recipient
 * needs no account, and the round API regenerates the same board from the seed.
 */
import type { QuickMode } from '@/components/quick-play/types';

export const RESULTS_LOOP_EVENTS = {
  created: 'challenge_created',
  opened: 'challenge_opened',
  rematch: 'rematch_started',
} as const;

const MODES: readonly QuickMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush'];
const SEED_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_SCORE = 50_000;
const MAX_NAME = 24;
const SHARE_UTM = 'utm_source=share&utm_medium=quick_results&utm_campaign=challenge';

export interface SeededChallengeLink {
  mode: QuickMode;
  seed: string;
  score: number;
  scorePct: number;
  name: string | null;
}

export interface BuildSeededChallengeInput {
  origin: string;
  locale: string;
  mode: QuickMode;
  seed: string;
  score: number;
  scorePct: number;
  name?: string | null;
  /** Optional row id. The seed does not depend on it. */
  challengeId?: string | null;
}

function asParams(input: string | URLSearchParams): URLSearchParams {
  if (input instanceof URLSearchParams) return input;
  const raw = input.includes('?') ? input.slice(input.indexOf('?') + 1) : input;
  return new URLSearchParams(raw);
}

function isMode(value: string | null): value is QuickMode {
  return !!value && (MODES as readonly string[]).includes(value);
}

function parseScore(raw: string | null): number | null {
  if (raw == null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > MAX_SCORE) return null;
  return n;
}

function parsePct(raw: string | null): number | null {
  if (raw == null || !/^\d{1,3}(\.\d)?$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

function parseName(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, MAX_NAME);
  return cleaned.length > 0 ? cleaned : null;
}

/** Null means "do not seed" — never invent a board from a partial link. */
export function parseSeededChallenge(input: string | URLSearchParams): SeededChallengeLink | null {
  const params = asParams(input);
  const mode = params.get('cmode');
  const seed = params.get('cseed');
  const score = parseScore(params.get('cscore'));
  const scorePct = parsePct(params.get('cpct'));
  if (!isMode(mode) || !seed || !SEED_RE.test(seed) || score == null || scorePct == null) return null;
  return { mode, seed, score, scorePct, name: parseName(params.get('cname')) };
}

/** Body for POST /api/quick-play/round. Same seed → same board, signed-out included. */
export function seededRoundRequest(
  link: SeededChallengeLink,
  language: string,
): { mode: QuickMode; language: string; seed: string } {
  return { mode: link.mode, language, seed: link.seed };
}

export function buildSeededChallengeUrl(input: BuildSeededChallengeInput): string {
  const params = new URLSearchParams({
    cmode: input.mode,
    cseed: input.seed,
    cscore: String(Math.max(0, Math.round(input.score))),
    cpct: String(Math.round(input.scorePct * 10) / 10),
  });
  const name = parseName(input.name ?? null);
  if (name) params.set('cname', name);
  if (input.challengeId) params.set('challenge', input.challengeId);
  const origin = input.origin.replace(/\/$/, '');
  return `${origin}/${input.locale}/quick-play?${params.toString()}&${SHARE_UTM}`;
}

export function startSameRoomRematch(
  role: 'host' | 'player',
  start: () => void,
  capture: (event: string, props: Record<string, string>) => void,
): void {
  capture(RESULTS_LOOP_EVENTS.rematch, { surface: 'mp_results', role });
  start();
}
