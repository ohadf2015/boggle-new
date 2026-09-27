import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveJoinCodeVerdict } from '../joinCodeVerdict';

/**
 * "Is this six characters worth minting an identity for?"
 *
 * A logged-out student joining with a bad code used to pay for it in full: the
 * client checked the nickname, ran `signInAnonymously` (which creates a real,
 * permanent `auth.users` row that cannot be un-created), awaited the profile
 * trigger for up to three seconds, and only THEN posted the join — which came
 * back 400. Three seconds of spinner and a junk account, to be told the code
 * was wrong.
 *
 * This asks first. The one rule it must never break: only a CONFIDENT unknown
 * is allowed to stop a join. `kind: 'unknown'` also means "rate limited" and
 * "the roster lookup errored", so the route flags those `degraded: true` and
 * they resolve to `unverified` here — the join proceeds and the server, which
 * has the real answer, decides.
 */

vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), log: vi.fn() },
}));

const jsonRes = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('resolveJoinCodeVerdict', () => {
  it('calls the one resolver that understands BOTH code systems', async () => {
    fetchMock.mockResolvedValue(jsonRes({ kind: 'classroom', id: 'c1' }));
    await resolveJoinCodeVerdict('q3uq2j');
    expect(fetchMock).toHaveBeenCalledWith('/api/education/join-code/resolve?code=Q3UQ2J');
  });

  it('says classroom for a roster code', async () => {
    fetchMock.mockResolvedValue(jsonRes({ kind: 'classroom', id: 'c1' }));
    await expect(resolveJoinCodeVerdict('Q3UQ2J')).resolves.toBe('classroom');
  });

  it('says game for the code on the projector', async () => {
    fetchMock.mockResolvedValue(jsonRes({ kind: 'game', gameCode: 'TZCOQ7' }));
    await expect(resolveJoinCodeVerdict('TZCOQ7')).resolves.toBe('game');
  });

  it('says invalid for a confident unknown — the typo, and the ended game', async () => {
    fetchMock.mockResolvedValue(jsonRes({ kind: 'unknown' }));
    await expect(resolveJoinCodeVerdict('ZZZZZZ')).resolves.toBe('invalid');
  });

  // ---- Everything below must NOT be allowed to stop a join. ----

  it('says unverified when the route admits its lookup was degraded', async () => {
    fetchMock.mockResolvedValue(jsonRes({ kind: 'unknown', degraded: true }));
    await expect(resolveJoinCodeVerdict('Q3UQ2J')).resolves.toBe('unverified');
  });

  it('says unverified on a non-ok response', async () => {
    fetchMock.mockResolvedValue(jsonRes({ error: 'nope' }, false));
    await expect(resolveJoinCodeVerdict('Q3UQ2J')).resolves.toBe('unverified');
  });

  it('says unverified when the network fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(resolveJoinCodeVerdict('Q3UQ2J')).resolves.toBe('unverified');
  });

  it('says unverified on a body it does not recognise', async () => {
    fetchMock.mockResolvedValue(jsonRes({ something: 'else' }));
    await expect(resolveJoinCodeVerdict('Q3UQ2J')).resolves.toBe('unverified');
  });

  it('does not spend a request on a code that cannot be one', async () => {
    await expect(resolveJoinCodeVerdict('AB')).resolves.toBe('invalid');
    await expect(resolveJoinCodeVerdict('ABC-12')).resolves.toBe('invalid');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
