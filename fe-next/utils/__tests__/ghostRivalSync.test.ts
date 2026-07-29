import { syncGhostRivalScore } from '../ghostRivalSync';

describe('syncGhostRivalScore', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('POSTs userId and points to /api/ghost-rival', async () => {
    await syncGhostRivalScore('user-123', 450);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toBe('/api/ghost-rival');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ userId: 'user-123', points: 450 });
  });

  it('skips the request when userId is falsy', async () => {
    await syncGhostRivalScore('', 100);
    await syncGhostRivalScore(null as unknown as string, 100);
    await syncGhostRivalScore(undefined as unknown as string, 100);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('skips the request when points are non-positive', async () => {
    await syncGhostRivalScore('user-123', 0);
    await syncGhostRivalScore('user-123', -50);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('swallows network errors without throwing (fire-and-forget)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    await expect(
      syncGhostRivalScore('user-123', 100)
    ).resolves.toBeUndefined();
  });

  it('swallows non-ok responses without throwing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'server' }),
    });

    await expect(
      syncGhostRivalScore('user-123', 100)
    ).resolves.toBeUndefined();
  });
});
