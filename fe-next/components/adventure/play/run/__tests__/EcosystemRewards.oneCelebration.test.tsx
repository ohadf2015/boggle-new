import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playXpGainSound: vi.fn() }) }));
vi.mock('next/dynamic', () => ({ default: () => () => <div data-testid="local-level-up-celebration" /> }));

import EcosystemRewards from '../EcosystemRewards';
import type { RunResult } from '../../runTypes';

const won: RunResult = {
  score: 200, stars: 2, bestStars: 2, won: true, rewards: [], validWords: [], totalStars: 4,
  xpGained: 90, coinsGained: 0, leaderboardPoints: 0, achievementsUnlocked: [],
  levelUp: { newLevel: 9, levelsGained: 1, newTitles: [] },
};

describe('EcosystemRewards — one level-up celebration', () => {
  it('given a run-end level-up, when shown, then it keeps the rank ribbon and leaves the fullscreen celebration to the shared layer', () => {
    vi.useFakeTimers();
    render(<EcosystemRewards result={won} />);
    act(() => { vi.advanceTimersByTime(8000); });
    expect(screen.getByTestId('eco-rank-ribbon')).toBeInTheDocument();
    expect(screen.queryByTestId('local-level-up-celebration')).toBeNull();
    vi.useRealTimers();
  });
});
