import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * One round trip, one verdict, and a name to show.
 *
 * The two existing helpers each hit `/api/education/join-code/resolve`
 * separately: `resolveJoinCodeVerdict` for "is this code real" and
 * `lookupClassroomPreview` for "whose class is it". A phone-first join needs
 * both facts at the same instant, and calling twice doubles the pressure on a
 * rate limit that a class of thirty already shares through one school IP.
 *
 * The important half is `unverified`. The route answers `kind: 'unknown'` for a
 * genuine miss AND for a tripped rate limit / broken roster RPC, marking the
 * latter `degraded`. Only a CONFIDENT unknown may be shown to a student as a
 * bad code — recurring pitfall class 4: our outage must never be rendered as
 * their typo.
 */
import { resolveJoinTarget } from '../joinTarget';

const ok = (body: unknown) => ({ ok: true, json: async () => body });

describe('resolveJoinTarget', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('names the classroom behind a roster code', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok({ kind: 'classroom', id: 'c1', name: 'Year 9 English', language: 'en' })
    );

    await expect(resolveJoinTarget('P45KRT')).resolves.toEqual({
      verdict: 'classroom',
      label: 'Year 9 English',
      classroomId: 'c1',
    });
  });

  it('names the teacher behind a live game code', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok({ kind: 'game', gameCode: 'P45KRT', classroomId: 'c1', teacherName: 'Ms Levy' })
    );

    await expect(resolveJoinTarget('p45krt')).resolves.toEqual({
      verdict: 'game',
      label: 'Ms Levy',
      classroomId: 'c1',
      gameCode: 'P45KRT',
    });
  });

  it('calls a confident unknown invalid', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(ok({ kind: 'unknown' }));
    await expect(resolveJoinTarget('ZZZZZZ')).resolves.toEqual({ verdict: 'invalid' });
  });

  it('refuses to call a DEGRADED unknown invalid — that is our outage, not their typo', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok({ kind: 'unknown', degraded: true })
    );
    await expect(resolveJoinTarget('P45KRT')).resolves.toEqual({ verdict: 'unverified' });
  });

  it('is unverified when the network is gone, never invalid', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
    await expect(resolveJoinTarget('P45KRT')).resolves.toEqual({ verdict: 'unverified' });
  });

  it('is unverified on a non-ok response', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, json: async () => ({}) });
    await expect(resolveJoinTarget('P45KRT')).resolves.toEqual({ verdict: 'unverified' });
  });

  it('rejects a malformed code without spending a request', async () => {
    await expect(resolveJoinTarget('AB1')).resolves.toEqual({ verdict: 'invalid' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uppercases before asking, so a typed lowercase code resolves', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(ok({ kind: 'unknown' }));
    await resolveJoinTarget('p45krt');
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('code=P45KRT'));
  });
});
