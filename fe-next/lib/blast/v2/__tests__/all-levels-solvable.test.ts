import { describe, expect, it } from 'vitest';
import type { Locale } from '../types';
import { verifyAllChainLevels } from '../solvability-verifier';

const CHAIN_LOCALES: Locale[] = ['en', 'he'];

describe('blast v2 — every shipped chain level is solvable', () => {
  for (const locale of CHAIN_LOCALES) {
    it(`all ${locale} chain levels build + pass validator`, async () => {
      const results = await verifyAllChainLevels(locale);
      const failures = results.filter((r) => !r.ok);
      if (failures.length > 0) {
        const detail = failures
          .map((f) => `  ${f.id} (lvl ${f.levelNumber}): ${(f as { reason: string }).reason}`)
          .join('\n');
        throw new Error(`${failures.length}/${results.length} ${locale} levels unsolvable:\n${detail}`);
      }
      expect(failures).toHaveLength(0);
      expect(results.length).toBeGreaterThan(0);
    }, 300_000);
  }
});
