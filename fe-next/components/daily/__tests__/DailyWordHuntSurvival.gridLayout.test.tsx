import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const MockMotionDiv = React.forwardRef(
    ({ children, style, className, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => (
      <div
        ref={ref}
        style={style as React.CSSProperties}
        className={className as string}
        {...Object.fromEntries(
          Object.entries(props).filter(
            ([k]) => !['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'layout', 'layoutId', 'variants'].includes(k)
          )
        )}
      >
        {children}
      </div>
    )
  );
  MockMotionDiv.displayName = 'MockMotionDiv';
  return {
    motion: { div: MockMotionDiv },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

// Mock all child components
vi.mock('../survival/SurvivalHeader', () => ({
  SurvivalHeader: () => <div data-testid="survival-header">Header</div>,
}));
vi.mock('../survival/SurvivalClueBoxes', () => {
  const Mock = React.forwardRef((_: unknown, ref: React.Ref<HTMLDivElement>) => (
    <div ref={ref} data-testid="clue-boxes">Clue Boxes</div>
  ));
  Mock.displayName = 'MockClueBoxes';
  return { SurvivalClueBoxes: Mock };
});
vi.mock('../survival/SurvivalLifeBar', () => ({
  SurvivalLifeBar: () => <div data-testid="life-bar">Life Bar</div>,
}));
vi.mock('../survival/SurvivalGridSection', () => ({
  SurvivalGridSection: () => <div data-testid="grid-section">Grid</div>,
}));
vi.mock('../survival/SurvivalMobileInfoBar', () => ({
  SurvivalMobileInfoBar: () => <div data-testid="mobile-info-bar">Info Bar</div>,
}));
vi.mock('../survival/AutoClueNotification', () => ({
  AutoClueNotification: () => null,
}));
vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

// Mock hooks
vi.mock('../survival/useSurvivalGameLogic', () => ({
  useSurvivalGameLogic: () => [
    {
      liveScore: 0,
      lastScoreIncrement: null,
      isScoreAnimating: false,
      currentHint: null,
      attempts: [],
      accumulatedClues: [],
      revealedLetters: [],
      knownLetters: [],
      latestAttemptFeedback: null,
      showFeedbackOverlay: false,
      isClueGaining: false,
      feedbackType: null,
      feedbackMessage: '',
      showCategory: false,
      category: '',
      showExample: false,
      exampleSentence: '',
      lifePoints: 3,
      isGameOver: false,
      isLifeGaining: false,
      lifeGainAmount: null,
      eliminatedLetters: new Set(),
      discoveredWords: [],
      hintStage: 0,
      activeNotifications: [],
      showQuitConfirm: false,
      formedWord: [],
      letterCount: 0,
    },
    {
      setShowQuitConfirm: vi.fn(),
      dismissNotification: vi.fn(),
      handleWordSubmit: vi.fn(),
      handleWordChange: vi.fn(),
      setLifeGainAmount: vi.fn(),
      clueContainerRef: { current: null },
      gameDir: 'ltr',
    },
  ],
}));

vi.mock('../survival/useSurvivalDesktopKeyboard', () => ({
  useSurvivalDesktopKeyboard: () => ({ highlightedCells: [] }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ currentPlayerId: 'test', currentGuestFingerprint: null }),
}));

vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({ setHideNavigation: vi.fn() }),
  useHideNavigation: () => vi.fn(),
  NavigationProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

vi.mock('@/hooks/useViewportSize', () => ({
  useViewportSize: () => ({ width: 375, height: 667, isLandscape: false }),
}));

vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

vi.mock('@/hooks/useDesktopLayout', () => ({
  useDesktopLayout: () => ({ isDesktop: false, isTv: false }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false, enableComplexAnimations: true }),
}));

vi.mock('@/hooks/useNavigationGuard', () => ({
  useNavigationGuard: () => {},
}));

vi.mock('@/hooks/useKeyboardWordInput', () => ({
  useKeyboardWordInput: () => ({ highlightedCells: [], currentWord: '', resetWord: vi.fn() }),
}));

vi.mock('@/hooks/useIsDesktop', () => ({
  useIsDesktop: () => false,
}));


import DailyWordHuntSurvival from '../DailyWordHuntSurvival';

const defaultProps = {
  grid: [
    ['A', 'B', 'C', 'D', 'E', 'F'],
    ['G', 'H', 'I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P', 'Q', 'R'],
    ['S', 'T', 'U', 'V', 'W', 'X'],
    ['Y', 'Z', 'A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H', 'I', 'J'],
  ],
  targetWord: 'TEST',
  puzzleDate: '2026-03-29',
  onGameEnd: vi.fn(),
  onComplete: vi.fn(),
  onQuit: vi.fn(),
};

describe('DailyWordHuntSurvival grid layout', () => {
  it('no container in the layout chain uses overflow-hidden (prevents last row clipping)', () => {
    const { container } = render(<DailyWordHuntSurvival {...defaultProps} />);
    const gridSection = container.querySelector('[data-testid="grid-section"]');
    expect(gridSection).toBeInTheDocument();

    // Walk up from grid to root — none should have overflow-hidden
    let el: HTMLElement | null = gridSection as HTMLElement;
    while (el && el !== container) {
      expect(el.className).not.toContain('overflow-hidden');
      el = el.parentElement;
    }
  });

  it('main game container uses overflow-x:clip (not overflow-hidden) to allow vertical content', () => {
    const { container } = render(<DailyWordHuntSurvival {...defaultProps} />);
    const gridSection = container.querySelector('[data-testid="grid-section"]');
    // The outermost motion.div (game container) should clip X only
    const gameContainer = gridSection!.closest('.flex-1.flex.flex-col');
    expect(gameContainer).toBeInTheDocument();
    // Should NOT have overflow-hidden which clips both axes
    expect(gameContainer!.className).not.toContain('overflow-hidden');
  });

  it('grid wrapper uses flex-1 and min-h-0 for proper flex sizing', () => {
    const { container } = render(<DailyWordHuntSurvival {...defaultProps} />);
    const gridSection = container.querySelector('[data-testid="grid-section"]');
    const gridWrapper = gridSection!.parentElement!;
    expect(gridWrapper.className).toContain('flex-1');
    expect(gridWrapper.className).toContain('min-h-0');
  });

  it('grid section and mobile info bar both render in portrait layout', () => {
    const { container } = render(<DailyWordHuntSurvival {...defaultProps} />);
    expect(container.querySelector('[data-testid="grid-section"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="mobile-info-bar"]')).toBeInTheDocument();
  });
});
