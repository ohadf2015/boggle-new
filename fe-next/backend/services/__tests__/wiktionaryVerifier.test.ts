/**
 * Tests for the generic (language-parametrised) Wiktionary verifier.
 * Used for Swedish (body.sv) — mirrors the en/es verifiers but takes a lang arg.
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

const { mockRedisGet, mockRedisSetex } = vi.hoisted(() => ({
  mockRedisGet: vi.fn(), mockRedisSetex: vi.fn(),
}));
vi.mock('../../redisClient', () => ({
  getRedisClient: vi.fn(() => ({ get: mockRedisGet, setex: mockRedisSetex, del: vi.fn() })),
}));

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc })),
}));

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  parseWiktionaryResponse,
  verifyWordOnWiktionary,
  processWiktionaryVerificationQueue,
} from '../wiktionaryVerifier';

describe('parseWiktionaryResponse (generic, sv)', () => {
  it('verifies a Swedish noun (body.sv)', () => {
    const r = parseWiktionaryResponse({ sv: [{ partOfSpeech: 'Noun', language: 'Swedish' }] }, 'sv');
    expect(r.verified).toBe(true);
    expect(r.status).toBe('verified');
  });

  it('returns not_found when the target language section is absent', () => {
    const r = parseWiktionaryResponse({ en: [{ partOfSpeech: 'Noun' }] }, 'sv');
    expect(r.verified).toBe(false);
    expect(r.status).toBe('not_found');
  });

  it('rejects proper nouns / abbreviations', () => {
    expect(parseWiktionaryResponse({ sv: [{ partOfSpeech: 'Proper noun' }] }, 'sv').status).toBe('rejected_type');
    expect(parseWiktionaryResponse({ sv: [{ partOfSpeech: 'Abbreviation' }] }, 'sv').status).toBe('rejected_type');
  });

  it('parks unknown POS for human review', () => {
    expect(parseWiktionaryResponse({ sv: [{ partOfSpeech: 'Mystery' }] }, 'sv').status).toBe('needs_review');
  });
});

describe('verifyWordOnWiktionary (generic, sv)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSetex.mockResolvedValue('OK');
  });

  it('verifies via network when uncached', async () => {
    (mockGet as Mock).mockReturnValue({ json: () => Promise.resolve({ sv: [{ partOfSpeech: 'Verb' }] }) });
    const r = await verifyWordOnWiktionary('springa', 'sv');
    expect(r.verified).toBe(true);
  });

  it('returns not_found on 404', async () => {
    const { HTTPError } = (await import('ky')) as unknown as { HTTPError: new (s: number) => Error };
    (mockGet as Mock).mockReturnValue({ json: () => Promise.reject(new HTTPError(404)) });
    const r = await verifyWordOnWiktionary('zzzz', 'sv');
    expect(r.status).toBe('not_found');
  });
});

describe('processWiktionaryVerificationQueue (generic, sv)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSetex.mockResolvedValue('OK');
  });

  it('pulls the sv queue and writes results', async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'get_verification_queue') return Promise.resolve({ data: [{ id: 's1', word: 'hund' }], error: null });
      return Promise.resolve({ data: null, error: null });
    });
    (mockGet as Mock).mockReturnValue({ json: () => Promise.resolve({ sv: [{ partOfSpeech: 'Noun' }] }) });

    const result = await processWiktionaryVerificationQueue('sv');

    expect(mockRpc).toHaveBeenCalledWith('get_verification_queue', expect.objectContaining({ p_language: 'sv' }));
    expect(mockRpc).toHaveBeenCalledWith('update_verification_result', expect.objectContaining({
      p_word_id: 's1', p_status: 'verified', p_source: 'wiktionary_sv',
    }));
    expect(result.verified).toBe(1);
  });

  it('returns empty result when the queue is empty', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const result = await processWiktionaryVerificationQueue('sv');
    expect(result.processed).toBe(0);
  });
});
