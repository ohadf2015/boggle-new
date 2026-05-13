import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBlastProgress } from '../useBlastProgress';

describe('useBlastProgress', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useBlastProgress());
    expect(result.current.state.coins).toBe(0);
    expect(result.current.state.chestNumber).toBe(1);
    expect(result.current.state.chestProgress).toBe(0);
    expect(result.current.clearMutation.status).toBe('idle');
  });

  it('clearLevel mutation updates coins and chest progress', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ coins: 100, chestProgress: 0.25, chestNumber: 1 }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useBlastProgress());

    const submission = {
      levelNumber: 1,
      locale: 'en' as const,
      wordsFound: ['test'],
      timeSeconds: 30,
      hintsUsed: 0,
      wrongAttempts: 0,
      cascadesTriggered: 0,
    };

    result.current.clearLevel(submission, 100, 5);

    await waitFor(() => {
      expect(result.current.clearMutation.status).toBe('success');
    });

    expect(result.current.state.coins).toBe(100);
    expect(result.current.state.chestProgress).toBe(0.25);
  });

  it('clearLevel forwards submissionId in request body (idempotency)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ coins: 0, chestProgress: 0, chestNumber: 1 }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useBlastProgress());

    const submission = {
      levelNumber: 1,
      locale: 'en' as const,
      wordsFound: ['test'],
      timeSeconds: 30,
      hintsUsed: 0,
      wrongAttempts: 0,
      cascadesTriggered: 0,
      submissionId: 'fixed-uuid-123',
    };

    result.current.clearLevel(submission, 100, 5);

    await waitFor(() => {
      expect(result.current.clearMutation.status).toBe('success');
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.submissionId).toBe('fixed-uuid-123');
  });

  it('openChest mutation resets chest progress and increments chest number', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        coins: 150,
        contents: {
          tier: 'wood' as const,
          coins: 250,
          boosts: [],
          avatarPart: null,
          frameSkin: 'wood',
        },
        nextChestNumber: 2,
      }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useBlastProgress());

    result.current.openChest();

    await waitFor(() => {
      expect(result.current.openMutation.status).toBe('success');
    });

    expect(result.current.state.chestProgress).toBe(0);
    expect(result.current.state.chestNumber).toBe(2);
    expect(result.current.state.coins).toBe(150);
  });
});
