import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { BlastLevel } from '@/lib/blast/v2/types';

vi.mock('../BlastAtmosphereOverlay', () => ({ BlastAtmosphereOverlay: () => null }));
vi.mock('../BlastFxOverlay', () => ({ BlastFxOverlay: () => null }));
vi.mock('@/lib/blast/v2/fx', () => ({
  useBlastFx: () => new Proxy({}, { get: () => () => {} }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, fallback: string) => fallback }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
  useNavigation: () => ({ isInGame: false, setIsInGame: vi.fn(), activeTab: 'home', setActiveTab: vi.fn() }),
}));
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
import type { BlastProgressApi } from '@/lib/blast/v2/useBlastProgress';

const makeProgress = (): BlastProgressApi => ({
  state: { coins: 0, chestNumber: 1, chestProgress: 0, chestContents: null, unlocksSeenFlag: {}, veteranBonusGranted: false },
  clearLevel: vi.fn(),
  openChest: vi.fn(),
  clearMutation: { status: 'idle' },
  openMutation: { status: 'idle' },
  currentLevel: 1,
  maxLevelCleared: 0,
  progressLoaded: true,
  isGuest: false,
});

// CAT / SUN / EGG all sit as formable vertical runs, so any answer-marking
// code path has something to mark.
const levelAt = (levelNumber: number): BlastLevel => ({
  id: `glow-test-${levelNumber}`,
  levelNumber,
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
  difficulty: levelNumber,
});

describe('BlastGame — never marks the answer on its own', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  // The reveal glow is reserved for the paid Hint button. Automatic glow turns
  // every board into a guided demo: the tiles to drag are already lit up.
  // Levels 1–2 carried the persistent tutorial answer-glow; 3 is the control.
  // (From L4 up the unlock concept cards gate the board behind a tap, so higher
  // levels are covered by the same shared code path rather than a separate case.)
  it.each([1, 2, 3])('renders no reveal glow on an untouched level %i board', async (n) => {
    render(<BlastGame level={levelAt(n)} progress={makeProgress()} onAdvance={vi.fn()} />);
    vi.advanceTimersByTime(1500);
    await waitFor(() => {
      expect(screen.getByTestId('blast-board')).toBeInTheDocument();
    });
    expect(document.querySelectorAll('[data-reveal-glow]')).toHaveLength(0);
  });

  // "Almost word" ghosts printed `neededLetter` — the exact missing letter of a
  // target word — into the empty cell where it belongs. That is the answer, one
  // letter at a time, and it also rendered adrift below the board because the
  // ghost layer measures against the shrinking tile column while the cell wells
  // stay full height.
  it('renders no almost-word ghost letters', async () => {
    // col1 is empty, so CAT is one letter short across row 0 → the ghost layer
    // would print "A" at c1r0.
    const almostLevel: BlastLevel = {
      ...levelAt(1),
      id: 'almost-ghost-test',
      columns: [
        { index: 0, tiles: ['C'] },
        { index: 1, tiles: [] },
        { index: 2, tiles: ['T'] },
      ],
      words: ['CAT'],
      resolvableOrder: ['CAT'],
    };
    render(<BlastGame level={almostLevel} progress={makeProgress()} onAdvance={vi.fn()} />);
    vi.advanceTimersByTime(1500);
    await waitFor(() => {
      expect(screen.getByTestId('blast-board')).toBeInTheDocument();
    });
    expect(document.querySelectorAll('[data-almost-ghost]')).toHaveLength(0);
    expect(screen.queryByTestId('blast-almost-layer')).not.toBeInTheDocument();
  });
});
