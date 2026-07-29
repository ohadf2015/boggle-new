/**
 * Locale parity test: top-level `blast.results.*` keys must exist in every locale.
 *
 * Regression guard for the MP Blast results scene at
 * `components/results/BlastResultsScene.tsx`, which calls
 * `t('blast.results.sceneTitle')`, `t('blast.results.finalScore')`, etc.
 *
 * Before this fix, only the SP-only `practiceHub.blast.results.*` block existed,
 * so MP players saw literal keys in their results screen across all 5 languages.
 */

import { en } from '../translations/en.js';
import { he } from '../translations/he.js';
import { sv } from '../translations/sv.js';
import { ja } from '../translations/ja.js';
import { es } from '../translations/es.js';

const LOCALES: Record<string, Record<string, unknown>> = { en, he, sv, ja, es };

const REQUIRED_KEYS = [
  'sceneTitle',
  'finalScore',
  'comboChain',
  'boardClears',
  'gemsCollected',
  'tilesCleared',
  'bestWord',
] as const;

describe('blast.results locale parity (MP results scene)', () => {
  for (const [code, dict] of Object.entries(LOCALES)) {
    describe(`locale: ${code}`, () => {
      const blast = (dict as Record<string, unknown>).blast as Record<string, unknown> | undefined;

      it('has a top-level blast namespace', () => {
        expect(blast).toBeDefined();
        expect(typeof blast).toBe('object');
      });

      it('has a blast.results sub-block', () => {
        expect(blast?.results).toBeDefined();
      });

      for (const key of REQUIRED_KEYS) {
        it(`has blast.results.${key} as a non-empty string`, () => {
          const results = blast?.results as Record<string, unknown> | undefined;
          const val = results?.[key];
          expect(typeof val).toBe('string');
          expect((val as string).length).toBeGreaterThan(0);
        });
      }
    });
  }
});
