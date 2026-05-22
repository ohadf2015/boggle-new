import { describe, it, expect } from 'vitest';

// Dictionary is injected, so tests pass a canonical (UPPERCASE) membership set.
const DICT = new Set(['CAT', 'TAR', 'RAT', 'AREA', 'TREE', 'EATEN', 'TENNIS', 'STARTLE', 'CASA', 'ARROZ']);
const isInDict = (canonWord: string): boolean => DICT.has(canonWord);

import {
  generateTray,
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
  serializeWordTowerState,
  restoreWordTowerState,
  WORD_TOWER_SAVE_VERSION,
} from '../wordTowerManager';
import {
  WORD_TOWER_TRAY_SIZE,
  WORD_TOWER_BASE_FLOOR_M,
  WORD_TOWER_SCRAMBLES_START,
  WORD_TOWER_SCRAMBLE_EARN_EVERY_M,
  WORD_TOWER_LETTER_BAGS,
} from '@/shared/constants/wordTowerConstants';

describe('wordTowerManager — tray generation', () => {
  it('is deterministic per gameCode+playerId+drawIndex', () => {
    const a = generateTray('GAME1', 'p1', 'en', 0);
    const b = generateTray('GAME1', 'p1', 'en', 0);
    expect(a).toEqual(b);
  });

  it('differs by player and by draw index', () => {
    const p1 = generateTray('GAME1', 'p1', 'en', 0);
    const p2 = generateTray('GAME1', 'p2', 'en', 0);
    const next = generateTray('GAME1', 'p1', 'en', 1);
    expect(p1).not.toEqual(p2);
    expect(p1).not.toEqual(next);
  });

  it('returns TRAY_SIZE tiles drawn only from the language bag', () => {
    const tray = generateTray('GAME1', 'p1', 'en', 0);
    expect(tray).toHaveLength(WORD_TOWER_TRAY_SIZE);
    const bag = new Set(WORD_TOWER_LETTER_BAGS.en.split(''));
    for (const t of tray) expect(bag.has(t)).toBe(true);
  });
});

describe('wordTowerManager — chain letters', () => {
  it('English: first and last letters uppercased', () => {
    expect(chainStartLetter('cat', 'en')).toBe('C');
    expect(chainLetter('cat', 'en')).toBe('T');
  });

  it('Hebrew: collapses sofit final form to regular for the chain', () => {
    // שלום ends in ם (sofit mem) -> chain letter is regular מ
    expect(chainLetter('שלום', 'he')).toBe('מ');
  });

  it('Spanish: strips accents in the chain boundary', () => {
    expect(chainLetter('café', 'es')).toBe('E');
  });
});

describe('wordTowerManager — buildability', () => {
  const anchor = 'C';
  it('accepts a word starting with the anchor and buildable from the tray', () => {
    // CAT: anchor provides C, tray provides A and T
    expect(isBuildable('cat', ['A', 'T', 'X', 'E'], anchor, 'en')).toBe(true);
  });

  it('rejects a word missing a needed tile', () => {
    expect(isBuildable('cat', ['A', 'X', 'E'], anchor, 'en')).toBe(false);
  });

  it('respects tile counts (anchor gives only one instance)', () => {
    // CACA needs two C's; anchor gives one, tray has none
    expect(isBuildable('caca', ['A', 'A'], anchor, 'en')).toBe(false);
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
    // 5-letter at combo 0 (mult 1.0): 2.0 + 1.5*1.0 = 3.5
    expect(floorMeters(5, 0)).toBeCloseTo(3.5);
    // 5-letter at combo 10 (mult 2.0): 2.0 + 1.5*2.0 = 5.0
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

describe('wordTowerManager — validate', () => {
  function freshState() {
    const s = initWordTowerState({ gameCode: 'G', playerId: 'p1', language: 'en' });
    // Force a known anchor + tray so validation is deterministic in tests.
    s.anchorLetter = 'C';
    s.tray = ['A', 'T', 'R', 'E', 'A', 'E', 'N', 'T', 'I', 'S', 'L', 'T'];
    return s;
  }

  it('accepts a valid chained, buildable, dictionary word', () => {
    const s = freshState();
    expect(validateTowerWord(s, 'cat', isInDict)).toEqual({ accepted: true });
  });

  it('rejects a word that breaks the chain', () => {
    const s = freshState();
    expect(validateTowerWord(s, 'rat', isInDict)).toEqual({ accepted: false, error: 'bad_chain' });
  });

  it('rejects too-short words', () => {
    const s = freshState();
    s.anchorLetter = 'A';
    expect(validateTowerWord(s, 'at', isInDict)).toEqual({ accepted: false, error: 'too_short' });
  });

  it('rejects a non-dictionary word', () => {
    const s = freshState();
    expect(validateTowerWord(s, 'ctt', isInDict)).toMatchObject({ accepted: false });
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
    s.anchorLetter = 'C';
    s.tray = ['A', 'T', 'R', 'E', 'A', 'E', 'N', 'T', 'I', 'S', 'L', 'T'];
    return s;
  }

  it('adds a floor, increments combo, raises height, and sets the next anchor', () => {
    const s = freshState();
    const { state, result } = applyTowerWord(s, 'cat');
    expect(state.floors).toHaveLength(1);
    expect(state.combo).toBe(1);
    expect(result.meters).toBeCloseTo(WORD_TOWER_BASE_FLOOR_M + lengthBonusM(3) * comboMult(1));
    expect(state.heightM).toBeCloseTo(result.meters);
    expect(state.anchorLetter).toBe('T'); // last letter of CAT
    expect(state.usedWords.has('CAT')).toBe(true);
    expect(state.tray).toHaveLength(WORD_TOWER_TRAY_SIZE); // refilled
  });

  it('earns a scramble when crossing the meter threshold', () => {
    const s = freshState();
    s.heightM = WORD_TOWER_SCRAMBLE_EARN_EVERY_M - 1; // 24m, one floor crosses 25m
    const before = s.scramblesLeft;
    const { state } = applyTowerWord(s, 'cat');
    expect(state.scramblesLeft).toBe(before + 1);
  });

  it('scrambleTray rerolls the tray, spends a scramble, and breaks the combo', () => {
    const s = freshState();
    s.combo = 4;
    const before = s.scramblesLeft;
    const next = scrambleTray(s);
    expect(next.scramblesLeft).toBe(before - 1);
    expect(next.combo).toBe(0);
    expect(next.anchorLetter).toBe('C'); // anchor unchanged by scramble
    expect(next.tray).toHaveLength(WORD_TOWER_TRAY_SIZE);
  });

  it('starts with the configured number of scrambles', () => {
    const s = initWordTowerState({ gameCode: 'G', playerId: 'p1', language: 'en' });
    expect(s.scramblesLeft).toBe(WORD_TOWER_SCRAMBLES_START);
  });
});

describe('wordTowerManager — serialize/restore', () => {
  const opts = { gameCode: 'G', playerId: 'p1', language: 'en' as const };

  it('round-trips a tower (height, combo, anchor, floors, usedWords) with a fresh tray', () => {
    const base = initWordTowerState(opts);
    const s = {
      ...base,
      heightM: 120,
      combo: 4,
      anchorLetter: 'T',
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
    expect(r.anchorLetter).toBe('T');
    expect(r.scramblesLeft).toBe(2);
    expect(r.bombCharge).toBe(3);
    expect(r.floors).toHaveLength(1);
    expect(r.usedWords.has('CAT')).toBe(true);
    expect(r.longestCombo).toBe(7);
    expect(r.tray).toHaveLength(WORD_TOWER_TRAY_SIZE); // tray regenerated, not persisted
  });

  it('caps floors at 50 and usedWords at 200', () => {
    const base = initWordTowerState(opts);
    const s = {
      ...base,
      floors: Array.from({ length: 80 }, () => ({ word: 'X', len: 1, meters: 1 })),
      usedWords: new Set(Array.from({ length: 300 }, (_, i) => `W${i}`)),
    };
    const blob = serializeWordTowerState(s);
    expect(blob.floors).toHaveLength(50);
    expect(blob.usedWords).toHaveLength(200);
  });

  it('returns a fresh tower for null or wrong-version blobs', () => {
    expect(restoreWordTowerState(opts, null).heightM).toBe(0);
    expect(restoreWordTowerState(opts, { version: 999 } as never).heightM).toBe(0);
  });
});

import { rerollStart } from '../wordTowerManager';

describe('rerollStart (dead-end escape)', () => {
  const base = () => initWordTowerState({ gameCode: 'g1', playerId: 'p1', language: 'en' });

  it('breaks the combo, advances trayDraws, keeps a full tray', () => {
    const s = { ...base(), combo: 5 };
    const r = rerollStart(s);
    expect(r.combo).toBe(0);
    expect(r.trayDraws).toBeGreaterThan(s.trayDraws);
    expect(r.tray.length).toBe(s.tray.length);
  });

  it('preserves height and floors (it only restarts the chain link)', () => {
    const s = { ...base(), heightM: 120, floors: [{ word: 'CAT', len: 3, meters: 6 }] };
    const r = rerollStart(s);
    expect(r.heightM).toBe(120);
    expect(r.floors).toHaveLength(1);
  });

  it('retries until the new anchor is viable, then stops', () => {
    const s = base();
    // Only accept anchor 'E'; reroll must land on it (within the retry budget)
    const r = rerollStart(s, (a) => a === 'E');
    expect(r.anchorLetter).toBe('E');
  });

  it('does not hang when no anchor is ever viable (bounded retries)', () => {
    const s = base();
    const r = rerollStart(s, () => false);
    expect(r.combo).toBe(0); // returns after the retry budget
    expect(r.tray.length).toBeGreaterThan(0);
  });
});
