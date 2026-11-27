/**
 * GET /api/v1/daily?date=YYYY-MM-DD&language=en
 * Public, read-only Daily Challenge board (same board for every player worldwide).
 * Today's answer is withheld; prior days include `targetWord`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { buildPublicDailyPuzzle, isPublicLanguage, parseDailyDate } from '@/lib/api/v1/publicDaily';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sp = request.nextUrl.searchParams;
  const language = sp.get('language') ?? 'en';
  if (!isPublicLanguage(language)) {
    return NextResponse.json({ error: 'invalid language' }, { status: 400 });
  }
  const date = parseDailyDate(sp.get('date'));
  if (!date) {
    return NextResponse.json({ error: 'invalid date' }, { status: 400 });
  }
  return NextResponse.json(buildPublicDailyPuzzle(date, language), {
    headers: { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' },
  });
}
