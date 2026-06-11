/**
 * useAsyncChallengeProducer — challenger POST flow
 *
 * Covers the bug where the challenger picks a dialog mode (classic/blitz/
 * survival) that the async-challenge API + DB constraint reject
 * (only classic/blast/word-hunt are valid). The producer must normalize the
 * mode to a valid API value before POSTing, otherwise blitz/survival silently
 * 400 and the challenge never reaches the friend.
 *
 * Spec: fe-next/docs/specs/2026-05-13-friend-challenge-async-design.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { normalizeAsyncGameMode, useAsyncChallengeProducer } from '../useAsyncChallengeProducer';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('normalizeAsyncGameMode', () => {
  it('keeps valid API modes unchanged', () => {
    expect(normalizeAsyncGameMode('classic')).toBe('classic');
    expect(normalizeAsyncGameMode('blast')).toBe('blast');
    expect(normalizeAsyncGameMode('word-hunt')).toBe('word-hunt');
  });

  it('maps dialog-only modes the API rejects to classic', () => {
    // GIVEN dialog modes that the async API + DB CHECK constraint reject
    expect(normalizeAsyncGameMode('blitz')).toBe('classic');
    expect(normalizeAsyncGameMode('survival')).toBe('classic');
  });

  it('falls back to classic for missing/unknown values', () => {
    expect(normalizeAsyncGameMode(undefined)).toBe('classic');
    expect(normalizeAsyncGameMode('')).toBe('classic');
    expect(normalizeAsyncGameMode('nonsense')).toBe('classic');
  });
});

describe('useAsyncChallengeProducer — POST normalizes gameMode', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('POSTs a valid API gameMode even when the stashed mode is survival', async () => {
    // GIVEN a challenger config stashed by the dialog with an unsupported mode
    sessionStorage.setItem(
      'pendingAsyncChallenge',
      JSON.stringify({
        friendUserId: 'friend-1',
        friendUsername: 'Bob',
        gameMode: 'survival',
        language: 'en',
        durationSeconds: 120,
        createdAt: Date.now(),
      }),
    );

    // WHEN the producer fires after a game ends
    renderHook(() =>
      useAsyncChallengeProducer({
        enabled: true,
        score: 100,
        words: ['cat'],
        letterGrid: [['a', 'b'], ['c', 'd']],
        gridSize: 4,
      }),
    );

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    // THEN the POST body carries a constraint-valid mode (not 'survival')
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.gameMode).toBe('classic');
  });
});
