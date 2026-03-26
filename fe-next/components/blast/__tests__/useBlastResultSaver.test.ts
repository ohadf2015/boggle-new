/**
 * useBlastResultSaver - Tests for client-side result persistence hook.
 */

import { renderHook, waitFor } from '@testing-library/react';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useBlastResultSaver } from '../hooks/useBlastResultSaver';
import type { BlastResultsData } from '../types';

const mockResults: BlastResultsData = {
  finalScore: 150,
  tilesCleared: 20,
  totalTiles: 36,
  clearPercentage: 55.6,
  wordsFound: ['CAT', 'DOG', 'FISH'],
  bestWord: 'FISH',
  maxCombo: 3,
  stars: 2,
  wavesCompleted: 0,
  waveResults: [],
};

describe('useBlastResultSaver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call POST /api/blast/result with correct payload', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        personalBests: { bestScore: 150, bestClearPercentage: 55.6, bestMaxCombo: 3, totalGames: 1, totalWords: 3 },
        isNewBestScore: true,
        isNewBestCombo: true,
      }),
    });

    renderHook(() => useBlastResultSaver(mockResults, 'medium', 'en'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/blast/result', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
    });

    // Verify payload includes difficulty and language
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.score).toBe(150);
    expect(callBody.difficulty).toBe('medium');
    expect(callBody.language).toBe('en');
  });

  it('should return personalBests and newRecord flags on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        personalBests: { bestScore: 200, bestClearPercentage: 80, bestMaxCombo: 5, totalGames: 3, totalWords: 15 },
        isNewBestScore: false,
        isNewBestCombo: false,
      }),
    });

    const { result } = renderHook(() => useBlastResultSaver(mockResults, 'medium', 'en'));

    await waitFor(() => {
      expect(result.current.personalBests).not.toBeNull();
    });

    expect(result.current.personalBests?.bestScore).toBe(200);
    expect(result.current.isNewBestScore).toBe(false);
  });

  it('should handle fetch failure gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useBlastResultSaver(mockResults, 'medium', 'en'));

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    expect(result.current.personalBests).toBeNull();
  });

  it('should handle 401 unauthorized gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });

    const { result } = renderHook(() => useBlastResultSaver(mockResults, 'medium', 'en'));

    await waitFor(() => {
      expect(result.current.saved).toBe(false);
    });

    // Should not show error for auth failures (guests)
    expect(result.current.error).toBeNull();
  });

  it('should not call API when results are null', () => {
    renderHook(() => useBlastResultSaver(null, 'medium', 'en'));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
