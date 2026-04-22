/**
 * Catalog/evaluator parity — every RUNE_CATALOG id must have a registered
 * evaluator in runeEngine.ts. A tiny allowlist covers runes whose effects are
 * implemented outside the scoring pipeline (run/grid/timer managers).
 */

import { RUNE_CATALOG } from '../runeCatalog';
import { hasEvaluator } from '../runeEngine';

/**
 * Runes that intentionally have null-returning evaluators because their
 * effects are applied elsewhere:
 *   - timeWarp: run timer manager
 *   - hintWhisper: hint system
 *   - bigGrid: grid generation
 */
const NON_SCORING_RUNES = new Set(['timeWarp', 'hintWhisper', 'bigGrid']);

describe('rune catalog / evaluator parity', () => {
  it('registers an evaluator for every catalog rune id', () => {
    const missing = RUNE_CATALOG
      .map(r => r.id)
      .filter(id => !hasEvaluator(id));
    expect(missing).toEqual([]);
  });

  it('catalog has no duplicate ids', () => {
    const ids = RUNE_CATALOG.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('non-scoring allowlist entries are all present in the catalog', () => {
    const catalogIds = new Set(RUNE_CATALOG.map(r => r.id));
    for (const id of NON_SCORING_RUNES) {
      expect(catalogIds.has(id)).toBe(true);
    }
  });
});
