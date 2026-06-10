import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { WORD_TOWER_BIOMES, type WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';
import { ALL_MUTATOR_IDS, shareLabelForMutatorId, type MutatorId } from '@/lib/wordTower/dailyMutators';
import logger from '@/backend/utils/logger';

export const runtime = 'nodejs';

const CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400';
const BIOME_IDS = new Set<string>(WORD_TOWER_BIOMES.map((b) => b.id));

function clampNum(v: string | null, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// Drop control + invisible/formatting code points (codepoint checks avoid
// embedding literal invisible characters in source).
function safeText(v: string | null, max: number): string {
  let out = '';
  for (const ch of v ?? '') {
    const c = ch.codePointAt(0) ?? 0;
    const invisible =
      c < 0x20 || (c >= 0x7f && c <= 0x9f) || (c >= 0x200b && c <= 0x200f) || c === 0xfeff;
    if (!invisible) out += ch;
  }
  return out.trim().slice(0, max);
}

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    const heightM = clampNum(q.get('h'), 0, 1e7, 0);
    const floors = Math.round(clampNum(q.get('f'), 0, 1e6, 0));
    const biomeParam = q.get('b') ?? 'city';
    const biomeId = (BIOME_IDS.has(biomeParam) ? biomeParam : 'city') as WordTowerBiomeId;
    const topWord = safeText(q.get('w'), 16);
    const name = safeText(q.get('n'), 18);
    // Daily twist label — only when `m` is a known mutator id (else omitted).
    const mParam = q.get('m');
    const mutatorLabel = ALL_MUTATOR_IDS.includes(mParam as MutatorId)
      ? shareLabelForMutatorId(mParam as MutatorId)
      : '';

    const [{ default: React }, { renderToStaticMarkup }, { default: WordTowerShareCard }] = await Promise.all([
      import('react'),
      import('react-dom/server'),
      import('@/components/wordTower/WordTowerShareCard'),
    ]);

    const svg = renderToStaticMarkup(
      React.createElement(WordTowerShareCard, { heightM, floors, biomeId, topWord, name, mutatorLabel }),
    );

    const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': CACHE },
    });
  } catch (err) {
    logger.error?.('WORD_TOWER_SHARE', `render failed: ${(err as Error).message}`);
    return new NextResponse('render error', { status: 500 });
  }
}
