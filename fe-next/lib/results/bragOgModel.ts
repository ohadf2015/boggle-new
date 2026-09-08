/**
 * Pure model behind the brag OG image (`app/api/og/brag`).
 *
 * Split out from the route so the sanitising is testable without rendering an
 * image. EVERY field here arrives in a URL the player can hand-edit and is then
 * drawn into an image served from our own domain, so this is a trust boundary:
 * numbers are clamped, the mode label is an allowlist rather than free text, and
 * the rival name is stripped and truncated. Nothing renders raw input.
 */

export type BragOutcome = 'won' | 'lost' | 'tie' | 'solo';

export interface BragOgModel {
  outcome: BragOutcome;
  score: number;
  rivalScore: number | null;
  rivalName: string | null;
  modeLabel: string;
  words: number | null;
  bestWord: string | null;
  /** Bar width percentages, scaled against the higher of the two scores. */
  youPct: number;
  rivalPct: number;
}

const MAX_SCORE = 9_999_999;
const MAX_NAME = 16;
/** A zero score still needs a visible stub, or the row reads as missing data. */
export const BRAG_OG_MIN_BAR_PCT = 4;

/** Allowlist. An arbitrary `mode` param would make this an open text surface. */
const MODE_LABELS: Record<string, string> = {
  classic: 'ARENA',
  'word-hunt': 'WORD HUNT',
  blast: 'BLAST',
  'wheel-rush': 'WHEEL RUSH',
  'word-wheel': 'WORD WHEEL',
  'word-tower': 'WORD TOWER',
  survival: 'SURVIVAL',
  singleplayer: 'SOLO',
  practice: 'PRACTICE',
  daily: 'DAILY',
  random: 'ARENA',
};

const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu;

function toCount(raw: string | null, max: number): number | null {
  if (raw == null || raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), max);
}

/** Letters only, and only a length a real board word could produce. */
function cleanBestWord(raw: string | null): string | null {
  if (!raw) return null;
  const stripped = raw.replace(EMOJI, '').trim();
  if (!/^\p{L}{2,20}$/u.test(stripped)) return null;
  return stripped.toUpperCase();
}

function cleanName(raw: string | null): string | null {
  if (!raw) return null;
  const stripped = raw
    .replace(EMOJI, '')
    // Control chars, newlines and zero-width joiners would break the layout.
    .replace(/[\p{C}\p{Zl}\p{Zp}\s]+/gu, ' ')
    .trim();
  if (!stripped) return null;
  return stripped.slice(0, MAX_NAME);
}

function barPct(value: number, peak: number): number {
  if (peak <= 0) return BRAG_OG_MIN_BAR_PCT;
  return Math.max(BRAG_OG_MIN_BAR_PCT, Math.round((value / peak) * 100));
}

export function deriveBragOgModel(sp: URLSearchParams): BragOgModel {
  const score = toCount(sp.get('score'), MAX_SCORE) ?? 0;
  const rivalScore = toCount(sp.get('rival'), MAX_SCORE);
  const rivalName = cleanName(sp.get('name'));
  const words = toCount(sp.get('words'), 9999);
  const bestWord = cleanBestWord(sp.get('best'));

  const modeLabel = MODE_LABELS[sp.get('mode') ?? ''] ?? 'ARENA';

  let outcome: BragOutcome;
  if (rivalScore == null) outcome = 'solo';
  else if (score > rivalScore) outcome = 'won';
  else if (score < rivalScore) outcome = 'lost';
  else outcome = 'tie';

  // Scaled against the HIGHER score, not the sum: against the sum a 142-118
  // round and a 900-880 round both collapse to two half-width bars and every
  // result looks like a dead heat.
  const peak = Math.max(score, rivalScore ?? 0);

  return {
    outcome,
    score,
    rivalScore,
    rivalName,
    modeLabel,
    words,
    bestWord,
    youPct: barPct(score, peak),
    rivalPct: rivalScore == null ? 0 : barPct(rivalScore, peak),
  };
}
