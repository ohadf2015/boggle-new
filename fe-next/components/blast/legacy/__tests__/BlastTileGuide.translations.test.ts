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
import { BLAST_RETIRED_SPECIAL_TYPES } from '../utils/blastWaveConfig';
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

const shownTypes: BlastTileType[] = BLAST_TILE_TYPE_LIST.filter(
  (type) => !BLAST_RETIRED_SPECIAL_TYPES.has(type),
);

describe('blast tile guide translations', () => {
  it('shows at least the core tile roster', () => {
    expect(shownTypes).toContain('standard');
    expect(shownTypes).toContain('bomb');
    expect(shownTypes.length).toBeGreaterThan(3);
  });

  it('never advertises a retired tile', () => {
    for (const type of shownTypes) {
      expect(BLAST_RETIRED_SPECIAL_TYPES.has(type)).toBe(false);
    }
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
