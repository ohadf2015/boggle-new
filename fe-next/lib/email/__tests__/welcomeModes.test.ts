import { describe, it, expect } from 'vitest';
import { getWelcomeEmailModes, PUBLIC_WELCOME_MODE_ORDER } from '../welcomeModes';
import { MODE_META } from '@/lib/landing/modeMeta';

const BASE = 'https://www.lexiclash.live';

describe('getWelcomeEmailModes — dynamic public mode list for the welcome email', () => {
  it('includes only public modes available to all players', () => {
    const keys = getWelcomeEmailModes('en', BASE).map((m) => m.key);
    // Exactly the promoted public set (matches landing FEATURED_MODES minus
    // admin/adventure, and minus crossword — not yet public to all players).
    expect(keys).toEqual([
      'arena',
      'daily',
      'blast',
      'connections',
      'wordCraft',
      'brainGym',
      'practice',
    ]);
  });

  it('excludes crossword (not yet public to all players)', () => {
    const keys = new Set(getWelcomeEmailModes('en', BASE).map((m) => m.key));
    expect(keys.has('crossword')).toBe(false);
  });

  it('excludes every admin-gated mode', () => {
    const keys = new Set(getWelcomeEmailModes('en', BASE).map((m) => m.key));
    for (const [key, meta] of Object.entries(MODE_META)) {
      if (meta.badge === 'ADMIN') expect(keys.has(key)).toBe(false);
    }
  });

  it('excludes adventure (hidden from landing FEATURED_MODES)', () => {
    const keys = new Set(getWelcomeEmailModes('en', BASE).map((m) => m.key));
    expect(keys.has('adventure')).toBe(false);
  });

  it('attaches an absolute cube image URL under /modes/cubes for every mode', () => {
    for (const m of getWelcomeEmailModes('en', BASE)) {
      expect(m.cubeImageUrl).toBe(`${BASE}/modes/cubes/${cubeFile(m.key)}.png`);
    }
  });

  it('builds a language-prefixed href to the mode route', () => {
    const en = getWelcomeEmailModes('en', BASE);
    const arena = en.find((m) => m.key === 'arena')!;
    expect(arena.href).toBe(`${BASE}/en/multiplayer`);
    const he = getWelcomeEmailModes('he', BASE);
    expect(he.find((m) => m.key === 'arena')!.href).toBe(`${BASE}/he/multiplayer`);
  });

  it('gives every mode a non-empty localized title and tagline', () => {
    for (const lang of ['en', 'he', 'sv', 'ja', 'es']) {
      for (const m of getWelcomeEmailModes(lang, BASE)) {
        expect(m.title.trim().length).toBeGreaterThan(0);
        expect(m.tagline.trim().length).toBeGreaterThan(0);
        // Titles must be resolved strings, never raw dotted keys
        expect(m.title).not.toContain('.');
      }
    }
  });

  it('localizes the title (he differs from en for arena)', () => {
    const en = getWelcomeEmailModes('en', BASE).find((m) => m.key === 'arena')!;
    const he = getWelcomeEmailModes('he', BASE).find((m) => m.key === 'arena')!;
    expect(he.title).not.toBe(en.title);
  });

  it('contains no emoji characters in titles or taglines (less AI slop)', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const lang of ['en', 'he', 'sv', 'ja', 'es']) {
      for (const m of getWelcomeEmailModes(lang, BASE)) {
        expect(emoji.test(m.title)).toBe(false);
        expect(emoji.test(m.tagline)).toBe(false);
      }
    }
  });

  it('exposes a stable public order constant', () => {
    expect(PUBLIC_WELCOME_MODE_ORDER.length).toBe(7);
    expect(PUBLIC_WELCOME_MODE_ORDER).not.toContain('crossword');
  });
});

/** Maps a mode key to its cube PNG basename (registry uses lowercased names). */
function cubeFile(key: string): string {
  const map: Record<string, string> = {
    arena: 'arena',
    daily: 'daily',
    blast: 'blast',
    connections: 'connections',
    wordCraft: 'wordcraft',
    brainGym: 'braingym',
    crossword: 'crossword',
    practice: 'practice',
  };
  return map[key] ?? key;
}
