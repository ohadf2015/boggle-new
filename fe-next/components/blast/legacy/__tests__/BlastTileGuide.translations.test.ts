/**
 * Regression: BlastTileGuide renders BLAST_TILE_TYPE_LIST verbatim, so it
 *   a) asked for `blast.tileGuide.<type>.name/.desc` for chocolate/cake/locked/key,
 *      which no language ever had -> 8 "Translation missing" issues in Sentry
 *      (JAVASCRIPT-NEXTJS-1YT/1YV/1YW/1YX/1YY/1YZ/1Z0/1Z1), and
 *   b) advertised retired tiles that can never spawn.
 *
 * This test is the guardrail: a new tile type cannot ship without its strings in
 * every language, and a retired tile cannot leak back into the guide.
 */
import { BLAST_TILE_TYPE_LIST, type BlastTileType } from '@/shared/types/blast';
import { en } from '@/translations/en';
import { es } from '@/translations/es';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';

type Guide = Record<string, { name?: string; desc?: string } | string | undefined>;

const CATALOGUES: [string, unknown][] = [
  ['en', en], ['es', es], ['he', he], ['sv', sv], ['ja', ja], ['ru', ru],
];

const guideOf = (catalogue: unknown): Guide =>
  ((catalogue as { blast?: { tileGuide?: Guide } }).blast?.tileGuide ?? {}) as Guide;

const shownTypes: readonly BlastTileType[] = BLAST_TILE_TYPE_LIST;

describe('blast tile guide translations', () => {
  it('shows exactly the live roster', () => {
    expect([...shownTypes].sort()).toEqual(['bomb', 'diamond', 'gold', 'standard']);
  });

  it.each(CATALOGUES)('has a name and desc for every shown tile in %s', (_lang, catalogue) => {
    const guide = guideOf(catalogue);
    const missing: string[] = [];
    for (const type of shownTypes) {
      const entry = guide[type];
      if (!entry || typeof entry === 'string' || !entry.name || !entry.desc) {
        missing.push(type);
      }
    }
    expect(missing).toEqual([]);
  });
});
