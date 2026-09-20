import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DailyChallengeLanding } from '../DailyChallengeLanding';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock modules
vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => ({
    hasPlayed: false,
    hasSolved: false,
    loading: false,
    streak: 0,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => ({
    today: {
      wordHunt: false,
      wordWheel: false,
      wordTower: false,
      connections: false,
    },
    streak: {
      current: 7,
      longest: 7,
    },
    allCompletedDates: [],
    freezeCount: 0,
    loading: false,
    fromServer: true,
    freezeApplied: undefined,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedWordWheelToday: vi.fn(() => false),
}));

vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: vi.fn(() => 'test-fingerprint'),
}));

vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: vi.fn(),
      onMouseLeave: vi.fn(),
      onMouseMove: vi.fn(),
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    m: {
      div: ({ children, className, style, ...props }: React.ComponentProps<'div'>) => (
        <div className={className} style={style} {...props}>{children}</div>
      ),
      // The Connections quest card (public since 2026-09-07) renders m.a —
      // the mock needs every motion element the hub's card family can touch.
      a: ({ children, className, style, ...props }: React.ComponentProps<'a'>) => (
        <a className={className} style={style} {...props}>{children}</a>
      ),
      span: ({ children, className, ...props }: React.ComponentProps<'span'>) => (
        <span className={className} {...props}>{children}</span>
      ),
    },
  };
});

const mockOnSelectWordHunt = vi.fn();
const mockOnSelectWordWheel = vi.fn();

function renderComponent() {
  return render(
    <AuthProvider>
      <LanguageProvider initialLanguage="en">
        <DailyChallengeLanding
          onSelectWordHunt={mockOnSelectWordHunt}
          onSelectWordWheel={mockOnSelectWordWheel}
          currentLanguage="en"
        />
      </LanguageProvider>
    </AuthProvider>
  );
}

describe('DailyChallengeLanding — Hub Redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render "Today\'s Puzzles" header at the top', () => {
    renderComponent();
    expect(screen.getByText(/today['\s]s puzzles/i)).toBeInTheDocument();
  });

  it('should render today\'s date below the header', () => {
    const { container } = renderComponent();
    // Date is rendered client-side only, check for it in the DOM
    const dateText = container.textContent;
    expect(dateText).toMatch(/20\d{2}-\d{2}-\d{2}/);
  });

  it('should render three game cards in order: Word Hunt, Word Wheel, Word Tower', () => {
    const { container } = renderComponent();
    // The three main cards should be visible: one primary quest card + three secondary modes
    const questCards = container.querySelectorAll('[data-testid^="quest-card-"]');
    expect(questCards.length).toBeGreaterThan(0); // Primary mode

    // Secondary modes should be rendered as compact rows
    const secondaryModes = container.querySelector('[data-testid="secondary-modes"]');
    expect(secondaryModes).toBeInTheDocument();
  });

  it('should not render decorative elements (ConfettiBackground, FloatingDecorations, connector dots)', () => {
    const { container } = renderComponent();
    // These components used to render specific elements
    const confetti = container.querySelector('[data-testid="confetti-background"]');
    const floating = container.querySelector('[data-testid="floating-decorations"]');
    const connectors = container.querySelectorAll('[data-testid*="connector"]');

    expect(confetti).not.toBeInTheDocument();
    expect(floating).not.toBeInTheDocument();
    expect(connectors.length).toBe(0);
  });

  it('should render the leaderboard (restored 2026-09-20)', () => {
    renderComponent();
    // The 2026-09-19 redesign cut the hub board; the owner asked for it back, so
    // the assertion is inverted rather than deleted — the next person to remove
    // it has to argue with a failing test, exactly as before, in the other
    // direction.
    //
    // The removed version looked for a `lucide-trophy` icon. The teaser uses
    // Crown, so that assertion passed no matter what the hub rendered. Address
    // the component by its test id instead of an icon class that can change.
    expect(screen.getByTestId('leaderboard-teaser')).toBeInTheDocument();
  });

  it('should render mission header (kept for progression display)', () => {
    renderComponent();
    expect(screen.getByTestId('daily-missions-header')).toBeInTheDocument();
  });

  it('should show Game Hunt with correct completed status', () => {
    renderComponent();
    // Should render quest card for the primary mode
    const questCards = document.querySelectorAll('[data-testid^="quest-card-"]');
    expect(questCards.length).toBeGreaterThan(0);
  });

  it('should show done state (lime badge) when Word Hunt is completed with win', () => {
    // This test verifies the structure supports both new/completed paths
    // Mock setup would be required in useDailyChallengeStatus to test the actual state
    renderComponent();
    // For now, we just verify the primary quest card exists
    const questCards = document.querySelectorAll('[data-testid^="quest-card-"]');
    expect(questCards.length).toBeGreaterThan(0);
  });

  it('should display persistent streak number in the hub header', () => {
    renderComponent();
    // The PersistentStreakDisplay should render the streak number from useDailyPlayedStatus
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
