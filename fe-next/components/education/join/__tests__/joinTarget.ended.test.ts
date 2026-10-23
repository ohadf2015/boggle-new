import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveJoinTarget } from '../joinTarget';

const answer = (body: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => body } as unknown as Response);

describe('resolveJoinTarget — ended games', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('maps kind "ended" to an ended verdict carrying the class name', async () => {
    vi.stubGlobal('fetch', answer({ kind: 'ended', classroomName: 'Year 9 English' }));
    await expect(resolveJoinTarget('ABC123')).resolves.toEqual({ verdict: 'ended', label: 'Year 9 English' });
  });

  it('still maps a confident unknown to invalid', async () => {
    vi.stubGlobal('fetch', answer({ kind: 'unknown' }));
    await expect(resolveJoinTarget('ABC123')).resolves.toEqual({ verdict: 'invalid' });
  });
});
