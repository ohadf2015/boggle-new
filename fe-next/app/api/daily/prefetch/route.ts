import { NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { generateDailyPuzzle, getDailyChallengeDate } from '@/utils/dailyChallenge';
import type { Language } from '@/types';

const VALID_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DATES = 3;
const WINDOW_PAST_DAYS = 7;
const DAY_MS = 86_400_000;
const PUZZLE_MEMO_MAX = 48;

const puzzleMemo = new Map<string, ReturnType<typeof generateDailyPuzzle>>();

function memoPuzzle(date: string, language: Language) {
  const key = `${date}:${language}`;
  const hit = puzzleMemo.get(key);
  if (hit) return hit;
  const puzzle = generateDailyPuzzle(date, language);
  if (puzzleMemo.size >= PUZZLE_MEMO_MAX) puzzleMemo.delete(puzzleMemo.keys().next().value as string);
  puzzleMemo.set(key, puzzle);
  return puzzle;
}

function inWindow(date: string, today: string): boolean {
  const ms = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== date) return false;
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  return ms >= todayMs - WINDOW_PAST_DAYS * DAY_MS && ms <= todayMs + DAY_MS;
}

function endOfDateUtcMs(dateStr: string): number {
  return new Date(`${dateStr}T23:59:59.999Z`).getTime();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const language = url.searchParams.get('language');
  const datesParam = url.searchParams.get('dates');

  if (!language || !(VALID_LANGUAGES as readonly string[]).includes(language)) {
    return NextResponse.json({ error: 'invalid language' }, { status: 400 });
  }

  if (!datesParam) {
    return NextResponse.json({ error: 'dates required' }, { status: 400 });
  }

  const dates = datesParam.split(',').slice(0, MAX_DATES);
  if (dates.some((d) => !DATE_RE.test(d))) {
    return NextResponse.json({ error: 'invalid date format' }, { status: 400 });
  }

  const today = getDailyChallengeDate();
  if (dates.some((d) => !inWindow(d, today))) {
    return NextResponse.json({ error: 'date out of range' }, { status: 400 });
  }

  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const puzzles = dates.map((date) => {
    const puzzle = memoPuzzle(date, language as Language);
    const started = date <= today;
    return {
      date,
      language,
      mode: 'wordhunt',
      payload: started ? { grid: puzzle.grid, targetWord: puzzle.targetWord } : { grid: puzzle.grid },
      validUntil: endOfDateUtcMs(date),
    };
  });

  // private: the route is auth-gated, so a shared cache would serve today's word to signed-out requests.
  return NextResponse.json({ puzzles }, { headers: { 'Cache-Control': 'private, max-age=300' } });
}
