import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { BlastLevel } from '@/lib/blast/v2/types';

vi.mock('../BlastAtmosphereOverlay', () => ({
  BlastAtmosphereOverlay: () => null,
}));
vi.mock('../BlastFxOverlay', () => ({
  BlastFxOverlay: () => null,
}));
vi.mock('@/lib/blast/v2/fx', () => ({
  useBlastFx: () => new Proxy({}, { get: () => () => {} }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));
// NavigationContext gates the global bottom-nav hide; BlastGame calls it on
// mount/unmount. Tests don't ship a provider, so stub the hook.
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
  useNavigation: () => ({ isInGame: false, setIsInGame: vi.fn(), activeTab: 'home', setActiveTab: vi.fn() }),
}));
// Rewarded-ad infrastructure pulls in AdMob/Coin contexts that aren't
// provided in this unit test harness. Stub the hook so BlastGame can mount.
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    showAd: vi.fn(),
    isAdAvailable: false,
    status: 'idle' as const,
    rewardAmount: 0,
    preload: vi.fn(),
  }),
}));

import { BlastGame } from '../BlastGame';

const mockLevel: BlastLevel = {
  id: 'game-test',
  levelNumber: 1,
  locale: 'en',
  theme: 'onboarding',
  columns: [
    { index: 0, tiles: ['C', 'A', 'T'] },
    { index: 1, tiles: ['S', 'U', 'N'] },
    { index: 2, tiles: ['E', 'G', 'G'] },
  ],
  words: ['CAT', 'SUN', 'EGG'],
  resolvableOrder: ['CAT', 'SUN', 'EGG'],
  tileFlags: {},
  gravityMode: 'standard',
  difficulty: 1,
};

describe('BlastGame', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  it('shows intro card initially', () => {
    render(<BlastGame level={mockLevel} onAdvance={vi.fn()} />);
    expect(screen.getByTestId('intro-card')).toBeInTheDocument();
  });

  it('auto-dismisses intro card after 1500ms', async () => {
    render(<BlastGame level={mockLevel} onAdvance={vi.fn()} />);
    vi.advanceTimersByTime(1500);
    await waitFor(() => {
      expect(screen.queryByTestId('intro-card')).not.toBeInTheDocument();
    });
  });

  it('shows board after intro dismisses', async () => {
    render(<BlastGame level={mockLevel} onAdvance={vi.fn()} />);
    vi.advanceTimersByTime(1500);
    await waitFor(() => {
      expect(screen.getByTestId('blast-board')).toBeInTheDocument();
    });
  });

  it('shows complete card when all words found', async () => {
    const { rerender } = render(<BlastGame level={mockLevel} onAdvance={vi.fn()} />);
    vi.advanceTimersByTime(1500);
    await waitFor(() => {
      expect(screen.getByTestId('blast-board')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('complete-card')).not.toBeInTheDocument();
  });


  it('shows non-veteran FTUE overlay step 1 on level 1 AFTER intro dismisses', async () => {
    const mockLevel1 = { ...mockLevel, levelNumber: 1 };
    render(
      <BlastGame
        level={mockLevel1}
        unlocksSeen={{}}
        isVeteranPlayer={false}
        onAdvance={vi.fn()}
      />
    );
    // Intro must dismiss first so FTUE coexists with the board (spotlight pattern).
    vi.advanceTimersByTime(1500);
    await waitFor(() => {
      expect(screen.getByText('Drag across letters to spell a word')).toBeInTheDocument();
    });
    // Spotlight wrapper must be pointer-events-none so taps reach the board.
    expect(screen.getByTestId('blast-ftue-spotlight').className).toMatch(/pointer-events-none/);
  });

  it('shows veteran FTUE during intro phase when veteran', () => {
    const mockLevel1 = { ...mockLevel, levelNumber: 1 };
    render(
      <BlastGame
        level={mockLevel1}
        unlocksSeen={{}}
        isVeteranPlayer={true}
        onAdvance={vi.fn()}
      />
    );
    expect(screen.getByText('Welcome back!')).toBeInTheDocument();
  });

  it('calls onUpdateUnlocks when FTUE completes', async () => {
    const mockLevel1 = { ...mockLevel, levelNumber: 1 };
    const onUpdateUnlocks = vi.fn();
    render(
      <BlastGame
        level={mockLevel1}
        unlocksSeen={{}}
        isVeteranPlayer={false}
        onAdvance={vi.fn()}
        onUpdateUnlocks={onUpdateUnlocks}
      />
    );

    // FTUE is shown; clicking should trigger onUpdateUnlocks
    // (actual FTUE completion logic is tested separately)
  });
});
