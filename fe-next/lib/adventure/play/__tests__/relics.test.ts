import { describe, it, expect } from 'vitest';
import {
  RELICS, RELIC_IDS, POTIONS, POTION_IDS, applyRelics, maxHpFor, secondsBonus, hintCharges,
  draftSize, goldMult, startShields, effectDurationMult, healsOnLongWord, hasRevive, revealsFullHint, BASE_HP,
} from '../relics';
import { scoreRun, scoreWords, wordPoints, chainsFrom } from '../scoreRun';

describe('relic catalog', () => {
  it('given the spec catalog, when read, then every relic + potion id is present exactly', () => {
    expect([...RELIC_IDS].sort()).toEqual([
      'echo-stone', 'frost-ward', 'gold-tooth', 'heart-locket', 'hourglass', 'iron-bookmark', 'lens-of-insight',
      'long-bow', 'lucky-clover', 'magnet', 'phoenix-feather', 'sage-scroll', 'sharp-quill', 'short-sword',
      'storm-rune', 'twin-ink', 'vampire-fang',
    ]);
    expect([...POTION_IDS].sort()).toEqual(['cleanse', 'heal', 'insight', 'time']);
    expect(RELICS.magnet.rarity).toBe('rare');
    expect(Object.keys(POTIONS)).toHaveLength(4);
  });
});

describe('applyRelics', () => {
  it('given no relics, when applied, then points = base word points', () => {
    expect(applyRelics('planet', 0, [])).toBe(wordPoints('planet'));
  });

  it('given sharp-quill, when a 6+ letter word lands, then +50% (and not on 5 letters)', () => {
    expect(applyRelics('planet', 1, ['sharp-quill'])).toBe(Math.round(wordPoints('planet') * 1.5));
    expect(applyRelics('plane', 1, ['sharp-quill'])).toBe(wordPoints('plane'));
  });

  it('given long-bow, when a 7+ letter word lands, then x2', () => {
    expect(applyRelics('planets', 1, ['long-bow'])).toBe(wordPoints('planets') * 2);
    expect(applyRelics('planet', 1, ['long-bow'])).toBe(wordPoints('planet'));
  });

  it('given short-sword / storm-rune, when exact lengths land, then flat bonuses apply', () => {
    expect(applyRelics('cat', 1, ['short-sword'])).toBe(wordPoints('cat') + 2);
    expect(applyRelics('plane', 1, ['storm-rune'])).toBe(wordPoints('plane') + 5);
    expect(applyRelics('plans', 1, ['short-sword'])).toBe(wordPoints('plans'));
  });

  it('given twin-ink, when scoring, then only the first word is doubled', () => {
    expect(applyRelics('cat', 0, ['twin-ink'])).toBe(wordPoints('cat') * 2);
    expect(applyRelics('cat', 1, ['twin-ink'])).toBe(wordPoints('cat'));
  });

  it('given echo-stone, when scoring, then +1 per word already found, capped at +10', () => {
    expect(applyRelics('cat', 0, ['echo-stone'])).toBe(wordPoints('cat'));
    expect(applyRelics('cat', 4, ['echo-stone'])).toBe(wordPoints('cat') + 4);
    expect(applyRelics('cat', 40, ['echo-stone'])).toBe(wordPoints('cat') + 10);
  });

  it('given magnet, when scoring, then all words +20%', () => {
    expect(applyRelics('cats', 3, ['magnet'])).toBe(Math.round(wordPoints('cats') * 1.2));
  });

  it('given flat and multiplier relics together, when scoring, then flats add before multipliers', () => {
    const base = wordPoints('cat');
    expect(applyRelics('cat', 0, ['short-sword', 'twin-ink'])).toBe((base + 2) * 2);
  });

  it('given duplicate or unknown relic ids, when scoring, then each known relic counts once', () => {
    expect(applyRelics('cat', 0, ['twin-ink', 'twin-ink', 'bogus' as never])).toBe(wordPoints('cat') * 2);
  });
});

describe('relic stat helpers', () => {
  it('given stat relics, when read, then run stats shift', () => {
    expect(maxHpFor([])).toBe(BASE_HP);
    expect(maxHpFor(['heart-locket'])).toBe(BASE_HP + 1);
    expect(secondsBonus(['hourglass'])).toBe(10);
    expect(secondsBonus([])).toBe(0);
    expect(hintCharges([])).toBe(2);
    expect(hintCharges(['lens-of-insight'])).toBe(3);
    expect(draftSize([])).toBe(3);
    expect(draftSize(['lucky-clover'])).toBe(4);
    expect(goldMult(['gold-tooth'])).toBe(1.5);
    expect(goldMult([])).toBe(1);
    expect(startShields(['iron-bookmark'])).toBe(1);
    expect(effectDurationMult(['frost-ward'])).toBe(0.5);
    expect(healsOnLongWord(['vampire-fang'])).toBe(true);
    expect(hasRevive(['phoenix-feather'])).toBe(true);
    expect(revealsFullHint(['sage-scroll'])).toBe(true);
    expect(revealsFullHint([])).toBe(false);
  });
});

describe('scoreRun with relics + chain', () => {
  const grid = [
    ['c', 'a', 't', 's'],
    ['o', 'x', 'x', 'x'],
    ['d', 'o', 'g', 'x'],
    ['x', 'x', 'x', 'x'],
  ];
  const dict = new Set(['cat', 'cats', 'dog', 'toad']);
  const isWord = (w: string) => dict.has(w);

  it('given relics, when scoring a run, then the order-aware relic formula is applied', () => {
    const r = scoreRun({ grid, words: ['dog', 'cat'], language: 'en', minLength: 3, isWord, relics: ['twin-ink'] });
    expect(r.score).toBe(wordPoints('dog') * 2 + wordPoints('cat'));
    expect(r.points).toEqual([wordPoints('dog') * 2, wordPoints('cat')]);
  });

  it('given chain kind, when a word does not start with the previous last letter, then it scores 0', () => {
    // cat -> (t) ... dog does not chain; next chaining anchor stays "t"
    const r = scoreWords(['cat', 'dog', 'cats'], { kind: 'chain' });
    expect(r.points).toEqual([wordPoints('cat'), 0, 0]);
    expect(r.chained).toEqual([true, false, false]);
    const ok = scoreWords(['dog', 'good'], { kind: 'chain' });
    expect(ok.points).toEqual([wordPoints('dog'), wordPoints('good')]);
  });

  it('given chainsFrom, when checking hebrew final letters, then final forms chain to regular forms', () => {
    expect(chainsFrom('שלום', 'מים')).toBe(true);
    expect(chainsFrom('cat', 'tar')).toBe(true);
    expect(chainsFrom('cat', 'car')).toBe(false);
    expect(chainsFrom(null, 'anything')).toBe(true);
  });

  it('given the default relics list, when scoring, then legacy callers are unchanged', () => {
    const r = scoreRun({ grid, words: ['cat', 'dog'], language: 'en', minLength: 3, isWord });
    expect(r.score).toBe(wordPoints('cat') + wordPoints('dog'));
  });
});
