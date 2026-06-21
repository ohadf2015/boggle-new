/**
 * AdventureHuntGame — TDD tests
 *
 * Verifies that hunt archetype levels render real WordHuntGameLayout
 * mechanics rather than the simplified boggle overlay in AdventureGame.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { LevelConfig } from '@/types/adventure';

// ─── Shared mocks ────────────────────────────────────────────────

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
  // ConfirmationDialog (real, un-mocked) calls useLanguage() — provide it too.
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/contexts/ProgressionContext', () => ({
  useProgressionActions: () => ({ completeLevel: vi.fn().mockResolvedValue(undefined) }),
  useProgressionData: () => ({ progression: null }),
}));

vi.mock('@/hooks/useAdventureMusic', () => ({ useAdventureMusic: vi.fn() }));
vi.mock('@/hooks/useChapterQuests', () => ({
  useChapterQuests: () => ({ recordWordsFound: vi.fn(), recordScoreChallenge: vi.fn(), recordLevelPerfect: vi.fn(), recordLongWord: vi.fn() }),
}));
vi.mock('@/lib/adventure/questConfig', () => ({ getChapterNumber: () => 1 }));
vi.mock('@/hooks/useAdventureAchievements', () => ({
  useAdventureAchievements: () => ({ earnAchievement: vi.fn(), getCount: vi.fn().mockReturnValue(0) }),
}));
vi.mock('@/utils/adventureAchievementUtils', () => ({ ADVENTURE_ACHIEVEMENTS: {} }));
vi.mock('@/components/achievements/AchievementToast', () => ({ showAchievementToast: vi.fn() }));
vi.mock('@/hooks/useUpgradeEffects', () => ({
  useUpgradeEffects: () => ({ goldMultiplier: 1, bonusTimeSeconds: 0, longWordGoldBonus: 0 }),
}));

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: (_t: unknown, prop: string) =>
      React.forwardRef(function MotionEl(props: Record<string, unknown>, ref: React.Ref<unknown>) {
        const { children, initial: _i, animate: _a, exit: _e, transition: _tr, ...rest } = props;
        return React.createElement(prop, { ...rest, ref }, children as React.ReactNode);
      }),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// WordHuntGameLayout — stub that records key props
const mockWordHuntGameLayout = vi.fn(({ targetLength, lifePoints, isGameOver, targetFound }: {
  targetLength: number;
  lifePoints: number;
  isGameOver: boolean;
  targetFound: boolean;
  onQuit?: () => void;
}) => (
  <div data-testid="word-hunt-layout">
    <span data-testid="target-length">{targetLength}</span>
    <span data-testid="life-points">{lifePoints}</span>
    <span data-testid="is-game-over">{String(isGameOver)}</span>
    <span data-testid="target-found">{String(targetFound)}</span>
  </div>
));

vi.mock('@/components/wordhunt/WordHuntGameLayout', () => ({
  WordHuntGameLayout: (props: Parameters<typeof mockWordHuntGameLayout>[0]) => mockWordHuntGameLayout(props),
}));

// Hunt utilities
vi.mock('@/lib/adventure/huntMode', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/adventure/huntMode')>();
  return {
    ...real,
    pickHuntTarget: vi.fn().mockReturnValue('BOARD'),
  };
});

// useAdventureWordValidation — supply a small pre-solved set
vi.mock('@/hooks/useAdventureWordValidation', () => ({
  useAdventureWordValidation: () => ({
    solvedWords: new Set(['board', 'road', 'load', 'bard', 'drab', 'bold']),
    isSolveGridLoading: false,
    validateWord: vi.fn().mockResolvedValue({ isValid: true, score: 30 }),
    isValidating: false,
    lastValidationResult: null,
  }),
}));

// SurvivalClueBoxes and SurvivalLifeBar — used inside layout, stub-out for unit tests
vi.mock('@/components/daily/survival/SurvivalClueBoxes', () => ({
  SurvivalClueBoxes: () => <div data-testid="clue-boxes" />,
}));
vi.mock('@/components/daily/survival/SurvivalLifeBar', () => ({
  SurvivalLifeBar: () => <div data-testid="life-bar" />,
}));
vi.mock('@/components/daily/survival/SurvivalGridSection', () => ({
  SurvivalGridSection: () => <div data-testid="grid-section" />,
}));
vi.mock('@/components/wordhunt/WordHuntMPHeader', () => ({
  WordHuntMPHeader: () => <div data-testid="mp-header" />,
}));
vi.mock('@/components/wordhunt/WordHuntMPLeaderboard', () => ({
  WordHuntMPLeaderboard: () => <div data-testid="mp-leaderboard" />,
}));
vi.mock('@/components/wordhunt/WordHuntGameOverOverlay', () => ({
  WordHuntGameOverOverlay: () => null,
}));

// ─── Test fixtures ────────────────────────────────────────────────

const baseGrid: string[][] = [
  ['B', 'O', 'A', 'R'],
  ['D', 'L', 'E', 'S'],
  ['A', 'B', 'C', 'T'],
  ['R', 'D', 'F', 'G'],
];

function makeHuntLevel(overrides: Partial<LevelConfig> = {}): LevelConfig {
  return {
    world: 2,
    level: 3,
    archetype: 'hunt',
    gridSize: 4,
    lifePoints: 120,
    objectives: [{ type: 'findTarget', target: 1 }],
    minWordLength: 3,
    timerSeconds: 0,
    ...overrides,
  } as LevelConfig;
}

// ─── Subject ─────────────────────────────────────────────────────

import AdventureHuntGame from '../AdventureHuntGame';

// ─── Tests ───────────────────────────────────────────────────────

describe('AdventureHuntGame', () => {
  const onLevelComplete = vi.fn();
  const onExit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders WordHuntGameLayout (not the generic AdventureGame grid overlay)', () => {
    render(
      <AdventureHuntGame
        levelConfig={makeHuntLevel()} initialGrid={baseGrid}
        onLevelComplete={onLevelComplete}
        onExit={onExit}
      />
    );
    expect(screen.getByTestId('word-hunt-layout')).toBeInTheDocument();
  });

  it('passes levelConfig.lifePoints to layout', () => {
    render(
      <AdventureHuntGame
        levelConfig={makeHuntLevel({ lifePoints: 100 })} initialGrid={baseGrid}
        onLevelComplete={onLevelComplete}
        onExit={onExit}
      />
    );
    expect(screen.getByTestId('life-points').textContent).toBe('100');
  });

  it('derives targetLength from picked target word', () => {
    // pickHuntTarget returns 'BOARD' (length 5) per mock above
    render(
      <AdventureHuntGame
        levelConfig={makeHuntLevel()} initialGrid={baseGrid}
        onLevelComplete={onLevelComplete}
        onExit={onExit}
      />
    );
    expect(screen.getByTestId('target-length').textContent).toBe('5');
  });

  it('uses levelConfig.hiddenWord when provided (skips pre-solve pick)', () => {
    render(
      <AdventureHuntGame
        levelConfig={makeHuntLevel({ hiddenWord: 'ROAD' })} initialGrid={baseGrid}
        onLevelComplete={onLevelComplete}
        onExit={onExit}
      />
    );
    // hiddenWord ROAD has length 4
    expect(screen.getByTestId('target-length').textContent).toBe('4');
  });

  it('shows exit button with common.exit aria-label', () => {
    render(
      <AdventureHuntGame
        levelConfig={makeHuntLevel()} initialGrid={baseGrid}
        onLevelComplete={onLevelComplete}
        onExit={onExit}
      />
    );
    expect(screen.getByRole('button', { name: 'common.exit' })).toBeInTheDocument();
  });

  it('does NOT exit immediately — opens a quit confirmation dialog first', () => {
    // Regression: tapping exit mid-match used to tear the scene down with no
    // confirmation (window.history.back → blank Capacitor WebView / "black
    // screen on exit"). Exit must now be gated behind a confirmation, matching
    // classic AdventureGame and every other Word Hunt surface.
    render(
      <AdventureHuntGame
        levelConfig={makeHuntLevel()} initialGrid={baseGrid}
        onLevelComplete={onLevelComplete}
        onExit={onExit}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.exit' }));
    expect(onExit).not.toHaveBeenCalled();
    expect(screen.getByText('adventure.game.confirmExit')).toBeInTheDocument();
  });

  it('calls onExit only after the quit confirmation is confirmed', () => {
    render(
      <AdventureHuntGame
        levelConfig={makeHuntLevel()} initialGrid={baseGrid}
        onLevelComplete={onLevelComplete}
        onExit={onExit}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.exit' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.quit' }));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('does not exit when the quit confirmation is cancelled', () => {
    render(
      <AdventureHuntGame
        levelConfig={makeHuntLevel()} initialGrid={baseGrid}
        onLevelComplete={onLevelComplete}
        onExit={onExit}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.exit' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(onExit).not.toHaveBeenCalled();
  });

  it('shows level badge W2·L3', () => {
    render(
      <AdventureHuntGame
        levelConfig={makeHuntLevel()} initialGrid={baseGrid}
        onLevelComplete={onLevelComplete}
        onExit={onExit}
      />
    );
    expect(screen.getByText('W2·L3')).toBeInTheDocument();
  });

  it('starts with isGameOver=false', () => {
    render(
      <AdventureHuntGame
        levelConfig={makeHuntLevel()} initialGrid={baseGrid}
        onLevelComplete={onLevelComplete}
        onExit={onExit}
      />
    );
    expect(screen.getByTestId('is-game-over').textContent).toBe('false');
  });

  it('starts with targetFound=false', () => {
    render(
      <AdventureHuntGame
        levelConfig={makeHuntLevel()} initialGrid={baseGrid}
        onLevelComplete={onLevelComplete}
        onExit={onExit}
      />
    );
    expect(screen.getByTestId('target-found').textContent).toBe('false');
  });

  it('uses getHuntLifePoints(world) as HP fallback when lifePoints not in config', () => {
    // world=2 → getHuntLifePoints(2) = 120
    const cfg = makeHuntLevel({ world: 2 });
    delete (cfg as Record<string, unknown>).lifePoints;
    render(
      <AdventureHuntGame
        levelConfig={cfg} initialGrid={baseGrid}
        onLevelComplete={onLevelComplete}
        onExit={onExit}
      />
    );
    expect(screen.getByTestId('life-points').textContent).toBe('120');
  });

  it('sets isGameOver=true when target is found (enables victory overlay)', () => {
    // We need to trigger a SUBMIT_WORD with the exact target.
    // The mock WordHuntGameLayout records onWordSubmit via the layout stub — but our stub
    // doesn't expose onWordSubmit. Instead verify the reducer logic directly:
    // render with hiddenWord=ROAD then submit ROAD via the onWordSubmit prop captured by mock.
    const onWordSubmitCapture = vi.fn();
    mockWordHuntGameLayout.mockImplementationOnce(({ isGameOver, targetFound, onWordSubmit }: {
      isGameOver: boolean; targetFound: boolean; onWordSubmit?: (w: string) => void;
    }) => {
      onWordSubmitCapture.mockImplementation(onWordSubmit);
      return (
        <div data-testid="word-hunt-layout">
          <span data-testid="is-game-over">{String(isGameOver)}</span>
          <span data-testid="target-found">{String(targetFound)}</span>
          <button data-testid="submit-target" onClick={() => onWordSubmit?.('ROAD')} />
        </div>
      );
    });
    render(
      <AdventureHuntGame
        levelConfig={makeHuntLevel({ hiddenWord: 'ROAD' })} initialGrid={baseGrid}
        onLevelComplete={onLevelComplete}
        onExit={onExit}
      />
    );
    fireEvent.click(screen.getByTestId('submit-target'));
    expect(screen.getByTestId('is-game-over').textContent).toBe('true');
    expect(screen.getByTestId('target-found').textContent).toBe('true');
  });
});
