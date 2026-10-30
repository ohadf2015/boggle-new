import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDailyBoards } from '../useDailyBoards';

const ok = () => new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.restoreAllMocks());

describe('useDailyBoards — guest own row on the per-mode boards', () => {
  for (const scope of ['word-hunt', 'word-wheel'] as const) {
    it(`passes the guest fingerprint to the ${scope} board`, async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ok());
      renderHook(() => useDailyBoards({
        puzzleDate: '2026-10-30', language: 'he', fetchLanguage: 'he', scope, activeTab: 'today', guestFingerprint: 'g/1',
      }));
      await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
      const url = String(fetchSpy.mock.calls[0][0]);
      expect(url).toContain(`/${scope}/leaderboard/2026-10-30/he`);
      expect(new URL(url, 'http://x').searchParams.get('fp')).toBe('g/1');
    });
  }

  it('sends no fp when there is no guest fingerprint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ok());
    renderHook(() => useDailyBoards({
      puzzleDate: '2026-10-30', language: 'en', fetchLanguage: 'en', scope: 'word-wheel', activeTab: 'today', guestFingerprint: null,
    }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(String(fetchSpy.mock.calls[0][0])).not.toContain('fp=');
  });
});
