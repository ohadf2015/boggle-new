/**
 * LandscapeLayout Combo Glow + Haptic Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
  useLanguageSafe: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('framer-motion', () => {
  const createMotionComponent = (Tag: string) => {
    const Component = React.forwardRef(
      (
        { children, ...props }: React.PropsWithChildren<Record<string, unknown>>,
        ref: React.Ref<Element>
      ) => {
        const {
          animate, initial, exit, transition,
          whileHover, whileTap, variants,
          whileInView, viewport, layout, layoutId,
          drag, dragConstraints,
          onAnimationComplete, onAnimationStart,
          style, ...domProps
        } = props as Record<string, unknown>;
        const cleanStyle = typeof style === 'object' ? style : undefined;
        return React.createElement(Tag, { ...domProps, style: cleanStyle, ref }, children);
      }
    );
    Component.displayName = `motion.${Tag}`;
    return Component;
  };

  return {
    motion: {
      div: createMotionComponent('div'),
      span: createMotionComponent('span'),
      p: createMotionComponent('p'),
      button: createMotionComponent('button'),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('@/components/GridComponent', () => {
  const MockGrid = () => {
    return <div data-testid="grid-component">Grid</div>;
  };
  return { default: MockGrid };
});
vi.mock('@/components/CircularTimer', () => {
  const MockTimer = () => {
    return <div>Timer</div>;
  };
  return { default: MockTimer };
});
vi.mock('@/components/game/WordFormingArea', () => {
  const WordFormingArea = () => <div>WordFormingArea</div>;
  return { __esModule: true, default: WordFormingArea };
});
vi.mock('@/components/game/ComboDisplay', () => {
  const MockCombo = () => {
    return <div>ComboDisplay</div>;
  };
  return { default: MockCombo };
});
vi.mock('@/components/game/CompactLeaderboard', () => {
  const MockLeaderboard = () => {
    return <div>CompactLeaderboard</div>;
  };
  return { default: MockLeaderboard };
});
vi.mock('@/components/game/FloatingScoreAnimation', () => {
  const MockFloating = () => {
    return null;
  };
  return { default: MockFloating };
});
vi.mock('@/components/game/in-game/components/GameOverlays', () => ({
  GameOverlays: () => <div>GameOverlays</div>,
}));
vi.mock('@/components/game/in-game/components/GameHeader', () => ({
  GameHeader: () => <div>GameHeader</div>,
}));
vi.mock('@/components/game/in-game/components/ScoreDisplay', () => ({
  ScoreDisplay: () => <div>ScoreDisplay</div>,
}));
vi.mock('@/components/game/LeadChangeBanner', () => ({
  LeadChangeBanner: () => null,
}));
vi.mock('@/components/game/BlastMultiplayerOverlay', () => ({
  BlastMultiplayerOverlay: () => null,
}));
vi.mock('@/components/game/WordHuntTargetArea', () => ({
  WordHuntTargetArea: () => null,
}));
vi.mock('@/components/game/WordHuntLifeBar', () => ({
  WordHuntLifeBar: () => null,
}));
vi.mock('@/components/game/WordHuntPlayerLives', () => ({
  WordHuntPlayerLives: () => null,
}));
vi.mock('@/components/singleplayer/game/components/DynamicEnergyBackground', () => ({
  DynamicEnergyBackground: () => null,
}));
vi.mock('@/components/game/ComboMilestoneAnnouncement', () => ({
  ComboMilestoneAnnouncement: () => null,
}));
vi.mock('@/components/game/ScreenFlashOverlay', () => ({
  ScreenFlashOverlay: () => null,
}));
vi.mock('@/components/game/keyboardTrailsUtils', () => ({
  shouldShowKeyboardTrails: () => false,
}));
vi.mock('@/components/HintButton', () => {
  const MockHintButton = () => {
    return null;
  };
  return { default: MockHintButton };
});

const mockVibrateWordSubmit = vi.fn();
vi.mock('@/components/grid/hapticFeedback', () => ({
  vibrateWordSubmit: (...args: unknown[]) => mockVibrateWordSubmit(...args),
}));

import { LandscapeLayout } from '../in-game/components/LandscapeLayout';

const baseProps = {
  username: 'testUser',
  isPlaying: true,
  t: (key: string) => key,
  dir: 'ltr' as const,
  letterGrid: [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ],
  remainingTime: 120,
  timerValue: 3,
  gameActive: true,
  showStartAnimation: false,
  gameLanguage: 'en' as const,
  comboLevel: 0,
  comboTimeRemaining: null,
  comboDanger: false,
  fireRoundActive: false,
  isExtremelyShortLandscape: false,
  hasAnimated: true,
  earthquakeState: 'idle' as const,
  playerScore: 50,
  playerRank: 1,
  leaderboard: [],
  formedWord: '',
  letterCount: 0,
  currentFeedback: null,
  isTypingMode: false,
  typedWord: '',
  highlightedCells: [],
  lastWordFoundTime: 0,
  onWordSubmit: vi.fn(),
  onWordChange: vi.fn(),
  onSingleTapDetected: vi.fn(),
  fireRoundRemaining: 0,
  showDragTutorial: false,
  onDismissDragTutorial: vi.fn(),
  isDesktop: false,
  showQuickTip: false,
  onDismissQuickTip: vi.fn(),
  isHelpOpen: false,
  onCloseHelp: vi.fn(),
  minWordLength: 3,
};

describe('LandscapeLayout Combo Glow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have no glow when comboLevel is 0', () => {
    render(<LandscapeLayout {...baseProps} comboLevel={0} />);
    const gridWrapper = screen.getByTestId('grid-wrapper-landscape');
    expect(gridWrapper.className).not.toContain('shadow-[0_0_');
  });

  it('should have cyan glow when comboLevel >= 3', () => {
    render(<LandscapeLayout {...baseProps} comboLevel={4} />);
    const gridWrapper = screen.getByTestId('grid-wrapper-landscape');
    expect(gridWrapper.className).toContain('shadow-[0_0_10px_rgba(0,255,255,0.3)]');
  });

  it('should have yellow glow when comboLevel >= 5', () => {
    render(<LandscapeLayout {...baseProps} comboLevel={6} />);
    const gridWrapper = screen.getByTestId('grid-wrapper-landscape');
    expect(gridWrapper.className).toContain('shadow-[0_0_15px_rgba(255,225,53,0.4)]');
  });

  it('should have magenta glow when comboLevel >= 7', () => {
    render(<LandscapeLayout {...baseProps} comboLevel={10} />);
    const gridWrapper = screen.getByTestId('grid-wrapper-landscape');
    expect(gridWrapper.className).toContain('shadow-[0_0_20px_rgba(255,0,255,0.4)]');
  });

  it('should have transition-shadow for smooth animation', () => {
    render(<LandscapeLayout {...baseProps} comboLevel={3} />);
    const gridWrapper = screen.getByTestId('grid-wrapper-landscape');
    expect(gridWrapper.className).toContain('transition-shadow');
  });
});

describe('LandscapeLayout Haptic Feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger haptic on word accept', () => {
    const { rerender } = render(<LandscapeLayout {...baseProps} />);

    rerender(
      <LandscapeLayout
        {...baseProps}
        currentFeedback={{ type: 'accepted', score: 15, word: 'game', id: '1', timestamp: Date.now() }}
      />
    );

    expect(mockVibrateWordSubmit).toHaveBeenCalledWith(4, 0, false);
  });

  it('should not trigger haptic on rejected word', () => {
    const { rerender } = render(<LandscapeLayout {...baseProps} />);

    rerender(
      <LandscapeLayout
        {...baseProps}
        currentFeedback={{ type: 'rejected', word: 'xx', id: '2', timestamp: Date.now() }}
      />
    );

    expect(mockVibrateWordSubmit).not.toHaveBeenCalled();
  });
});
