import { NextResponse } from 'next/server';
import type { Locale } from '@/lib/blast/v2/types';
import { buildRegistry, getLevelSourceForLevel } from '@/lib/blast/v2/level-source-registry';

const VALID_LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const levelParam = url.searchParams.get('level');
  const localeParam = url.searchParams.get('locale');

  const levelNumber = Number(levelParam);
  if (!levelParam || !Number.isInteger(levelNumber) || levelNumber < 1) {
    return NextResponse.json({ error: 'invalid level' }, { status: 400 });
  }
  if (!localeParam || !VALID_LOCALES.includes(localeParam as Locale)) {
    return NextResponse.json({ error: 'invalid locale' }, { status: 400 });
  }
  const locale = localeParam as Locale;

  try {
    const registry = buildRegistry();
    const level = await getLevelSourceForLevel(levelNumber, locale, registry).resolve(
      levelNumber,
      locale,
    );
    return NextResponse.json(level, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error('[blast/level] resolve failed:', error);
    return NextResponse.json({ error: 'level not found' }, { status: 404 });
  }
}
