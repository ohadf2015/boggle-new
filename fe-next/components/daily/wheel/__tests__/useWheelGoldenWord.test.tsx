import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { goldenWordKey } from '@/utils/dailyChallenge/wordWheelGolden';

const track = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => track(...a) }));

import { reportGoldenWordFound, useWheelGoldenWord } from '../useWheelGoldenWord';

const DATE = '2026-11-09';

describe('useWheelGoldenWord', () => {
  beforeEach(() => {
    localStorage.clear();
    track.mockClear();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ key: goldenWordKey('RETAINS', DATE, 'en') }) })));
  });

  it('Given the server key, Then only the golden word matches (the word itself is never sent)', async () => {
    const { result } = renderHook(() => useWheelGoldenWord(DATE, 'en', true));
    await waitFor(() => expect(result.current('retains')).toBe(true));
    expect(result.current('NASTIER')).toBe(false);
    expect(fetch).toHaveBeenCalledWith(`/api/daily-challenge/word-wheel/golden/${DATE}/en`);
  });

  it('Given practice (disabled), Then nothing is fetched and nothing matches', () => {
    const { result } = renderHook(() => useWheelGoldenWord(DATE, 'en', false));
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current('RETAINS')).toBe(false);
  });

  it('reports golden_word_found once per day and language', () => {
    reportGoldenWordFound(DATE, 'en', 'in_game');
    reportGoldenWordFound(DATE, 'en', 'results');
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('golden_word_found', { date: DATE, language: 'en', source: 'in_game' });
  });
});
