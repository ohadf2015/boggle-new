/**
 * Tests for the Japanese (Jisho/JMdict) verifier.
 *
 * Players submit hiragana; Wiktionary structures Japanese under kanji so it can't
 * verify hiragana. Jisho/JMdict accepts hiragana and returns exact reading matches.
 * Offensive filtering is best-effort: the public API exposes some misc tags
 * ("Colloquial", …) but not all JMdict vulgar/derogatory flags — backstops (admin
 * queue + bot_word_blacklist) cover the gap. This is documented in the spec.
 */

import { vi, type Mock } from 'vitest';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock('ky', () => ({
  __esModule: true,
  default: { get: mockGet },
  HTTPError: class HTTPError extends Error {
    response: { status: number };
    constructor(status: number) { super(`HTTP ${status}`); this.response = { status }; }
  },
}));

const { mockRedisGet, mockRedisSetex } = vi.hoisted(() => ({ mockRedisGet: vi.fn(), mockRedisSetex: vi.fn() }));
vi.mock('../../redisClient', () => ({
  getRedisClient: vi.fn(() => ({ get: mockRedisGet, setex: mockRedisSetex, del: vi.fn() })),
}));
vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { parseJishoResponse, verifyWordOnJisho } from '../jishoVerifier';

function jisho(data: unknown) { return { data }; }

describe('parseJishoResponse', () => {
  it('verifies an exact hiragana reading match with a real POS', () => {
    const body = jisho([
      { japanese: [{ word: '猫', reading: 'ねこ' }], senses: [{ parts_of_speech: ['Noun'], tags: [] }] },
    ]);
    const r = parseJishoResponse(body, 'ねこ');
    expect(r.verified).toBe(true);
    expect(r.status).toBe('verified');
  });

  it('returns not_found when no entry matches the submitted reading', () => {
    const body = jisho([
      { japanese: [{ word: '犬', reading: 'いぬ' }], senses: [{ parts_of_speech: ['Noun'], tags: [] }] },
    ]);
    expect(parseJishoResponse(body, 'ねこ').status).toBe('not_found');
  });

  it('returns not_found on an empty result', () => {
    expect(parseJishoResponse(jisho([]), 'xyz').status).toBe('not_found');
  });

  it('rejects a word whose exposed tags mark it vulgar/derogatory (best-effort)', () => {
    const body = jisho([
      { japanese: [{ reading: 'ばか' }], senses: [{ parts_of_speech: ['Noun'], tags: ['Derogatory'] }] },
    ]);
    const r = parseJishoResponse(body, 'ばか');
    expect(r.verified).toBe(false);
    expect(r.status).toBe('rejected_type');
  });

  it('parks an exact match with no real POS for review', () => {
    const body = jisho([
      { japanese: [{ reading: 'あ' }], senses: [{ parts_of_speech: ['Wikipedia definition'], tags: [] }] },
    ]);
    expect(parseJishoResponse(body, 'あ').status).toBe('needs_review');
  });
});

describe('verifyWordOnJisho (network + cache)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSetex.mockResolvedValue('OK');
  });

  it('verifies via network when uncached', async () => {
    (mockGet as Mock).mockReturnValue({
      json: () => Promise.resolve({ data: [{ japanese: [{ reading: 'さくら' }], senses: [{ parts_of_speech: ['Noun'], tags: [] }] }] }),
    });
    const r = await verifyWordOnJisho('さくら');
    expect(r.verified).toBe(true);
    expect(r.status).toBe('verified');
  });

  it('uses the redis cache when present (no fetch)', async () => {
    mockRedisGet.mockResolvedValueOnce(JSON.stringify({ verified: true, status: 'verified' }));
    const r = await verifyWordOnJisho('さくら');
    expect(r.verified).toBe(true);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('returns status error on network failure (does not throw)', async () => {
    (mockGet as Mock).mockReturnValue({ json: () => Promise.reject(new Error('ETIMEDOUT')) });
    const r = await verifyWordOnJisho('さくら');
    expect(r.status).toBe('error');
    expect(r.verified).toBe(false);
  });
});
