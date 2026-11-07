import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { PuzzleActions } from '../PuzzleActions';
import FinaleCard from '../pyramid/FinaleCard';
import type { ConnectionPuzzle, GameState } from '@/lib/connections/types';
import type { PyramidPuzzle } from '@/lib/connections/pyramid/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'control', trackExposure: vi.fn() }),
}));
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({ status: 'idle', canShowAd: true, rewardAmount: 0, isPlaceholder: false, showAd: vi.fn() }),
}));
const offered = vi.hoisted(() => vi.fn());
vi.mock('@/utils/growthTracking', () => ({ trackRewardedAdOffered: offered }));

const puzzle = { id: 'p1', word1: 'BOOK', word2: 'HOLE', bridge: 'WORM', difficulty: 'easy', hint: 'h' } as ConnectionPuzzle;
const pyramid = { id: 'py1', metaAnswer: 'BALL', base: [], difficulty: 'easy' } as unknown as PyramidPuzzle;
const state = (status: GameState['status']) => ({ status, wrongAttempts: 0, hintRevealed: false }) as GameState;

const actions = (isDisabled: boolean, status: GameState['status'] = 'playing') => (
  <PuzzleActions puzzle={puzzle} state={state(status)} isAdmin={false} isDisabled={isDisabled} onGiveUp={vi.fn()} onRevealHint={vi.fn()} />
);
const finale = (status: string) => (
  <FinaleCard
    bridges={['A', 'B', 'C']}
    pyramid={pyramid}
    input=""
    wrongAttempts={0}
    hintRevealed={false}
    status={status}
    onInputChange={vi.fn()}
    onSubmit={vi.fn()}
    onGiveUp={vi.fn()}
    onRevealHint={vi.fn()}
    onNext={vi.fn()}
    isAdmin={false}
  />
);
const answerOffers = () => offered.mock.calls.filter(([p]) => p === 'connections_reveal_answer').length;

describe('reveal-answer rewarded_ad_offered', () => {
  beforeEach(() => {
    window.localStorage.clear();
    offered.mockClear();
  });

  it('PuzzleActions: a transient isDisabled toggle does not re-fire the offer', () => {
    const { rerender } = render(actions(false));
    rerender(actions(true));
    rerender(actions(false));
    expect(answerOffers()).toBe(1);
  });

  it('PuzzleActions: no offer when the CTA is not rendered (puzzle resolved)', () => {
    render(actions(false, 'won' as GameState['status']));
    expect(answerOffers()).toBe(0);
  });

  it('FinaleCard: offers once across playing/wrong, never once resolved', () => {
    const { rerender } = render(finale('playing'));
    rerender(finale('wrong'));
    rerender(finale('playing'));
    expect(answerOffers()).toBe(1);
    offered.mockClear();
    rerender(finale('won'));
    rerender(finale('playing'));
    expect(answerOffers()).toBe(1);
  });
});
