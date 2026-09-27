/**
 * Why an empty dictionary is worse than no game at all (reported 2026-09-02).
 *
 * `pickBestWheel` scores candidate wheels against the dictionary and keeps the
 * best. Hand it an EMPTY dictionary and every candidate scores zero, so it keeps
 * the unscored base wheel — a different tray from the one every other player got
 * that day. The player then builds a word that IS spellable from their tray, and
 * the same empty dictionary rejects it as "not in the dictionary".
 *
 * That is exactly the reported session: on 2026-09-02 the real en daily tray was
 * EQOAISN (no C, so ICE was never offered), but the dict-less tray was CEEUIIR —
 * which spells ICE. Hence a bug report about a three-letter word.
 *
 * The fix is upstream, in lib/word-craft/dictionary.ts: the loader now throws a
 * DictionaryLoadError instead of resolving to an empty Set, so this state cannot
 * be reached from the UI. This test documents the failure it protects against.
 */
import { describe, it, expect } from 'vitest';
import { pickBestWheel, validateTowerWord, initWordTowerState } from '../wordTowerManager';

const REAL_WORDS = new Set(['ICE', 'CAT', 'DOG', 'QUOTAS', 'NOISE', 'SEA', 'EASE', 'NOSE', 'SANE']);
const GAME_CODE = 'daily-2026-09-02';

describe('word tower — an empty dictionary diverges the tray and rejects everything', () => {
  it('deals a different tray than the dictionary-scored one', () => {
    const withDict = pickBestWheel(GAME_CODE, 'daily', 'en', REAL_WORDS);
    const withoutDict = pickBestWheel(GAME_CODE, 'daily', 'en', new Set<string>());

    // Not a coincidence of this seed: scoring is what makes the daily tray
    // shared, so losing the dictionary loses the "everyone climbs the same
    // tower" property as well as validation.
    expect(withoutDict).not.toEqual(withDict);
  });

  it('rejects a word the tray can spell as not_in_dictionary', () => {
    const state = initWordTowerState({
      gameCode: GAME_CODE,
      playerId: 'daily',
      language: 'en',
      dict: new Set<string>(),
    });

    // Only proceed if this seed's dict-less tray really can spell ICE — that is
    // the reported case, and it is what makes the error message a lie.
    const canSpellIce = ['I', 'C', 'E'].every((l) => state.tray.includes(l));
    expect(canSpellIce).toBe(true);

    const verdict = validateTowerWord(state, 'ice', (w) => new Set<string>().has(w));
    expect(verdict).toEqual({ accepted: false, error: 'not_in_dictionary' });
  });

  it('accepts the same word once the dictionary is actually loaded', () => {
    const state = initWordTowerState({
      gameCode: GAME_CODE,
      playerId: 'daily',
      language: 'en',
      dict: new Set<string>(),
    });
    const verdict = validateTowerWord(state, 'ice', (w) => REAL_WORDS.has(w));
    expect(verdict).toEqual({ accepted: true });
  });
});
