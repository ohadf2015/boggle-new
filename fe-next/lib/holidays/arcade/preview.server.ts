import { NextResponse, type NextRequest } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { HOLIDAY_KEYS } from '../calendar';
import { HOLIDAY_LOCALES, parseHolidayInput } from '../holidayRequest.server';
import { ARCADE_GAMES, isArcadeGame } from './games';

export async function previewRound(request: NextRequest): Promise<NextResponse | null> {
  const body = (await request.clone().json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || parseHolidayInput(body)) return null;
  const { holiday, game, locale } = body;
  if (typeof holiday !== 'string' || !(HOLIDAY_KEYS as readonly string[]).includes(holiday)) return null;
  if (!isArcadeGame(game) || ARCADE_GAMES[game].holiday !== holiday) return null;
  if (!checkApiRateLimit(request, 'holiday-arcade-preview', { maxRequests: 30, windowMs: 60_000 }).success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const l = typeof locale === 'string' ? locale.slice(0, 2) : 'en';
  const lang = (HOLIDAY_LOCALES as readonly string[]).includes(l) ? l : 'en';
  const seed = 1 + Math.floor(Math.random() * (2 ** 31 - 2));
  return NextResponse.json({ roundId: null, game, lang, seconds: ARCADE_GAMES[game].seconds, content: { seed } });
}
