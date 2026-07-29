/** AdventureTailOverlays — tail overlay block: mode vignettes, toasts, tutorial, retry assist. */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdventureTailOverlays from './AdventureTailOverlays';

vi.mock('@/components/wordhunt/LowHPOverlay', () => ({
  LowHPOverlay: ({ hp }: { hp: number }) => <div data-testid="low-hp">{hp}</div>,
}));
vi.mock('./AdventureToast', () => ({
  AdventureToast: () => <div data-testid="adventure-toast" />,
}));
vi.mock('./MechanicBonusToast', () => ({
  default: () => <div data-testid="mechanic-toast" />,
}));
vi.mock('./RetryAssistModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="retry-assist" /> : null,
}));
vi.mock('./AdventureTutorial', () => ({
  AdventureTutorial: () => <div data-testid="tutorial" />,
}));
vi.mock('@/components/wordForge/RuneBar', () => ({
  RuneBar: () => <div data-testid="rune-bar" />,
}));
vi.mock('@/lib/adventure/nearMiss', () => ({
  getNearMissMessages: () => [],
}));
vi.mock('@/utils/posthogEngagement', () => ({
  trackModalDismissed: vi.fn(),
}));

const baseProps = {
  archetype: 'hunt' as const,
  currentHP: 0.2,
  movesRemaining: 3,
  isPlaying: true,
  upgradeTriggered: null,
  lastWordWasThemed: false,
  themedBonusMultiplier: undefined,
  mechanicBonus: null,
  dismissMechanicBonus: vi.fn(),
  bossActive: false,
  showRetryAssist: false,
  consecutiveFailures: 0,
  wordsFoundCount: 0,
  score: 0,
  bestAttempt: null,
  objectives: [],
  onRetryFromAssist: vi.fn(),
  onRetryWithBonus: vi.fn(),
  onRetryWithHint: vi.fn(),
  onExit: vi.fn(),
  showTutorial: false,
  onTutorialComplete: vi.fn(),
  forgeEquippedRunes: [],
  maxRuneSlots: 3,
};

describe('AdventureTailOverlays', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders LowHPOverlay only when hunt archetype with HP', () => {
    render(<AdventureTailOverlays {...baseProps} />);
    expect(screen.getByTestId('low-hp')).toBeInTheDocument();
  });

  it('skips LowHPOverlay when not hunt', () => {
    render(<AdventureTailOverlays {...baseProps} archetype="blast" />);
    expect(screen.queryByTestId('low-hp')).not.toBeInTheDocument();
  });

  it('renders blast last-move vignette when blast + 1 move + playing', () => {
    const { container } = render(
      <AdventureTailOverlays {...baseProps} archetype="blast" movesRemaining={1} />
    );
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('always renders AdventureToast and MechanicBonusToast', () => {
    render(<AdventureTailOverlays {...baseProps} />);
    expect(screen.getByTestId('adventure-toast')).toBeInTheDocument();
    expect(screen.getByTestId('mechanic-toast')).toBeInTheDocument();
  });

  it('renders RetryAssistModal when showRetryAssist', () => {
    render(<AdventureTailOverlays {...baseProps} showRetryAssist />);
    expect(screen.getByTestId('retry-assist')).toBeInTheDocument();
  });

  it('renders AdventureTutorial when showTutorial', () => {
    render(<AdventureTailOverlays {...baseProps} showTutorial />);
    expect(screen.getByTestId('tutorial')).toBeInTheDocument();
  });

  it('renders RuneBar when forge + runes equipped', () => {
    render(
      <AdventureTailOverlays
        {...baseProps}
        archetype="forge"
        forgeEquippedRunes={[{ id: 'r1' } as never]}
      />
    );
    expect(screen.getByTestId('rune-bar')).toBeInTheDocument();
  });

  it('skips RuneBar when forge but no runes', () => {
    render(<AdventureTailOverlays {...baseProps} archetype="forge" />);
    expect(screen.queryByTestId('rune-bar')).not.toBeInTheDocument();
  });
});
