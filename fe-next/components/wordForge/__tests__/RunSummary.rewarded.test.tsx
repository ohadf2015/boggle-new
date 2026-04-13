/**
 * R3 — Word Forge end-of-run rewarded top-up.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { RunSummary } from '../RunSummary';
import type { WordForgeRunState } from '@/types/wordForge';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    status: 'idle', isAdAvailable: true, isPlaceholderCooldown: false,
    showAd: vi.fn(), error: null, rewardAmount: 30, canShowAd: true,
    viewsToday: 0, maxViews: 10, isDailyLimitReached: false,
  }),
  AdStatus: {},
}));
vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({ awardWatchedAd: vi.fn(), rewards: { WATCH_AD: 30 }, coins: 0, refreshCoins: vi.fn(async () => 0) }),
}));

const state: WordForgeRunState = {
  phase: 'runOver',
  round: 5,
  maxRounds: 9,
  roundScore: 0,
  roundTarget: 100,
  totalScore: 420,
  timeRemaining: 0,
  timerDuration: 60,
  wordsThisRound: [],
  allWords: ['CAT', 'DOG', 'BIRD'],
  runes: [],
  maxRuneSlots: 5,
  bossConstraint: null,
  runeOffering: null,
  grid: [],
  gridSize: 5,
  bestWord: { word: 'BIRD', score: 40 },
  roundHistory: [],
  skipBonus: 0,
  bannedLetters: new Set(),
  runSeed: 0,
};

describe('RunSummary — rewarded top-up (R3)', () => {
  it('renders WatchAdButton gold top-up', () => {
    render(<RunSummary state={state} onPlayAgain={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });
});
