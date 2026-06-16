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
    render(<LandingChallengeCards {...baseProps} />);
    const card = screen.getByTestId('mode-wordcraft.modeTitle');
    expect(card).toBeInTheDocument();
    expect(card.getAttribute('data-href')).toBe('/en/word-craft');
  });

  it('renders the wordCraft card when signed out (public)', () => {
    mockIsAdmin.mockReturnValue(false);
    mockUserEmail.mockReturnValue(undefined);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.getByTestId('mode-wordcraft.modeTitle')).toBeInTheDocument();
  });

  it('surfaces NO separate Card Run / Pass & Play / Gem Hunt hub cards (consolidated)', () => {
    // Cards & Gems are admin-only URL sub-modes (see gateWordCraftMode); pass-and-play
    // is an in-game option. None get their own hub card anymore — even for an admin.
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-wordcraft.cardsModeTitle')).toBeNull();
    expect(screen.queryByTestId('mode-wordcraft.passPlayModeTitle')).toBeNull();
    expect(screen.queryByTestId('mode-wordcraft.gemsModeTitle')).toBeNull();
    // and exactly one wordcraft card remains
    expect(screen.getByTestId('mode-wordcraft.modeTitle')).toBeInTheDocument();
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

describe('LandingChallengeCards — Party Games admin dev-preview gate', () => {
  it('does NOT render the Party Games card for a non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-landing.partyMode')).toBeNull();
  });

  it('renders the Party Games card for an admin with /party href', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    const card = screen.getByTestId('mode-landing.partyMode');
    expect(card).toBeInTheDocument();
    expect(card.getAttribute('data-href')).toBe('/en/party');
  });
});

describe('LandingChallengeCards — Word Alchemy admin dev-preview gate', () => {
  it('does NOT render the Word Alchemy card for a non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-landing.wordAlchemyMode')).toBeNull();
  });

  it('renders the Word Alchemy card for an admin with /word-alchemy href', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    const card = screen.getByTestId('mode-landing.wordAlchemyMode');
    expect(card).toBeInTheDocument();
    expect(card.getAttribute('data-href')).toBe('/en/word-alchemy');
  });
});

describe('LandingChallengeCards — Shiritori admin dev-preview gate', () => {
  it('does NOT render the Shiritori card for a non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-landing.shiritoriMode')).toBeNull();
  });

  it('renders the Shiritori card for an admin linking to the playable solo route', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    const card = screen.getByTestId('mode-landing.shiritoriMode');
    expect(card).toBeInTheDocument();
    // Card must start the game, not dump the user on the /shiritori marketing
    // page whose primary CTA bounces to /multiplayer.
    expect(card.getAttribute('data-href')).toBe('/en/shiritori/solo');
  });
});


describe('LandingChallengeCards — full admin dev-preview roster', () => {
  it('renders ALL 7 admin-gated dev preview cards for a post-newbie admin', () => {
    mockIsAdmin.mockReturnValue(true);
    mockUserEmail.mockReturnValue('admin@example.com');
    // Past newbie + first-timer + newcomer-by-games gates → no collapse expander,
    // every admin card lives directly in the rendered grid (not inside <details>).
    mockIsNewPlayer.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    mockUserStats.mockReturnValue({ totalGamesPlayed: 50 });
    render(<LandingChallengeCards {...baseProps} />);
    const expected = [
      // WordCraft consolidated to ONE public card; Cards/Gems are URL sub-modes
      // (gateWordCraftMode), not hub cards — so none appear in this admin roster.
      'mode-wordTower.cardTitle',          // Word Tower
      'mode-landing.wordForgeMode',        // Word Forge
      'mode-landing.wordVaultMode',        // Word Vault
      'mode-landing.partyMode',            // Party Games
      'mode-landing.wordAlchemyMode',      // Word Alchemy
      'mode-landing.shiritoriMode',        // Shiritori
      'mode-landing.sealedBidMode',        // Sealed Bid
    ];
    for (const id of expected) {
      expect(screen.getByTestId(id), `missing admin card: ${id}`).toBeInTheDocument();
    }
  });

  it('renders ZERO admin dev preview cards for a non-admin (same fixture)', () => {
    mockIsAdmin.mockReturnValue(false);
    mockUserEmail.mockReturnValue(undefined);
    mockIsNewPlayer.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    mockUserStats.mockReturnValue({ totalGamesPlayed: 50 });
    render(<LandingChallengeCards {...baseProps} />);
    const adminOnly = [
      'mode-wordTower.cardTitle',
      'mode-landing.wordForgeMode',
      'mode-landing.wordVaultMode',
      'mode-landing.partyMode',
      'mode-landing.wordAlchemyMode',
      'mode-landing.shiritoriMode',
      'mode-landing.sealedBidMode',
    ];
    for (const id of adminOnly) {
      expect(screen.queryByTestId(id), `leaked admin card to non-admin: ${id}`).toBeNull();
    }
  });
});

describe('LandingChallengeCards — Sealed Bid admin dev-preview gate', () => {
  it('does NOT render the Sealed Bid card for a non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-landing.sealedBidMode')).toBeNull();
  });

  it('renders the Sealed Bid card for an admin with the /sealed-bid href', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    const card = screen.getByTestId('mode-landing.sealedBidMode');
    expect(card).toBeInTheDocument();
    expect(card.getAttribute('data-href')).toBe('/en/sealed-bid');
  });
});

describe('LandingChallengeCards — Crossword admin dev-preview gate', () => {
  it('does NOT render the Crossword card for a non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-crossword.name')).toBeNull();
  });

  it('renders the Crossword card for an admin with the /crossword href', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    const card = screen.getByTestId('mode-crossword.name');
    expect(card).toBeInTheDocument();
    expect(card.getAttribute('data-href')).toBe('/en/crossword');
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

  it('shows the public wordCraft territory card for Japanese locale (ja tile bag + dictionary)', () => {
    mockUserEmail.mockReturnValue(undefined);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} language="ja" />);
    expect(screen.getByTestId('mode-wordcraft.modeTitle')).toBeInTheDocument();
  });

  it('still hides the wordCraft Gem Hunt card for Japanese locale', () => {
    mockIsAdmin.mockReturnValue(true);
    mockUserEmail.mockReturnValue('ohadf2015@gmail.com');
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} language="ja" />);
    expect(screen.queryByTestId('mode-wordcraft.gemsModeTitle')).toBeNull();
  });
});
