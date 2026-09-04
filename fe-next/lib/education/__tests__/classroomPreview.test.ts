import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lookupClassroomPreview } from '../classroomPreview';

/**
 * The preview is what tells a student "yes, this is Ms. G's class" before they commit. It
 * only ever understood roster codes, so a student holding the code from the projector — the
 * live game code, the common case — saw nothing at all and had no way to tell a working code
 * from a typo.
 *
 * It resolves through /api/education/join-code/resolve, which answers for both code systems.
 */

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

const respond = (body: unknown, ok = true) =>
  mockFetch.mockResolvedValue({ ok, json: async () => body });

describe('lookupClassroomPreview', () => {
  it('previews a classroom roster code', async () => {
    respond({ kind: 'classroom', id: 'c1', name: 'ELA (7th)', language: 'en' });
    await expect(lookupClassroomPreview('Q3UQ2J')).resolves.toEqual({
      kind: 'classroom', id: 'c1', name: 'ELA (7th)', language: 'en',
    });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/education/join-code/resolve?code=Q3UQ2J'
    );
  });

  it('previews a LIVE GAME code — the one on the projector', async () => {
    respond({ kind: 'game', gameCode: 'TZCOQ7', classroomId: 'c1', teacherName: 'Ms. G' });
    await expect(lookupClassroomPreview('tzcoq7')).resolves.toMatchObject({
      kind: 'game', gameCode: 'TZCOQ7', name: 'Ms. G',
    });
  });

  it('returns null for an unknown code', async () => {
    respond({ kind: 'unknown' });
    await expect(lookupClassroomPreview('ZZZZZZ')).resolves.toBeNull();
  });

  it('returns null without calling the API for a malformed code', async () => {
    await expect(lookupClassroomPreview('AB')).resolves.toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns null rather than throwing when the network fails', async () => {
    mockFetch.mockRejectedValue(new Error('offline'));
    await expect(lookupClassroomPreview('Q3UQ2J')).resolves.toBeNull();
  });
});
