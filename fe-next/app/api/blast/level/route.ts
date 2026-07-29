import { NextResponse } from 'next/server';
import type { Locale } from '@/lib/blast/v2/types';
import { buildRegistry, getLevelSourceForLevel } from '@/lib/blast/v2/level-source-registry';
import { isVariantShape } from '@/lib/blast/v2/dailyVariant';

const VALID_LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const levelParam = url.searchParams.get('level');
  const localeParam = url.searchParams.get('locale');
  const variantParam = url.searchParams.get('variant');

  const levelNumber = Number(levelParam);
  if (!levelParam || !Number.isInteger(levelNumber) || levelNumber < 1) {
    return NextResponse.json({ error: 'invalid level' }, { status: 400 });
  }
  if (!localeParam || !VALID_LOCALES.includes(localeParam as Locale)) {
    return NextResponse.json({ error: 'invalid locale' }, { status: 400 });
  }
  const locale = localeParam as Locale;

  // Daily variant salt — reshuffles the generated board per UTC day. Curated /
  // chain packs ignore the salt so hand-authored content stays stable. Reject
  // malformed shapes so callers can't smuggle arbitrary state into the seed.
  const variantSalt = variantParam && isVariantShape(variantParam) ? variantParam : undefined;

  // Resolution chain: primary source → generator fallback. Chain & curated
  // packs can fail to isolate words within their 500-attempt budget; when that
  // happens we silently degrade to the generator instead of 404ing the player
  // into a "more levels coming soon" dead-end mid-run.
  const registry = buildRegistry();
  const primary = getLevelSourceForLevel(levelNumber, locale, registry);
  try {
    const level = await primary.resolve(levelNumber, locale, undefined, variantSalt);
    return NextResponse.json(level, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (primaryError) {
    if (primary !== registry.generated) {
      try {
        const level = await registry.generated.resolve(levelNumber, locale, undefined, variantSalt);
        return NextResponse.json(level, {
          headers: { 'Cache-Control': 'public, max-age=3600' },
        });
      } catch (fallbackError) {
        console.error('[blast/level] generator fallback failed:', fallbackError);
      }
    }
    console.error('[blast/level] resolve failed:', primaryError);
    return NextResponse.json({ error: 'level not found' }, { status: 404 });
  }
}
