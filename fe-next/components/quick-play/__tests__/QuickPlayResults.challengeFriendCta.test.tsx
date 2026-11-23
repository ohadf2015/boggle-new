/**
 * QuickPlayResults — the challenge add-friend moment.
 *
 * Regression guard for the viral dead-end: when the round answered a shared
 * challenge from a signed-in challenger, the results screen must show the
 * one-tap add-friend CTA (never for weekly ghost rivals, never id-less).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickPlayResults } from '../QuickPlayResults';
import type { QuickRoundResult, QuickSubmitOutcome } from '../types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-1' }, profile: { username: 'TestPlayer', avatar_config: null } }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/utils/haptics/HapticsManager', () => ({ haptics: { success: vi.fn() } }));
vi.mock('@/components/daily/RivalCompareCard', () => ({
  default: () => <div data-testid="mock-rival-card" />,
}));
vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: vi.fn(() => false),
  useReducedMotion: vi.fn(() => false),
}));

const ctaSpy = vi.hoisted(() => ({ props: null as null | { userId: string; name: string } }));
vi.mock('../ChallengeFriendCta', () => ({
  ChallengeFriendCta: (props: { userId: string; name: string }) => {
    ctaSpy.props = props;
    return <div data-testid="mock-challenge-friend-cta" />;
  },
}));

const result: QuickRoundResult = {
  mode: 'classic', seed: 's-1', score: 340, perfectScore: 500,
  scorePct: 68, wordsFound: 7, totalWords: 12, durationMs: 60000,
  words: [{ word: 'test', score: 10 }],
};

const outcome: QuickSubmitOutcome = {
  scorePct: 68, coins: 93, xp: 74, percentileToday: 73, history: [68], totalPoints: 900,
};

function renderResults(rival: Parameters<typeof QuickPlayResults>[0]['rival']) {
  return render(
    <QuickPlayResults
      result={result}
      outcome={outcome}
      rival={rival}
      onNextRound={vi.fn()}
      onChallenge={vi.fn()}
    />,
  );
}

describe('QuickPlayResults — challenge friend CTA', () => {
  beforeEach(() => {
    ctaSpy.props = null;
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ entries: [] }) })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the add-friend CTA when the challenger is a real player', async () => {
    renderResults({
      name: 'Maya', emoji: '🎯', theirValue: 60, myValue: 68,
      type: 'challenge', userId: 'u-maya', avatarUserId: 'u-maya', avatarConfig: null,
    });
    expect(await screen.findByTestId('mock-challenge-friend-cta')).toBeInTheDocument();
    expect(ctaSpy.props).toEqual({ userId: 'u-maya', name: 'Maya' });
    expect(screen.getByTestId('mock-rival-card')).toBeInTheDocument();
  });

  it('shows the VS card for a named guest challenge even without an avatar id', async () => {
    renderResults({
      name: 'Maya', emoji: '🎯', theirValue: 60, myValue: 68,
      type: 'challenge', avatarConfig: null,
    });
    expect(await screen.findByTestId('mock-rival-card')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-challenge-friend-cta')).toBeNull();
  });

  it('never shows the CTA for a weekly ghost rival', async () => {
    renderResults({
      name: 'Joker', emoji: '👻', theirValue: 120, myValue: 900,
      type: 'weekly', avatarUserId: 'u-joker', avatarConfig: null,
    });
    await screen.findByTestId('mock-rival-card');
    expect(screen.queryByTestId('mock-challenge-friend-cta')).toBeNull();
  });
});
