/**
 * Tests for the Wiktionary offensive-label filter.
 *
 * The REST /page/definition/ endpoint strips usage-label text, so we read raw
 * wikitext and scan {{lb|<lang>|...}} templates for the hate/explicit family.
 * We deliberately ALLOW slang/informal/colloquial/derogatory-alone — a word game
 * wants slang; only outright slurs + offensive/vulgar terms are blocked.
 */

import { vi, type Mock } from 'vitest';

// --- ky + redis mocks (must be hoisted before module import) ---
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock('ky', () => ({
  __esModule: true,
  default: { get: mockGet },
  HTTPError: class HTTPError extends Error {
    response: { status: number };
    constructor(status: number) {
      super(`HTTP ${status}`);
      this.response = { status };
    }
  },
}));

const { mockRedisGet, mockRedisSetex } = vi.hoisted(() => ({
  mockRedisGet: vi.fn(),
  mockRedisSetex: vi.fn(),
}));
vi.mock('../../redisClient', () => ({
  getRedisClient: vi.fn(() => ({ get: mockRedisGet, setex: mockRedisSetex, del: vi.fn() })),
}));

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  parseOffensiveLabels,
  isOffensiveWord,
} from '../wiktionaryOffensiveFilter';

describe('parseOffensiveLabels (pure)', () => {
  it('flags an ethnic slur', () => {
    // GIVEN wikitext with an ethnic-slur label
    const wt = "==English==\n{{lb|en|ethnic slur}}\nAn person of Italian descent.";
    // THEN it is offensive
    expect(parseOffensiveLabels(wt, 'en')).toBe(true);
  });

  it('flags a slur tagged "racial slur"', () => {
    expect(parseOffensiveLabels('{{lb|en|racial slur}} x', 'en')).toBe(true);
  });

  it('ALLOWS profanity/vulgar/offensive (word-game norm, e.g. "fuck")', () => {
    // GIVEN profanity labelled offensive/vulgar — these are valid word-game words
    expect(parseOffensiveLabels('{{lb|en|intransitive|offensive}} x', 'en')).toBe(false);
    expect(parseOffensiveLabels('{{lb|en|vulgar}} x', 'en')).toBe(false);
    expect(parseOffensiveLabels('{{label|en|profanity}} x', 'en')).toBe(false);
  });

  it('ALLOWS slang + derogatory-alone (e.g. "dog")', () => {
    // GIVEN "dog" carries {{lb|en|slang|derogatory}} on one sense but is a normal word
    const wt = "{{lb|en|often|attributive}}\n{{lb|en|slang|derogatory}} A despicable person.";
    expect(parseOffensiveLabels(wt, 'en')).toBe(false);
  });

  it('ALLOWS a polysemous word with one vulgar regional sense (e.g. es "gato")', () => {
    // GIVEN "gato" = cat, with {{lb|es|vulgar|slang|Argentina}} on a minor sense
    const wt = "{{lb|es|Mexico}}\n{{lb|es|colloquial}}\n{{lb|es|vulgar|slang|Argentina}}";
    // THEN it stays valid — only the slur family is blocked
    expect(parseOffensiveLabels(wt, 'es')).toBe(false);
  });

  it('ALLOWS informal/colloquial (e.g. "ain\'t")', () => {
    expect(parseOffensiveLabels("{{lb|en|informal|colloquial}} am not", 'en')).toBe(false);
  });

  it('ALLOWS an ordinary word with no labels', () => {
    expect(parseOffensiveLabels('A common four-legged animal.', 'en')).toBe(false);
  });

  it('respects the language section — es labels under {{lb|es|...}}', () => {
    const wt = "==Spanish==\n{{lb|es|ethnic slur}} una palabra";
    expect(parseOffensiveLabels(wt, 'es')).toBe(true);
    // an en-only slur label must NOT trip the es check
    expect(parseOffensiveLabels('{{lb|en|ethnic slur}} word', 'es')).toBe(false);
  });

  it('handles whitespace inside templates', () => {
    expect(parseOffensiveLabels('{{lb | en | ethnic slur }} x', 'en')).toBe(true);
  });
});

describe('isOffensiveWord (network + cache)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSetex.mockResolvedValue('OK');
  });

  function mockWikitext(text: string) {
    (mockGet as Mock).mockReturnValue({ text: () => Promise.resolve(text) });
  }

  it('returns true for a slur word', async () => {
    mockWikitext('{{lb|en|ethnic slur}} a slur');
    await expect(isOffensiveWord('wop', 'en')).resolves.toBe(true);
  });

  it('returns false for a clean word', async () => {
    mockWikitext('A common four-legged animal.');
    await expect(isOffensiveWord('catto', 'en')).resolves.toBe(false);
  });

  it('uses the redis cache when present (no fetch)', async () => {
    mockRedisGet.mockResolvedValueOnce(JSON.stringify({ offensive: true }));
    await expect(isOffensiveWord('wop', 'en')).resolves.toBe(true);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('treats a 404 (no wiki page) as not-offensive', async () => {
    const { HTTPError } = (await import('ky')) as unknown as { HTTPError: new (s: number) => Error };
    (mockGet as Mock).mockReturnValue({ text: () => Promise.reject(new HTTPError(404)) });
    await expect(isOffensiveWord('nopage', 'en')).resolves.toBe(false);
  });

  it('FAILS CLOSED on a network/server error (treats as offensive → skip promotion)', async () => {
    (mockGet as Mock).mockReturnValue({ text: () => Promise.reject(new Error('ETIMEDOUT')) });
    await expect(isOffensiveWord('whatever', 'en')).resolves.toBe(true);
  });

  it('supports Hebrew via {{lb|he|...}} (blocks a he slur, allows a clean he word)', async () => {
    mockWikitext('{{lb|he|ethnic slur}} מילה');
    await expect(isOffensiveWord('xyz', 'he')).resolves.toBe(true);
    expect(mockGet).toHaveBeenCalled();
    mockWikitext('{{lb|he|uncountable}} שלום');
    await expect(isOffensiveWord('שלום', 'he')).resolves.toBe(false);
  });

  it('supports Swedish via {{lb|sv|...}}', async () => {
    mockWikitext('{{lb|sv|ethnic slur}} ett ord');
    await expect(isOffensiveWord('xyz', 'sv')).resolves.toBe(true);
  });

  it('does not call Wiktionary for Japanese (Jisho handles it) — returns false', async () => {
    await expect(isOffensiveWord('ねこ', 'ja')).resolves.toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });
});
