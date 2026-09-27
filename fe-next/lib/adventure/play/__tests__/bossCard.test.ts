/**
 * The boss-defeat share card's fields.
 *
 * The card is a SHARE artifact: whatever it rasterizes is what unfurls in a
 * chat preview and what a player screenshots. A captured instance read
 * "Unknown Boss / UNKNOWN WORLD · WORLD NAN / VICTORY" because the route did
 * `Math.max(1, Math.min(10, NaN))` — which is NaN — and then indexed its name
 * tables with it (Class 4: a silent wrong-art render, never an error).
 *
 * The contract here: a junk or missing field NEVER reaches the art. It either
 * resolves to something true (the world's real boss) or the card drops that
 * element entirely. Nothing is ever asserted that the caller did not supply.
 */
import { describe, it, expect } from 'vitest';
import { WORLDS_COUNT } from '@/lib/adventure/constants';
import { BOSS_DISPLAY_NAMES, bossCardFields, finiteInt } from '../bossCard';

describe('finiteInt', () => {
  it('reads a plain integer', () => {
    expect(finiteInt('7')).toBe(7);
  });

  it.each(['', 'abc', 'undefined', 'NaN', '1e999', '-Infinity', null, undefined])(
    'refuses %p rather than passing NaN/Infinity downstream',
    (raw) => {
      expect(finiteInt(raw)).toBeNull();
    },
  );

  it('floors a float instead of printing one', () => {
    expect(finiteInt('3.9')).toBe(3);
  });
});

describe('bossCardFields — a well-formed share', () => {
  const card = bossCardFields({ world: '10', boss: 'lexiconDragon', word: 'dragon', player: 'Ohad', stars: '3' });

  it('names the boss, the world and the killing word', () => {
    expect(card.world).toBe(10);
    expect(card.bossName).toBe('Lexicon Dragon');
    expect(card.worldName).toBe('Lexicon Throne');
    expect(card.word).toBe('DRAGON');
    expect(card.stars).toBe(3);
    expect(card.player).toBe('Ohad');
  });
});

describe('bossCardFields — junk in, nothing false out', () => {
  it('never resolves a NaN world into a wrong world', () => {
    const card = bossCardFields({ world: 'NaN', boss: '', word: 'x', player: 'A', stars: '3' });
    expect(card.world).toBeNull();
    expect(card.worldName).toBeNull();
    expect(card.bossName).toBeNull();
  });

  it('never prints "Unknown": an out-of-range world drops the world line', () => {
    const card = bossCardFields({ world: '44', boss: 'nope', word: 'x', player: 'A', stars: '3' });
    expect(card.world).toBeNull();
    expect(card.bossName).toBeNull();
  });

  it('derives the boss from the WORLD when the boss id is unknown — the id is never the only source', () => {
    const card = bossCardFields({ world: '3', boss: 'not-a-boss', word: 'x', player: 'A', stars: '3' });
    expect(card.bossName).toBe('Professor Thesaurus');
  });

  it('omits the killing-word slab rather than stamping a placeholder word', () => {
    expect(bossCardFields({ world: '1', boss: '', word: '', player: 'A', stars: '3' }).word).toBeNull();
    expect(bossCardFields({ world: '1', boss: '', word: null, player: 'A', stars: '3' }).word).toBeNull();
  });

  it('omits the star row rather than asserting a star count nobody earned', () => {
    expect(bossCardFields({ world: '1', boss: '', word: 'x', player: 'A', stars: 'abc' }).stars).toBeNull();
    expect(bossCardFields({ world: '1', boss: '', word: 'x', player: 'A', stars: null }).stars).toBeNull();
  });

  it('clamps a star count that is merely out of range', () => {
    expect(bossCardFields({ world: '1', boss: '', word: 'x', player: 'A', stars: '9' }).stars).toBe(3);
    expect(bossCardFields({ world: '1', boss: '', word: 'x', player: 'A', stars: '-2' }).stars).toBe(0);
  });

  it('falls back to a neutral player name and strips emoji out of the art', () => {
    expect(bossCardFields({ world: '1', boss: '', word: 'x', player: '', stars: '1' }).player).toBe('Adventurer');
    expect(bossCardFields({ world: '1', boss: '', word: 'x', player: '🔥Ohad', stars: '1' }).player).toBe('Ohad');
  });

  it('caps a long word and a long name so neither can overflow the card', () => {
    const card = bossCardFields({ world: '1', boss: '', word: 'w'.repeat(80), player: 'p'.repeat(80), stars: '1' });
    expect(card.word!.length).toBeLessThanOrEqual(24);
    expect(card.player.length).toBeLessThanOrEqual(24);
  });

  it('survives a request with no parameters at all', () => {
    const card = bossCardFields({});
    expect(card).toMatchObject({ world: null, worldName: null, bossName: null, word: null, stars: null, player: 'Adventurer' });
  });
});

describe('every world can be named', () => {
  it('has a display name for the boss of each world — "Unknown Boss" is unreachable', () => {
    for (let world = 1; world <= WORLDS_COUNT; world++) {
      const card = bossCardFields({ world: String(world) });
      expect(card.bossName, `world ${world}`).toBeTruthy();
      expect(card.worldName, `world ${world}`).toBeTruthy();
      expect(Object.values(BOSS_DISPLAY_NAMES)).toContain(card.bossName);
    }
  });
});
