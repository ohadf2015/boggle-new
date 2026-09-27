/**
 * The boss-defeat share card URL. The OG route
 * (app/api/og/boss-defeat/route.tsx) is the only art — the card must carry no
 * emoji and must never leak an un-encoded query value.
 */
import { describe, it, expect } from 'vitest';
import { WORLDS_COUNT } from '@/lib/adventure/constants';
import { bossCardFields } from '@/lib/adventure/play/bossCard';
import { bossDefeatImageUrl, bossShareFilename, shareReady } from '../bossShare';

describe('bossDefeatImageUrl', () => {
  it('names the boss of the world the run cleared', () => {
    const url = new URL(bossDefeatImageUrl({ world: 3, word: 'knowledge', player: 'Ohad', stars: 3 }), 'https://x.test');
    expect(url.pathname).toBe('/api/og/boss-defeat');
    expect(url.searchParams.get('world')).toBe('3');
    expect(url.searchParams.get('boss')).toBe('professorThesaurus');
  });

  it('upper-cases the killing word (the card sets it as a stamp)', () => {
    const url = new URL(bossDefeatImageUrl({ world: 1, word: 'quiver', player: 'A', stars: 1 }), 'https://x.test');
    expect(url.searchParams.get('word')).toBe('QUIVER');
  });

  it('encodes a player name with spaces and punctuation', () => {
    const url = new URL(bossDefeatImageUrl({ world: 1, word: 'a', player: 'Ann & Bo', stars: 2 }), 'https://x.test');
    expect(url.searchParams.get('player')).toBe('Ann & Bo');
    expect(url.toString()).not.toContain('Ann & Bo');
  });

  it('strips emoji out of the player name — the share art is emoji-free', () => {
    const url = new URL(bossDefeatImageUrl({ world: 1, word: 'a', player: '🔥Ohad🎉', stars: 3 }), 'https://x.test');
    expect(url.searchParams.get('player')).toBe('Ohad');
  });

  it('LEAVES OUT a word it does not have instead of sending a placeholder', () => {
    const url = new URL(bossDefeatImageUrl({ world: 1, word: '', player: '', stars: 3 }), 'https://x.test');
    expect(url.searchParams.has('word')).toBe(false);
    expect(url.searchParams.get('player')).toBe('Adventurer');
  });

  it('leaves out a world it cannot name rather than clamping to the wrong one', () => {
    const url = new URL(bossDefeatImageUrl({ world: Number.NaN, word: 'a', player: 'A', stars: 3 }), 'https://x.test');
    expect(url.searchParams.has('world')).toBe(false);
    expect(url.searchParams.has('boss')).toBe(false);
    expect(url.toString()).not.toContain('NaN');
  });

  it('leaves out a star count it does not have', () => {
    const url = new URL(bossDefeatImageUrl({ world: 1, word: 'a', player: 'A', stars: null }), 'https://x.test');
    expect(url.searchParams.has('stars')).toBe(false);
  });

  it('clamps a star count that is merely out of range, and drops an impossible world', () => {
    const url = new URL(bossDefeatImageUrl({ world: 44, word: 'a', player: 'A', stars: 9 }), 'https://x.test');
    expect(url.searchParams.has('world')).toBe(false);
    expect(url.searchParams.get('stars')).toBe('3');
  });

  it('gives the shared file a stable, emoji-free name', () => {
    expect(bossShareFilename(3)).toBe('lexiclash-world-3.png');
  });
  /**
   * The route no longer keeps its own name table — it resolves the boss from
   * the WORLD through `bossCardFields`. This pins the URL builder to that same
   * resolution, so a share can never name a boss the card cannot draw.
   */
  it('names a real boss for every world the share button can build', () => {
    for (let world = 1; world <= WORLDS_COUNT; world++) {
      const url = new URL(bossDefeatImageUrl({ world, word: 'a', player: 'A', stars: 3 }), 'https://x.test');
      const boss = url.searchParams.get('boss');
      expect(boss, `world ${world}`).toBeTruthy();
      expect(bossCardFields({ world: String(world), boss }).bossName, `world ${world}`).toBeTruthy();
    }
  });

  describe('shareReady', () => {
    it('is true only when the run can fill every field of the card', () => {
      expect(shareReady({ world: 3, word: 'storm', player: 'A', stars: 2 })).toBe(true);
    });

    it('is false while a field is still missing — the button stays disabled', () => {
      expect(shareReady({ world: 3, word: '', player: 'A', stars: 2 })).toBe(false);
      expect(shareReady({ world: 3, word: 'storm', player: 'A', stars: null })).toBe(false);
      expect(shareReady({ world: Number.NaN, word: 'storm', player: 'A', stars: 2 })).toBe(false);
      expect(shareReady({ world: 99, word: 'storm', player: 'A', stars: 2 })).toBe(false);
    });
  });
});
