import { describe, it, expect } from 'vitest';
import { getSwedishWordSet } from '../../../server/sharedWordSets';
import svBank from '../../data/clueBank.sv.json';

/**
 * The Swedish clue bank was LLM-generated and never checked against a real
 * dictionary. 156 of 942 answers (16.6%) were not Swedish words at all — a mix
 * of fabrications (`andok`, `arede`, `areia`), misspellings (`apot` for
 * `apotek`, `apel` for `äpple`) and straight English/Latin (`argue`, `argus`,
 * `aries`, `arhat`).
 *
 * Swedish has no baked puzzle pool, so every one of those reached players
 * directly as a generated puzzle's answer. The existing `sv-clue-audit` only
 * scored the *clue text*, which is why this slipped through: `andok`'s clue
 * ("Drivhus eller växthus") reads perfectly well.
 */
describe('Swedish clue bank answers', () => {
  it('are all real Swedish words', () => {
    const dictionary = getSwedishWordSet();
    // Guard the guard: if the word list fails to load, an empty set would make
    // every answer "invalid" and this test would fail for the wrong reason.
    expect(dictionary.size).toBeGreaterThan(100_000);

    const notWords = Object.keys(svBank).filter((answer) => !dictionary.has(answer));

    expect(notWords).toEqual([]);
  });
});
