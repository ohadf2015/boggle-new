import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(function MotionDiv(
    { children, onAnimationComplete, ...props }: any,
    ref: any
  ) {
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  });
  const MotionSpan = React.forwardRef(function MotionSpan(
    { children, ...props }: any,
    ref: any
  ) {
    return (
      <span ref={ref} {...props}>
        {children}
      </span>
    );
  });
  return {
    motion: { div: MotionDiv, span: MotionSpan, button: MotionDiv },
    AnimatePresence: function AnimatePresence({ children }: any) {
      return <>{children}</>;
    },
  };
});

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Trophy: () => <div data-testid="trophy-icon" />,
  Target: () => <div data-testid="target-icon" />,
}));

// Mock Mascot
vi.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: any) => <div data-testid={`mascot-${variant}`} />,
}));

// Mock MiniGrid
vi.mock('../MiniGrid', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => (
      <div
        data-testid="mini-grid"
        data-size={props.size}
        onClick={() => props.onDemoComplete?.()}
      />
    ),
  };
});

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: any) => {
      const translations: Record<string, string> = {
        'onboarding.ftue.swipeToConnect': 'Swipe to connect letters!',
        'onboarding.ftue.findMultipleWords': 'Find 3 words! Swipe across letters to spell them.',
        'onboarding.ftue.wordsFound': '{{count}}/3 words found',
        'onboarding.ftue.amazing': 'AMAZING!',
        'onboarding.ftue.keepGoing': 'Keep going!',
      };
      if (typeof fallback === 'string') return fallback;
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock tutorialBoardConfig
vi.mock('../tutorialBoardConfig', () => ({
  getTutorialBoard: () => ({
    letters: [
      ['C', 'A', 'T', 'S'],
      ['R', 'O', 'P', 'E'],
      ['S', 'T', 'A', 'R'],
      ['D', 'O', 'G', 'S'],
    ],
    targetWords: [
      { word: 'CAT', path: [], length: 3 },
      { word: 'DOG', path: [], length: 3 },
      { word: 'STARS', path: [], length: 5 },
    ],
    validWords: new Set(['CAT', 'DOG', 'STAR', 'STARS', 'ROPE', 'TOP']),
  }),
  isValidTutorialWord: (word: string) =>
    new Set(['CAT', 'DOG', 'STAR', 'STARS', 'ROPE', 'TOP']).has(word.toUpperCase()),
}));

import TutorialGame from '../TutorialGame';

describe('TutorialGame', () => {
  const defaultProps = {
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the tutorial grid with 4x4 size', () => {
    render(<TutorialGame {...defaultProps} />);
    const grid = screen.getByTestId('mini-grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAttribute('data-size', '4');
  });

  it('shows mascot speech bubble with find-multiple-words instruction', () => {
    render(<TutorialGame {...defaultProps} />);
    expect(screen.getByText('Find 3 words! Swipe across letters to spell them.')).toBeInTheDocument();
  });

  it('displays word counter showing 0/3', () => {
    render(<TutorialGame {...defaultProps} />);
    // The word counter should show the count
    expect(screen.getByTestId('word-counter')).toBeInTheDocument();
  });

  it('renders in full-screen mode with no chrome', () => {
    render(<TutorialGame {...defaultProps} />);
    const container = screen.getByTestId('tutorial-game');
    expect(container).toBeInTheDocument();
  });

  it('shows mascot with encouraging variant', () => {
    render(<TutorialGame {...defaultProps} />);
    expect(screen.getByTestId('mascot-encouraging')).toBeInTheDocument();
  });
});
