/**
 * LandingChallengeCards — visibility gates
 *
 * 1. Word Craft is admin-only. Non-admin players must NOT see the card.
 * 2. After a player has finished even one multiplayer round, the "More Game
 *    Modes" expander must not collapse extras — surface every mode directly.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { LandingChallengeCards } from '../LandingChallengeCards';

vi.mock('@/utils/growthTracking', () => ({
  trackModeSelected: vi.fn(),
  trackLandingCtaClick: vi.fn(),
}));

vi.mock('framer-motion', () => {
  const motionComponent = React.forwardRef(({ children, ...props }: any, ref: any) => {
    const safe = { ...props };
    for (const k of ['initial','animate','exit','transition','variants','whileHover','whileTap','whileInView','viewport']) delete safe[k];
    return React.createElement('div', { ...safe, ref }, children);
  });
  motionComponent.displayName = 'Motion';
  const motionObj = new Proxy({}, { get: () => motionComponent });
  const AnimatePresence = ({ children }: any) => children;
  AnimatePresence.displayName = 'AnimatePresence';
  return { m: motionObj, AnimatePresence };
});

vi.mock('../ModeCard', () => {
  const ModeCard = ({ title, href }: any) => (
    <div data-testid={`mode-${title}`} data-href={href}>{title}</div>
  );
  ModeCard.displayName = 'ModeCard';
  return { __esModule: true, default: ModeCard };
});

vi.mock('@/utils/contextualGuidanceStorage', () => ({ shouldShowGuidance: () => false }));
vi.mock('@/utils/onboardingStorage', () => ({ hasCompletedOnboarding: () => true }));

const mockIsNewPlayer = vi.fn(() => true);
const mockGamesCompleted = vi.fn(() => 0);
vi.mock('@/utils/multiplayerProgressStorage', () => ({
  isNewPlayer: () => mockIsNewPlayer(),
  getGamesCompleted: () => mockGamesCompleted(),
}));

const mockUserStats = vi.fn(() => ({ totalGamesPlayed: 0 }));
vi.mock('@/hooks/useUserStats', () => ({
  useUserStats: () => ({ userStats: mockUserStats() }),
}));

vi.mock('@/utils/featureGates', () => ({ THRESHOLDS: { modeRoster: 3 } }));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

const mockUserEmail = vi.fn<[], string | undefined>(() => undefined);
const mockIsAdmin = vi.fn(() => false);
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: mockUserEmail() }, isAdmin: mockIsAdmin() }),
}));

vi.mock('@/hooks/useIsPracticeVeteran', () => ({ useIsPracticeVeteran: () => false }));

vi.mock('@/components/daily/DailyChallengeBanner', () => {
  const DailyChallengeBanner = () => <div data-testid="daily-banner" />;
  DailyChallengeBanner.displayName = 'DailyChallengeBanner';
  return { __esModule: true, default: DailyChallengeBanner };
});

const baseProps = {
  language: 'en',
  activePlayers: 10,
  openRooms: 2,
  totalPlayers: 100,
  playerAllTimeBest: null,
  t: (key: string) => key,
  dailyChallengeStats: { hasPlayed: false, hasSolved: null, currentStreak: 0, puzzleNumber: 1, loading: false },
};

describe('LandingChallengeCards — Word Craft admin gate', () => {
  it('does NOT render the wordCraft card for a non-admin user', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-wordcraft.modeTitle')).toBeNull();
  });

  it('renders the wordCraft card for an admin', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.getByTestId('mode-wordcraft.modeTitle')).toBeInTheDocument();
  });

  it('does NOT render the wordCraft card when signed out', () => {
    mockIsAdmin.mockReturnValue(false);
    mockUserEmail.mockReturnValue(undefined);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-wordcraft.modeTitle')).toBeNull();
  });

  it('does NOT render the wordCraft Gem Hunt card for a non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-wordcraft.gemsModeTitle')).toBeNull();
  });

  it('renders the wordCraft Gem Hunt card for an admin with ?mode=gems href', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    const card = screen.getByTestId('mode-wordcraft.gemsModeTitle');
    expect(card).toBeInTheDocument();
    expect(card.getAttribute('data-href')).toBe('/en/word-craft?mode=gems');
  });
});

describe('LandingChallengeCards — Word Tower admin solo gate', () => {
  it('does NOT render the Word Tower card for a non-admin user', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-wordTower.cardTitle')).toBeNull();
  });

  it('renders the Word Tower SOLO card for an admin with /word-tower href', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    const card = screen.getByTestId('mode-wordTower.cardTitle');
    expect(card).toBeInTheDocument();
    expect(card.getAttribute('data-href')).toBe('/en/word-tower');
  });
});

describe('LandingChallengeCards — Word Forge admin dev-preview gate', () => {
  it('does NOT render the Word Forge card for a non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-landing.wordForgeMode')).toBeNull();
  });

  it('renders the Word Forge card for an admin with /word-forge href', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    const card = screen.getByTestId('mode-landing.wordForgeMode');
    expect(card).toBeInTheDocument();
    expect(card.getAttribute('data-href')).toBe('/en/word-forge');
  });
});

describe('LandingChallengeCards — Word Vault admin dev-preview gate', () => {
  it('does NOT render the Word Vault card for a non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-landing.wordVaultMode')).toBeNull();
  });

  it('renders the Word Vault card for an admin with /word-vault href', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    const card = screen.getByTestId('mode-landing.wordVaultMode');
    expect(card).toBeInTheDocument();
    expect(card.getAttribute('data-href')).toBe('/en/word-vault');
  });
});

describe('LandingChallengeCards — Adventure Prototype admin dev-preview gate', () => {
  it('does NOT render the Adventure Prototype card for a non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-landing.adventurePrototypeMode')).toBeNull();
  });

  it('renders the Adventure Prototype card for an admin with /adventure-prototype href', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    const card = screen.getByTestId('mode-landing.adventurePrototypeMode');
    expect(card).toBeInTheDocument();
    expect(card.getAttribute('data-href')).toBe('/en/adventure-prototype');
  });
});

describe('LandingChallengeCards — Blast Classic admin gate', () => {
  it('does NOT render the Blast Classic card for a non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-landing.blastClassic')).toBeNull();
  });

  it('renders the Blast Classic V1 card for an admin with ?v2=off href', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    const card = screen.getByTestId('mode-landing.blastClassic');
    expect(card).toBeInTheDocument();
    expect(card.getAttribute('data-href')).toBe('/en/blast?v2=off');
  });
});

describe('LandingChallengeCards — collapse-after-MP gate', () => {
  it('renders the "More Game Modes" expander for a brand-new player (zero MP games)', () => {
    mockIsNewPlayer.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(0);
    mockUserStats.mockReturnValue({ totalGamesPlayed: 0 });
    mockUserEmail.mockReturnValue(undefined);
    render(<LandingChallengeCards {...baseProps} />);
    // Non-essential modes are tucked behind the <details> expander.
    expect(screen.getByTestId('landing-section-more')).toBeInTheDocument();
  });

  it('omits the expander once the player has completed any MP game', () => {
    mockIsNewPlayer.mockReturnValue(true); // would normally collapse
    mockGamesCompleted.mockReturnValue(1); // overrides — MP played at least once
    mockUserStats.mockReturnValue({ totalGamesPlayed: 1 });
    mockUserEmail.mockReturnValue(undefined);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('landing-section-more')).toBeNull();
    // And every non-essential mode lives directly in the SP section.
    const spSection = screen.getByTestId('landing-section-sp');
    expect(spSection).toContainElement(screen.getByTestId('mode-landing.blastMode'));
    expect(spSection).toContainElement(screen.getByTestId('mode-landing.wordChainMode'));
  });
});

describe('LandingChallengeCards — Japanese locale gates', () => {
  it('hides connections card for Japanese locale', () => {
    mockUserEmail.mockReturnValue(undefined);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} language="ja" />);
    expect(screen.queryByTestId('mode-landing.wordChainMode')).toBeNull();
  });

  it('shows connections card for English locale', () => {
    mockUserEmail.mockReturnValue(undefined);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} language="en" />);
    expect(screen.getByTestId('mode-landing.wordChainMode')).toBeInTheDocument();
  });

  it('hides wordCraft card for Japanese locale even for beta users', () => {
    mockUserEmail.mockReturnValue('ohadf2015@gmail.com');
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} language="ja" />);
    expect(screen.queryByTestId('mode-wordcraft.modeTitle')).toBeNull();
  });
});
