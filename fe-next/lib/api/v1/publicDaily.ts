/**
 * Public, read-only view of the Daily Challenge for /api/v1/daily and the MCP wrapper.
 * The board is deterministic per date+language. Today's answer is never returned;
 * only prior-day boards include `targetWord`.
 */
import { generateDailyPuzzle, getDailyChallengeDate, getPuzzleNumber } from '@/utils/dailyChallenge';
import type { Language, LetterGrid } from '@/types';

export const PUBLIC_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SITE = 'https://www.lexiclash.live';

export interface PublicDailyPuzzle {
  date: string;
  language: Language;
  puzzleNumber: number;
  grid: LetterGrid;
  /** Only present for days before today. */
  targetWord?: string;
  playUrl: string;
}

export function isPublicLanguage(v: unknown): v is Language {
  return typeof v === 'string' && (PUBLIC_LANGUAGES as readonly string[]).includes(v);
}

/** Returns the date to serve (default today), or null if malformed or in the future. */
export function parseDailyDate(raw: string | null | undefined, today: string = getDailyChallengeDate()): string | null {
  if (!raw) return today;
  if (!DATE_RE.test(raw)) return null;
  const ms = Date.parse(`${raw}T00:00:00Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== raw) return null;
  return raw > today ? null : raw;
}

export function buildPublicDailyPuzzle(
  date: string,
  language: Language,
  today: string = getDailyChallengeDate(),
): PublicDailyPuzzle {
  const puzzle = generateDailyPuzzle(date, language);
  return {
    date,
    language,
    puzzleNumber: getPuzzleNumber(date),
    grid: puzzle.grid,
    ...(date < today ? { targetWord: puzzle.targetWord } : {}),
    playUrl: `${SITE}/${language}/daily?ref=agent`,
  };
}

export function buildShareResult(input: {
  date: string;
  language: Language;
  score: number;
  wordsFound: number;
}): { text: string; url: string; imageUrl: string } {
  const url = `${SITE}/${input.language}/daily?ref=agent`;
  return {
    text: `I scored ${input.score} (${input.wordsFound} words) on LexiClash Daily #${getPuzzleNumber(input.date)}. Can you beat it? ${url}`,
    url,
    imageUrl: `${SITE}/api/og?type=daily&date=${input.date}`,
  };
}
