import { describe, it, expect } from 'vitest';

// Dictionary is injected, so tests pass a canonical (UPPERCASE) membership set.
const DICT = new Set(['CAT', 'TAR', 'RAT', 'AREA', 'TREE', 'EATEN', 'TENNIS', 'STARTLE', 'CASA', 'ARROZ']);
const isInDict = (canonWord: string): boolean => DICT.has(canonWord);

import {
  generateTray,
  generateWheel,
  chainLetter,
  chainStartLetter,
  isBuildable,
  lengthBonusM,
  comboMult,
  floorMeters,
  celebrationTier,
  bombChargeForLen,
  biomeForHeight,
  initWordTowerState,
  validateTowerWord,
  applyTowerWord,
  scrambleTray,
  spinWheelPaid,
  serializeWordTowerState,
  restoreWordTowerState,
  WORD_TOWER_SAVE_VERSION,
  rerollStart,
  nextChainAnchor,
  damageTower,
} from '../wordTowerManager';
import {
  WORD_TOWER_TRAY_SIZE,
  WORD_TOWER_WHEEL_SIZE,
  WORD_TOWER_WHEEL_MIN_VOWELS,
  WORD_TOWER_BASE_FLOOR_M,
  WORD_TOWER_SCRAMBLES_START,
  WORD_TOWER_SCRAMBLE_EARN_EVERY_M,
  WORD_TOWER_LETTER_BAGS,
  WORD_TOWER_VOWELS,
} from '@/shared/constants/wordTowerConstants';

describe('wordTowerManager — tray generation', () => {
  it('is deterministic per gameCode+playerId+drawIndex', () => {
    const a = generateTray('GAME1', 'p1', 'en', 0);
    const b = generateTray('GAME1', 'p1', 'en', 0);
    expect(a).toEqual(b);
  });

  it('returns TRAY_SIZE tiles drawn only from the language bag', () => {
    const tray = generateTray('GAME1', 'p1', 'en', 0);
    expect(tray).toHaveLength(WORD_TOWER_TRAY_SIZE);
    const bag = new Set(WORD_TOWER_LETTER_BAGS.en.split(''));
    for (const t of tray) expect(bag.has(t)).toBe(true);
  });
});

describe('wordTowerManager — wheel generation', () => {
  it('is deterministic per gameCode+playerId+drawIndex and differs by draw', () => {
    const a = generateWheel('GAME1', 'p1', 'en', 0);
    const b = generateWheel('GAME1', 'p1', 'en', 0);
    const next = generateWheel('GAME1', 'p1', 'en', 1);
    expect(a).toEqual(b);
    expect(a).not.toEqual(next);
  });

  it('returns WHEEL_SIZE letters drawn only from the language bag', () => {
    const wheel = generateWheel('GAME1', 'p1', 'en', 0);
    expect(wheel).toHaveLength(WORD_TOWER_WHEEL_SIZE);
    const bag = new Set(WORD_TOWER_LETTER_BAGS.en.split(''));
    for (const c of wheel) expect(bag.has(c)).toBe(true);
  });

  it('guarantees the minimum number of vowels so the small ring stays solvable', () => {
    const vowels = new Set(WORD_TOWER_VOWELS.en.split(''));
    for (let i = 0; i < 30; i++) {
      const wheel = generateWheel('G', `p${i}`, 'en', i);
      const vowelCount = wheel.filter((c) => vowels.has(c)).length;
      expect(vowelCount).toBeGreaterThanOrEqual(WORD_TOWER_WHEEL_MIN_VOWELS);
    }
  });
});

describe('wordTowerManager — chain letters (helpers retained)', () => {
  it('English: first and last letters uppercased', () => {
    expect(chainStartLetter('cat', 'en')).toBe('C');
    expect(chainLetter('cat', 'en')).toBe('T');
  });

  it('Hebrew: collapses sofit final form to regular', () => {
    expect(chainLetter('שלום', 'he')).toBe('מ');
  });
});

describe('wordTowerManager — buildability (wheel only, no anchor)', () => {
  it('accepts a word formable from the wheel letters', () => {
    expect(isBuildable('cat', ['C', 'A', 'T', 'X', 'E'], 'en')).toBe(true);
  });

  it('rejects a word missing a needed tile', () => {
    expect(isBuildable('cat', ['A', 'X', 'E'], 'en')).toBe(false); // no C, no T
  });

  it('respects tile counts (each wheel tile used at most once)', () => {
    // CACA needs two C's; the wheel has only one
    expect(isBuildable('caca', ['C', 'A', 'A'], 'en')).toBe(false);
    expect(isBuildable('caca', ['C', 'A', 'C', 'A'], 'en')).toBe(true);
  });
});

describe('wordTowerManager — scoring math', () => {
  it('length bonus ladder', () => {
    expect(lengthBonusM(3)).toBe(0);
    expect(lengthBonusM(5)).toBe(1.5);
    expect(lengthBonusM(7)).toBe(5);
    expect(lengthBonusM(12)).toBe(8); // 8+ clamps to the 8 key
  });

  it('combo multiplier rises then caps at 2.0', () => {
    expect(comboMult(0)).toBeCloseTo(1.0);
    expect(comboMult(5)).toBeCloseTo(1.5);
    expect(comboMult(50)).toBeCloseTo(2.0); // capped
  });

  it('floorMeters = base + lengthBonus * comboMult', () => {
    expect(floorMeters(5, 0)).toBeCloseTo(3.5);
    expect(floorMeters(5, 10)).toBeCloseTo(5.0);
  });

  it('celebration tiers by length', () => {
    expect(celebrationTier(4)).toBe('none');
    expect(celebrationTier(5)).toBe('highRise');
    expect(celebrationTier(6)).toBe('tall');
    expect(celebrationTier(8)).toBe('skyscraper');
  });

  it('bomb charge by length', () => {
    expect(bombChargeForLen(4)).toBe(0);
    expect(bombChargeForLen(5)).toBe(1);
    expect(bombChargeForLen(6)).toBe(2);
    expect(bombChargeForLen(9)).toBe(4); // 7+ -> full bar
  });

  it('biome by height', () => {
    expect(biomeForHeight(0)).toBe('city');
    expect(biomeForHeight(75)).toBe('sky');
    expect(biomeForHeight(900)).toBe('galaxy');
  });
});

describe('wordTowerManager — validate (no chain)', () => {
  function freshState() {
    const s = initWordTowerState({ gameCode: 'G', playerId: 'p1', language: 'en' });
    // Force a known wheel so validation is deterministic in tests.
    s.tray = ['C', 'A', 'T', 'R', 'E', 'S', 'N'];
    return s;
  }

  it('accepts any buildable, real word regardless of its first letter', () => {
    const s = freshState();
    expect(validateTowerWord(s, 'cat', isInDict)).toEqual({ accepted: true });
    // RAT would have broken the old shiritori chain — now it is perfectly fine.
    expect(validateTowerWord(s, 'rat', isInDict)).toEqual({ accepted: true });
  });

  it('rejects a word that is not buildable from the wheel', () => {
    const s = freshState();
    // AREA needs two A's; the wheel has only one.
    expect(validateTowerWord(s, 'area', isInDict)).toEqual({ accepted: false, error: 'not_buildable' });
  });

  it('rejects too-short words', () => {
    const s = freshState();
    expect(validateTowerWord(s, 'at', isInDict)).toEqual({ accepted: false, error: 'too_short' });
  });

  it('rejects a non-dictionary word', () => {
    const s = freshState();
    expect(validateTowerWord(s, 'sec', isInDict)).toMatchObject({ accepted: false }); // buildable but not in DICT
  });

  it('rejects a duplicate word', () => {
    const s = freshState();
    s.usedWords.add('CAT');
    expect(validateTowerWord(s, 'cat', isInDict)).toEqual({ accepted: false, error: 'duplicate' });
  });
});

describe('wordTowerManager — apply', () => {
  function freshState() {
    const s = initWordTowerState({ gameCode: 'G', playerId: 'p1', language: 'en' });
    s.tray = ['C', 'A', 'T', 'R', 'E', 'S', 'N'];
    return s;
  }

  it('adds a floor, increments combo, raises height, and REUSES the same wheel', () => {
    const s = freshState();
    const wheelBefore = [...s.tray];
    const { state, result } = applyTowerWord(s, 'cat');
    expect(state.floors).toHaveLength(1);
    expect(state.combo).toBe(1);
    expect(result.meters).toBeCloseTo(WORD_TOWER_BASE_FLOOR_M + lengthBonusM(3) * comboMult(1));
    expect(state.heightM).toBeCloseTo(result.meters);
    expect(state.anchorLetter).toBe(''); // no chain
    expect(state.usedWords.has('CAT')).toBe(true);
    expect(state.tray).toEqual(wheelBefore); // wheel reused, not consumed/refilled
  });

  it('scales meters by the crane placement multiplier', () => {
    const base = applyTowerWord(freshState(), 'cat').result.meters;
    const { state, result } = applyTowerWord(freshState(), 'cat', 0.5);
    expect(result.meters).toBeCloseTo(base * 0.5);
    expect(state.heightM).toBeCloseTo(base * 0.5);
    expect(state.floors[0].placementMultiplier).toBeCloseTo(0.5);
  });

  it('defaults the placement multiplier to 1 (no crane = unchanged behaviour)', () => {
    const noArg = applyTowerWord(freshState(), 'cat').result.meters;
    const explicitOne = applyTowerWord(freshState(), 'cat', 1).result.meters;
    expect(noArg).toBeCloseTo(explicitOne);
  });

  it('does NOT earn scrambles from climbing (founder 2026-06-26: bonus/buy only)', () => {
    const s = freshState();
    s.heightM = WORD_TOWER_SCRAMBLE_EARN_EVERY_M - 1; // 24m, one floor crosses 25m
    const before = s.scramblesLeft;
    const { state, result } = applyTowerWord(s, 'cat');
    expect(state.scramblesLeft).toBe(before); // climbing no longer refills
    expect(result.scramblesEarned).toBe(0);
  });

  it('scrambleTray spends a banked BONUS scramble, spins a fresh wheel, breaks combo', () => {
    const s = freshState();
    s.combo = 4;
    const before = s.scramblesLeft;
    const next = scrambleTray(s);
    expect(next.scramblesLeft).toBe(before - 1);
    expect(next.combo).toBe(0);
    expect(next.tray).toHaveLength(WORD_TOWER_WHEEL_SIZE);
  });

  it('scrambleTray is a no-op when no bonus scrambles are banked', () => {
    const s = { ...freshState(), scramblesLeft: 0, combo: 3 };
    const next = scrambleTray(s);
    expect(next).toBe(s); // unchanged reference — combo preserved, no spin
  });

  it('spinWheelPaid (coin-bought) spins a fresh wheel + breaks combo WITHOUT spending a bonus', () => {
    const s = { ...freshState(), scramblesLeft: 0, combo: 5 };
    const next = spinWheelPaid(s);
    expect(next.scramblesLeft).toBe(0); // the coin was the price, not a banked scramble
    expect(next.combo).toBe(0);
    expect(next.trayDraws).toBe(s.trayDraws + 1);
    expect(next.tray).toHaveLength(WORD_TOWER_WHEEL_SIZE);
  });

  it('starts with the configured number of scrambles and a full wheel', () => {
    const s = initWordTowerState({ gameCode: 'G', playerId: 'p1', language: 'en' });
    expect(s.scramblesLeft).toBe(WORD_TOWER_SCRAMBLES_START);
    expect(s.tray).toHaveLength(WORD_TOWER_WHEEL_SIZE);
    expect(s.anchorLetter).toBe('');
  });
});

describe('wordTowerManager — serialize/restore', () => {
  const opts = { gameCode: 'G', playerId: 'p1', language: 'en' as const };

  it('round-trips a tower (height, combo, floors, usedWords) with a fresh wheel and no anchor', () => {
    const base = initWordTowerState(opts);
    const s = {
      ...base,
      heightM: 120,
      combo: 4,
      scramblesLeft: 2,
      bombCharge: 3,
      floors: [{ word: 'CAT', len: 3, meters: 2 }],
      usedWords: new Set(['CAT', 'TAR']),
      longestWord: 'CATS',
      longestCombo: 7,
    };
    const blob = serializeWordTowerState(s);
    expect(blob.version).toBe(WORD_TOWER_SAVE_VERSION);

    const r = restoreWordTowerState(opts, blob);
    expect(r.heightM).toBe(120);
    expect(r.combo).toBe(4);
    expect(r.anchorLetter).toBe(''); // chain retired
    expect(r.scramblesLeft).toBe(2);
    expect(r.bombCharge).toBe(3);
    expect(r.floors).toHaveLength(1);
    expect(r.usedWords.has('CAT')).toBe(true);
    expect(r.longestCombo).toBe(7);
    expect(r.tray).toHaveLength(WORD_TOWER_WHEEL_SIZE); // wheel regenerated, not persisted
  });

  it('forces an empty anchor even when restoring a pre-wheel save blob', () => {
    const base = initWordTowerState(opts);
    const blob = serializeWordTowerState({ ...base, anchorLetter: 'T' });
    expect(restoreWordTowerState(opts, blob).anchorLetter).toBe('');
  });

  it('returns a fresh tower for null or wrong-version blobs', () => {
    expect(restoreWordTowerState(opts, null).heightM).toBe(0);
    expect(restoreWordTowerState(opts, { version: 999 } as never).heightM).toBe(0);
  });
});

describe('rerollStart (free fresh wheel)', () => {
  const base = () => initWordTowerState({ gameCode: 'g1', playerId: 'p1', language: 'en' });

  it('breaks the combo, advances trayDraws, keeps a full wheel, no anchor', () => {
    const s = { ...base(), combo: 5 };
    const r = rerollStart(s);
    expect(r.combo).toBe(0);
    expect(r.trayDraws).toBeGreaterThan(s.trayDraws);
    expect(r.tray.length).toBe(WORD_TOWER_WHEEL_SIZE);
    expect(r.anchorLetter).toBe('');
  });

  it('preserves height and floors (it only re-spins the wheel)', () => {
    const s = { ...base(), heightM: 120, floors: [{ word: 'CAT', len: 3, meters: 6 }] };
    const r = rerollStart(s);
    expect(r.heightM).toBe(120);
    expect(r.floors).toHaveLength(1);
  });

  it('retries until the new wheel is viable, then stops', () => {
    const s = base();
    // Accept only a wheel that contains an E; reroll must land on one.
    const r = rerollStart(s, (wheel) => wheel.includes('E'));
    expect(r.tray.includes('E')).toBe(true);
  });

  it('does not hang when no wheel is ever viable (bounded retries)', () => {
    const s = base();
    const r = rerollStart(s, () => false);
    expect(r.combo).toBe(0); // returns after the retry budget
    expect(r.tray.length).toBeGreaterThan(0);
  });
});

describe('nextChainAnchor (helper retained for the versus prototype)', () => {
  it('chains on the last letter for consonant endings', () => {
    expect(nextChainAnchor('CAT', 'en')).toBe('T');
  });
  it('chains on the letter BEFORE a vowel ending', () => {
    expect(nextChainAnchor('AREA', 'en')).toBe('EA');
    expect(nextChainAnchor('PIZZA', 'en')).toBe('ZA');
  });
});

describe('damageTower (hazard ruin)', () => {
  const built = () => ({
    ...initWordTowerState({ gameCode: 'G', playerId: 'p1', language: 'en' as const }),
    floors: [
      { word: 'CAT', len: 3, meters: 10 },
      { word: 'TAR', len: 3, meters: 12 },
      { word: 'RUN', len: 3, meters: 8 },
    ],
    heightM: 30,
    heightHighWaterM: 30,
    combo: 5,
  });

  it('topples the top k floors and drops height by their metres', () => {
    const { state, removed, metersLost } = damageTower(built(), 2);
    expect(removed).toBe(2);
    expect(metersLost).toBe(20); // TAR(12) + RUN(8)
    expect(state.heightM).toBe(10);
    expect(state.floors.map((f) => f.word)).toEqual(['CAT']);
  });

  it('breaks the combo and leaves the wheel/anchor untouched', () => {
    const { state } = damageTower(built(), 2);
    expect(state.combo).toBe(0);
    expect(state.anchorLetter).toBe(''); // no chain to re-anchor
  });

  it('clamps to the floors available, never negative', () => {
    const { state, removed } = damageTower(built(), 99);
    expect(removed).toBe(3);
    expect(state.floors).toHaveLength(0);
    expect(state.heightM).toBe(0);
  });

  it('is a no-op for zero/negative', () => {
    expect(damageTower(built(), 0).removed).toBe(0);
    expect(damageTower(built(), -3).removed).toBe(0);
  });

  it('preserves the high-water mark (anti scramble-farm)', () => {
    expect(damageTower(built(), 2).state.heightHighWaterM).toBe(30);
  });
});

describe('applyTowerWord — high-water guards scramble farming', () => {
  it('does NOT re-earn a scramble when re-climbing below the high-water mark', () => {
    const s = {
      ...initWordTowerState({ gameCode: 'G', playerId: 'p1', language: 'en' as const }),
      tray: ['C', 'A', 'T', 'R', 'E', 'S', 'N'],
      heightM: 10,
      heightHighWaterM: 30,
      scramblesLeft: 0,
      scramblesEarned: 0,
    };
    const { state } = applyTowerWord(s, 'cat');
    expect(state.scramblesLeft).toBe(0);
    expect(state.scramblesEarned).toBe(0);
  });
});
