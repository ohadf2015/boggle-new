import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DailyChallengeLanding } from '../DailyChallengeLanding';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock modules (reuse from hubRedesign.test.tsx setup)
const { useDailyChallengeStatus: mockUseDailyChallengeStatus } = vi.hoisted(() => ({
  useDailyChallengeStatus: vi.fn(() => ({
    hasPlayed: false,
    hasSolved: false,
    loading: false,
    streak: 0,
    refresh: vi.fn(),
  })),
}));

vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: mockUseDailyChallengeStatus,
}));

vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: vi.fn(() => ({
    today: {
      wordHunt: false,
      wordWheel: false,
      wordTower: false,
      connections: false,
    },
    streak: { current: 0, longest: 0 },
    allCompletedDates: [],
    freezeCount: 0,
    loading: false,
    fromServer: true,
    freezeApplied: undefined,
    refresh: vi.fn(),
  })),
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

describe('DailyChallengeLanding — Visual Hierarchy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Word Hunt as hero when all modes are unplayed', () => {
    renderComponent();

    // Word Hunt should be the primary hero (full quest card)
    const questCard = document.querySelector('[data-testid="quest-card-word-hunt"]');
    expect(questCard).toBeInTheDocument();

    // Word Wheel, Word Tower, Connections should be compact rows
    expect(document.querySelector('[data-testid="compact-row-yellow"]')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="compact-row-cyan"]')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="compact-row-purple"]')).toBeInTheDocument();
  });

  it('should render compact rows for non-primary modes', () => {
    renderComponent();

    // Word Hunt is primary (hero) when all modes are new
    // So Word Wheel, Word Tower, Connections should be compact rows
    expect(document.querySelector('[data-testid="compact-row-yellow"]')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="compact-row-cyan"]')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="compact-row-purple"]')).toBeInTheDocument();
  });

  it('should show Word Hunt as primary when Word Hunt is new (unplayed)', () => {
    renderComponent();

    // When all modes are unplayed, Word Hunt should be the primary hero
    const questCard = document.querySelector('[data-testid="quest-card-word-hunt"]');
    expect(questCard).toBeInTheDocument();

    // Verify secondary modes are compact rows, not heroes
    const secondaryModes = document.querySelector('[data-testid="secondary-modes"]');
    expect(secondaryModes).toBeInTheDocument();
    const compactRows = secondaryModes?.querySelectorAll('[data-testid^="compact-row"]');
    expect(compactRows?.length).toBe(3);
  });

  it('moves the hero off Word Hunt once Word Hunt has been won today', () => {
    // The previous version of this test asserted the same all-unplayed DOM as every other test and
    // would have passed with pickPrimaryMode deleted. Mock the WON state for real instead.
    mockUseDailyChallengeStatus.mockReturnValue({
      hasPlayed: true,
      hasSolved: true,
      loading: false,
      streak: 3,
      refresh: vi.fn(),
    });

    renderComponent();

    // Word Hunt is done, so it must not still be the illustrated hero...
    expect(document.querySelector('[data-testid="quest-card-word-hunt"]')).toBeNull();
    // ...and it must appear as one of the compact secondary rows instead.
    const secondaryModes = document.querySelector('[data-testid="secondary-modes"]');
    const rows = secondaryModes?.querySelectorAll('[data-testid^="compact-row"]') ?? [];
    expect(rows.length).toBe(3);
    // Exactly one mode holds the hero slot, and it is some mode other than Word Hunt.
    // Match the mode ids explicitly: `quest-card-accent` / `quest-card-image-overlay` are inner
    // parts of a single card, so a `^="quest-card-"` selector counts one card three times.
    const MODE_IDS = ['word-hunt', 'word-wheel', 'word-tower', 'connections'];
    const heroModes = MODE_IDS.filter((id) => document.querySelector(`[data-testid="quest-card-${id}"]`));
    expect(heroModes).toHaveLength(1);
    expect(heroModes[0]).not.toBe('word-hunt');
  });
});
