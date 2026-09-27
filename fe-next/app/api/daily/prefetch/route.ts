import { NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { generateDailyPuzzle } from '@/utils/dailyChallenge';
import type { Language } from '@/types';

const VALID_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DATES = 3;

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

  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const puzzles = dates.map((date) => {
    const puzzle = generateDailyPuzzle(date, language as Language);
    return {
      date,
      language,
      mode: 'wordhunt',
      payload: { grid: puzzle.grid, targetWord: puzzle.targetWord },
      validUntil: endOfDateUtcMs(date),
    };
  });

  return NextResponse.json({ puzzles });
}
