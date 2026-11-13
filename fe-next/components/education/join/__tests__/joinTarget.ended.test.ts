import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

const { mockIsEnded } = vi.hoisted(() => ({ mockIsEnded: vi.fn() }));
vi.mock('../endedJoinCode', () => ({
  endedJoinCodeStatus: async (code: string) => {
    const answer = await mockIsEnded(code);
    return answer === 'limited' ? 'unverified' : answer ? 'ended' : 'not_ended';
  },
}));

import { resolveJoinTarget } from '../joinTarget';

const answer = (body: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => body } as unknown as Response);

describe('resolveJoinTarget — ended games', () => {
  beforeEach(() => {
    mockIsEnded.mockReset();
    mockIsEnded.mockResolvedValue(false);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('maps kind "ended" to an ended verdict carrying the class name', async () => {
    vi.stubGlobal('fetch', answer({ kind: 'ended', classroomName: 'Year 9 English' }));
    await expect(resolveJoinTarget('ABC123')).resolves.toEqual({ verdict: 'ended', label: 'Year 9 English' });
  });

  it('still maps a confident unknown to invalid', async () => {
    vi.stubGlobal('fetch', answer({ kind: 'unknown' }));
    await expect(resolveJoinTarget('ABC123')).resolves.toEqual({ verdict: 'invalid' });
  });

  it('GIVEN resolve answers a confident unknown WHEN the code is an ended session THEN the verdict is ended', async () => {
    vi.stubGlobal('fetch', answer({ kind: 'unknown' }));
    mockIsEnded.mockResolvedValue(true);
    await expect(resolveJoinTarget('abc123')).resolves.toEqual({ verdict: 'ended' });
    expect(mockIsEnded).toHaveBeenCalledWith('ABC123');
  });

  it('GIVEN the ended check throws THEN the code is unverified, never shown as a typo', async () => {
    vi.stubGlobal('fetch', answer({ kind: 'unknown' }));
    mockIsEnded.mockRejectedValue(new Error('action failed'));
    await expect(resolveJoinTarget('ABC123')).resolves.toEqual({ verdict: 'unverified' });
  });

  it('GIVEN the ended check is rate limited THEN a confident unknown is unverified, not invalid', async () => {
    vi.stubGlobal('fetch', answer({ kind: 'unknown' }));
    mockIsEnded.mockResolvedValue('limited');
    await expect(resolveJoinTarget('ABC123')).resolves.toEqual({ verdict: 'unverified' });
  });

  it('GIVEN a degraded unknown THEN the ended check is not asked', async () => {
    vi.stubGlobal('fetch', answer({ kind: 'unknown', degraded: true }));
    await expect(resolveJoinTarget('ABC123')).resolves.toEqual({ verdict: 'unverified' });
    expect(mockIsEnded).not.toHaveBeenCalled();
  });
});
