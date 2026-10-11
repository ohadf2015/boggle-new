import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveWordVerdict } from '../checkWordRemote';

const dict = vi.hoisted(() => ({
  memory: vi.fn<(word: string, lang: string) => boolean | null>(),
  prewarm: vi.fn<(lang: string) => Promise<void>>(),
}));
vi.mock('@/hooks/useDictionaryCache', () => ({
  hasWordInMemoryCache: dict.memory,
  prewarmDictionary: dict.prewarm,
}));

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const rateLimited = (retryAfter = '1') =>
  json({ error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED', retryAfter: Number(retryAfter) }, 429, { 'Retry-After': retryAfter });

const sleep = vi.fn(async () => {});
const fetchMock = vi.fn<typeof fetch>();

describe('resolveWordVerdict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dict.memory.mockReturnValue(null);
    dict.prewarm.mockResolvedValue(undefined);
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('given a 200 valid answer, then valid', async () => {
    fetchMock.mockResolvedValueOnce(json({ isValid: true, source: 'dictionary' }));
    await expect(resolveWordVerdict('house', 'en', { sleep })).resolves.toBe('valid');
  });

  it('given a 200 definitive not-a-word answer, then invalid', async () => {
    fetchMock.mockResolvedValueOnce(json({ isValid: false, source: 'unknown' }));
    await expect(resolveWordVerdict('zzqxk', 'en', { sleep })).resolves.toBe('invalid');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('given a warm local dictionary hit, then valid without a network call', async () => {
    dict.memory.mockReturnValue(true);
    await expect(resolveWordVerdict('house', 'en', { sleep })).resolves.toBe('valid');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('given a 429 twice, then unknown — never invalid', async () => {
    fetchMock.mockImplementation(async () => rateLimited('1'));
    await expect(resolveWordVerdict('house', 'en', { sleep })).resolves.toBe('unknown');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('given a 429 then a 200 valid on retry, then valid and the retry honours Retry-After', async () => {
    fetchMock.mockResolvedValueOnce(rateLimited('1')).mockResolvedValueOnce(json({ isValid: true }));
    await expect(resolveWordVerdict('house', 'en', { sleep })).resolves.toBe('valid');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleep.mock.calls.some(([ms]) => (ms as number) > 0 && (ms as number) <= 1000)).toBe(true);
  });

  it('given a 429 with a long Retry-After, then no retry and unknown', async () => {
    fetchMock.mockResolvedValue(rateLimited('60'));
    await expect(resolveWordVerdict('house', 'en', { sleep })).resolves.toBe('unknown');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('given a 5xx, then unknown', async () => {
    fetchMock.mockImplementation(async () => json({ isValid: false, error: 'Server error' }, 500));
    await expect(resolveWordVerdict('house', 'en', { sleep })).resolves.toBe('unknown');
  });

  it('given a network error, then unknown', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(resolveWordVerdict('house', 'en', { sleep })).resolves.toBe('unknown');
  });

  it('given the server dictionary is still loading (200 not_loaded), then unknown, not invalid', async () => {
    fetchMock.mockImplementation(async () => json({ isValid: false, source: 'not_loaded' }));
    await expect(resolveWordVerdict('house', 'en', { sleep })).resolves.toBe('unknown');
  });

  it('given a 429 and the local dictionary finishes loading, then the local answer is used without a retry', async () => {
    fetchMock.mockResolvedValueOnce(rateLimited('1'));
    dict.memory.mockReturnValueOnce(null).mockReturnValueOnce(null).mockReturnValue(true);
    await expect(resolveWordVerdict('house', 'en', { sleep })).resolves.toBe('valid');
    expect(dict.prewarm).toHaveBeenCalledWith('en');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('given retry disabled, then a single request', async () => {
    fetchMock.mockResolvedValue(rateLimited('1'));
    await expect(resolveWordVerdict('house', 'en', { sleep, retry: false, localWaitMs: 0 })).resolves.toBe('unknown');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
