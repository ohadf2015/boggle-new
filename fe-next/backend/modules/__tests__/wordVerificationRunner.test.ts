/**
 * Tests for the scheduled word-verification runner.
 * Pulls pending en/es/sv (Wiktionary) + ja (Jisho) rejected words and verifies
 * them so the auto-promotion cron has fuel. (Hebrew is verified by milog.)
 */

import { vi } from 'vitest';

const { mockEnQueue, mockEsQueue, mockSvQueue, mockJaQueue } = vi.hoisted(() => ({
  mockEnQueue: vi.fn(),
  mockEsQueue: vi.fn(),
  mockSvQueue: vi.fn(),
  mockJaQueue: vi.fn(),
}));
vi.mock('../../services/wiktionaryEnVerifier', () => ({ processWiktionaryEnVerificationQueue: mockEnQueue }));
vi.mock('../../services/wiktionaryEsVerifier', () => ({ processWiktionaryEsVerificationQueue: mockEsQueue }));
vi.mock('../../services/wiktionaryVerifier', () => ({ processWiktionaryVerificationQueue: mockSvQueue }));
vi.mock('../../services/jishoVerifier', () => ({ processJishoVerificationQueue: mockJaQueue }));
vi.mock('../dictionaryPipelineTelemetry', () => ({ emitDictionaryRun: vi.fn() }));
vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { runWordVerification } from '../wordVerificationRunner';

const empty = { processed: 0, verified: 0, notFound: 0, rejectedType: 0, errors: 0 };

describe('runWordVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnQueue.mockResolvedValue({ ...empty });
    mockEsQueue.mockResolvedValue({ ...empty });
    mockSvQueue.mockResolvedValue({ ...empty });
    mockJaQueue.mockResolvedValue({ ...empty });
  });

  it('verifies ALL four languages and passes sv lang to the generic queue', async () => {
    mockEnQueue.mockResolvedValueOnce({ ...empty, processed: 5, verified: 3 });
    mockEsQueue.mockResolvedValueOnce({ ...empty, processed: 2, verified: 1 });
    mockSvQueue.mockResolvedValueOnce({ ...empty, processed: 4, verified: 2 });
    mockJaQueue.mockResolvedValueOnce({ ...empty, processed: 1, verified: 1 });

    const result = await runWordVerification();

    expect(mockEnQueue).toHaveBeenCalledTimes(1);
    expect(mockEsQueue).toHaveBeenCalledTimes(1);
    expect(mockSvQueue).toHaveBeenCalledWith('sv');
    expect(mockJaQueue).toHaveBeenCalledTimes(1);
    expect(result.en.verified).toBe(3);
    expect(result.sv.verified).toBe(2);
    expect(result.ja.verified).toBe(1);
    expect(result.totalVerified).toBe(7);
  });

  it('a failure in one language does not abort the others', async () => {
    mockEnQueue.mockRejectedValueOnce(new Error('Wiktionary down'));
    mockSvQueue.mockResolvedValueOnce({ ...empty, processed: 2, verified: 2 });
    mockJaQueue.mockResolvedValueOnce({ ...empty, processed: 1, verified: 1 });

    const result = await runWordVerification();

    expect(result.en.verified).toBe(0); // failed → zeros, not thrown
    expect(result.sv.verified).toBe(2);
    expect(result.ja.verified).toBe(1);
    expect(result.totalVerified).toBe(3);
  });
});
