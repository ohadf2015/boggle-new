/**
 * LandingChallengeCards — visibility gates
 *
 * 1. Word Craft (territory + Card Run) is PUBLIC; Gem Hunt stays admin-only.
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

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/components/landing/home/HomeDailyHero', () => {
  const HomeDailyHero = () => <div data-testid="home-daily-hero" />;
  HomeDailyHero.displayName = 'HomeDailyHero';
  return { __esModule: true, HomeDailyHero };
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
// Drives the in-work-mode gate (canSeeInWorkModes = admin OR beta tester). Named
// mockIsAdmin for history; admins are a subset of in-work access, so true/false
// here exercises the same gate beta testers now share.
const mockIsAdmin = vi.fn(() => false);
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: mockUserEmail() }, canSeeInWorkModes: mockIsAdmin() }),
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

describe('LandingChallengeCards — Word Craft consolidated to ONE public card', () => {
  it('renders the single wordCraft territory card → /word-craft for a non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    const card = container.querySelector('[data-cube-key="wordCraft"]');
    expect(card).toBeInTheDocument();
    expect(card?.getAttribute('href')).toBe('/en/word-craft');
  });

  it('renders the wordCraft card when signed out (public)', () => {
    mockIsAdmin.mockReturnValue(false);
    mockUserEmail.mockReturnValue(undefined);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    expect(container.querySelector('[data-cube-key="wordCraft"]')).toBeInTheDocument();
  });

  it('surfaces NO separate Card Run / Pass & Play / Gem Hunt hub cards (consolidated)', () => {
    // Cards & Gems are admin-only URL sub-modes (see gateWordCraftMode); pass-and-play
    // is an in-game option. None get their own hub card anymore — even for an admin.
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    // only one wordcraft card (no separate cards/pass/gems)
    const wordCraftCards = container.querySelectorAll('[data-cube-key="wordCraft"]');
    expect(wordCraftCards.length).toBe(1);
  });
});

describe('LandingChallengeCards — Word Tower admin solo gate', () => {
  it('does NOT render the Word Tower card for a non-admin user', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    expect(container.querySelector('[data-cube-key="wordTower"]')).toBeNull();
  });

  it('renders the Word Tower SOLO card for an admin with /word-tower href', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    const card = container.querySelector('[data-cube-key="wordTower"]');
    expect(card).toBeInTheDocument();
    expect(card?.getAttribute('href')).toBe('/en/word-tower');
  });
});

describe('LandingChallengeCards — Shiritori admin dev-preview gate', () => {
  it('does NOT render the Shiritori card for a non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    expect(container.querySelector('[data-cube-key="shiritori"]')).toBeNull();
  });

  it('renders the Shiritori card for an admin linking to the playable solo route', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    const card = container.querySelector('[data-cube-key="shiritori"]');
    expect(card).toBeInTheDocument();
    // Card must start the game, not dump the user on the /shiritori marketing
    // page whose primary CTA bounces to /multiplayer.
    expect(card?.getAttribute('href')).toBe('/en/shiritori/solo');
  });
});


describe('LandingChallengeCards — full admin dev-preview roster', () => {
  it('renders ALL 4 admin-gated dev preview cards for a post-newbie admin', () => {
    mockIsAdmin.mockReturnValue(true);
    mockUserEmail.mockReturnValue('admin@example.com');
    // Past newbie + first-timer + newcomer-by-games gates → no collapse expander,
    // every admin card lives directly in the rendered grid (not inside <details>).
    mockIsNewPlayer.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    mockUserStats.mockReturnValue({ totalGamesPlayed: 50 });
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    const expected = [
      // WordCraft consolidated to ONE public card; Cards/Gems are URL sub-modes
      // (gateWordCraftMode), not hub cards — so none appear in this admin roster.
      // Party, Word Alchemy, Word Forge and Word Vault modes were removed.
      'wordTower',          // Word Tower
      'shiritori',          // Shiritori
      'sealedBid',          // Sealed Bid
      'wordfall',           // Wordfall (Blast V2)
    ];
    for (const key of expected) {
      const card = container.querySelector(`[data-cube-key="${key}"]`);
      expect(card, `missing admin card: ${key}`).toBeInTheDocument();
    }
  });

  it('renders ZERO admin dev preview cards for a non-admin (same fixture)', () => {
    mockIsAdmin.mockReturnValue(false);
    mockUserEmail.mockReturnValue(undefined);
    mockIsNewPlayer.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    mockUserStats.mockReturnValue({ totalGamesPlayed: 50 });
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    const adminOnly = [
      'wordTower',
      'shiritori',
      'sealedBid',
      'wordfall',
    ];
    for (const key of adminOnly) {
      const card = container.querySelector(`[data-cube-key="${key}"]`);
      expect(card, `leaked admin card to non-admin: ${key}`).toBeNull();
    }
  });
});

describe('LandingChallengeCards — Sealed Bid admin dev-preview gate', () => {
  it('does NOT render the Sealed Bid card for a non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    expect(container.querySelector('[data-cube-key="sealedBid"]')).toBeNull();
  });

  it('renders the Sealed Bid card for an admin with the /sealed-bid href', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    const card = container.querySelector('[data-cube-key="sealedBid"]');
    expect(card).toBeInTheDocument();
    expect(card?.getAttribute('href')).toBe('/en/sealed-bid');
  });
});

describe('LandingChallengeCards — Wordfall (Blast V2) admin dev-preview gate', () => {
  it('does NOT render the Wordfall card for a non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    expect(container.querySelector('[data-cube-key="wordfall"]')).toBeNull();
  });

  it('renders the Wordfall card for an admin/beta with the /blast/v2 href', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    const card = container.querySelector('[data-cube-key="wordfall"]');
    expect(card).toBeInTheDocument();
    expect(card?.getAttribute('href')).toBe('/en/blast/v2');
  });
});

describe('LandingChallengeCards — Crossword admin dev-preview gate', () => {
  it('does NOT render the Crossword card for a non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    expect(container.querySelector('[data-cube-key="crossword"]')).toBeNull();
  });

  it('renders the Crossword card for an admin with the /crossword href', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    const card = container.querySelector('[data-cube-key="crossword"]');
    expect(card).toBeInTheDocument();
    expect(card?.getAttribute('href')).toBe('/en/crossword');
  });
});

describe('LandingChallengeCards — Adventure beta/admin gate', () => {
  // Adventure ships in the server card order; the client gate hides it unless
  // the user can see in-work modes (admin OR beta tester).
  const withAdventure = { ...baseProps, cardOrder: ['daily', 'arena', 'blast', 'adventure', 'practice'] as const };

  it('does NOT render the Adventure card for a non-beta/non-admin user', () => {
    mockIsAdmin.mockReturnValue(false);
    mockIsNewPlayer.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...withAdventure} />);
    expect(container.querySelector('[data-cube-key="adventure"]')).toBeNull();
  });

  it('renders the Adventure card for a beta tester / admin with /adventure href', () => {
    mockIsAdmin.mockReturnValue(true);
    mockIsNewPlayer.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...withAdventure} />);
    const card = container.querySelector('[data-cube-key="adventure"]');
    expect(card).toBeInTheDocument();
    expect(card?.getAttribute('href')).toBe('/en/adventure');
  });
});

describe('LandingChallengeCards — all modes always surfaced', () => {
  it('never renders the "More Game Modes" expander, even for a brand-new player', () => {
    mockIsNewPlayer.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(0);
    mockUserStats.mockReturnValue({ totalGamesPlayed: 0 });
    mockUserEmail.mockReturnValue(undefined);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    expect(container.querySelector('[data-testid="landing-cubes-more"]')).toBeNull();
    // Every non-essential mode lives directly in the visible grid.
    expect(container.querySelector('[data-cube-key="blast"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cube-key="connections"]')).toBeInTheDocument();
  });

  it('still shows all modes directly once the player has completed any MP game', () => {
    mockIsNewPlayer.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(1);
    mockUserStats.mockReturnValue({ totalGamesPlayed: 1 });
    mockUserEmail.mockReturnValue(undefined);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    expect(container.querySelector('[data-testid="landing-cubes-more"]')).toBeNull();
    expect(container.querySelector('[data-cube-key="blast"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cube-key="connections"]')).toBeInTheDocument();
  });
});

describe('LandingChallengeCards — Japanese locale gates', () => {
  // Connections was hidden for ja from 2026-05-12 until 2026-08-09 — a gate added
  // three months BEFORE the Japanese puzzle pool existed. The pool now has 194
  // active puzzles and the landing ships native ja copy, so the card must show.
  it('shows connections card for Japanese locale', () => {
    mockUserEmail.mockReturnValue(undefined);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} language="ja" />);
    expect(container.querySelector('[data-cube-key="connections"]')).toBeInTheDocument();
  });

  it('shows connections card for English locale', () => {
    mockUserEmail.mockReturnValue(undefined);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} language="en" />);
    expect(container.querySelector('[data-cube-key="connections"]')).toBeInTheDocument();
  });

  it('shows the public wordCraft territory card for Japanese locale (ja tile bag + dictionary)', () => {
    mockUserEmail.mockReturnValue(undefined);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} language="ja" />);
    expect(container.querySelector('[data-cube-key="wordCraft"]')).toBeInTheDocument();
  });

  it('still hides the wordCraft Gem Hunt card for Japanese locale', () => {
    mockIsAdmin.mockReturnValue(true);
    mockUserEmail.mockReturnValue('ohadf2015@gmail.com');
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} language="ja" />);
    // wordCraft is a single consolidated cube, no separate gems card
    const wordCraftCards = container.querySelectorAll('[data-cube-key="wordCraft"]');
    expect(wordCraftCards.length).toBe(1);
  });
});
