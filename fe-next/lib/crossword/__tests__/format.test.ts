import { describe, it, expect, beforeEach } from 'vitest';
import {
  FULL_SIZE,
  defaultFormat,
  isNewspaperScale,
  loadFormat,
  saveFormat,
  sizeFor,
  supportsFull,
} from '../format';

describe('supportsFull', () => {
  it('allows the full board only where the clue bank can fill 40+ slots', () => {
    expect(supportsFull('en')).toBe(true);
    // sv/he/es banks hold 623–1,206 clued answers; offering a format that silently degrades to a
    // mini would be worse than not offering it at all.
    expect(supportsFull('sv')).toBe(false);
    expect(supportsFull('he')).toBe(false);
    expect(supportsFull('es')).toBe(false);
  });
});

describe('sizeFor', () => {
  it('returns the newspaper size for a supported locale', () => {
    expect(sizeFor('en', 'full')).toBe(FULL_SIZE);
  });

  it('returns the locale mini for everything else', () => {
    expect(sizeFor('en', 'mini')).toBe(5);
    expect(sizeFor('he', 'mini')).toBe(4);
    // asking for full where it is unsupported must not invent a grid the bank cannot fill
    expect(sizeFor('he', 'full')).toBe(4);
  });
});

describe('isNewspaperScale', () => {
  it('is false for a mini and true for a full board', () => {
    expect(isNewspaperScale(10)).toBe(false); // 5×5 mini
    expect(isNewspaperScale(42)).toBe(true); // 11×11
  });
});

describe('defaultFormat', () => {
  it('opens on the full board wherever the bank can fill one', () => {
    expect(defaultFormat('en')).toBe('full');
    expect(defaultFormat('he')).toBe('mini');
    expect(defaultFormat('es')).toBe('mini');
    expect(defaultFormat('sv')).toBe('mini');
  });
});

describe('format persistence', () => {
  beforeEach(() => window.localStorage.clear());

  it('opens on the locale default when the player has never chosen', () => {
    expect(loadFormat('en')).toBe('full');
    expect(loadFormat('he')).toBe('mini');
  });

  it('round-trips a saved choice, INCLUDING a deliberate mini', () => {
    saveFormat('mini');
    // The full default must not steamroll a player who picked the small board on purpose.
    expect(loadFormat('en')).toBe('mini');
    saveFormat('full');
    expect(loadFormat('en')).toBe('full');
  });

  it('falls back to the default on a junk stored value', () => {
    window.localStorage.setItem('lexiclash:crossword:format', 'jumbo');
    expect(loadFormat('en')).toBe('full');
  });

  it('ignores a saved full choice on a locale that cannot serve it', () => {
    // e.g. the player picked Full in English, then switched the app to Hebrew.
    saveFormat('full');
    expect(loadFormat('he')).toBe('mini');
  });
});
