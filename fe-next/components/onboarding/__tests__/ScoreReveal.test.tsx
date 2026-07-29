import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(function MotionDiv(
    { children, ...props }: any,
    ref: any
  ) {
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  });
  const MotionButton = React.forwardRef(function MotionButton(
    { children, ...props }: any,
    ref: any
  ) {
    return (
      <button ref={ref} {...props}>
        {children}
      </button>
    );
  });
  return {
    m: { div: MotionDiv, span: MotionDiv, button: MotionButton },
    AnimatePresence: function AnimatePresence({ children }: any) {
      return <>{children}</>;
    },
  };
});

// Mock lucide-react
vi.mock('lucide-react', () => ({
  RotateCcw: () => <div data-testid="rotate-ccw" />,
  ArrowRight: () => <div data-testid="arrow-right" />,
  Sparkles: () => <div data-testid="sparkles" />,
  Trophy: () => <div data-testid="trophy-icon" />,
}));

// Mock confettiUtils — both the opening victory burst and the staggered
// firework follow-up need stubs so the mount effect doesn't crash in jsdom.
vi.mock('@/utils/confettiUtils', () => ({
  fireVictoryConfetti: vi.fn(),
  fireFireworks: vi.fn(() => () => {}),
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, paramsOrFallback?: any, fallback?: string) => {
      const translations: Record<string, string> = {
        'onboarding.ftue.yourScore': 'You scored {{score}}',
        'onboarding.ftue.averageScore': "Today's average is {{average}}",
        'onboarding.ftue.tryAgain': 'Try again?',
        'onboarding.ftue.continue': 'Continue',
        'onboarding.ftue.aboveAverage': 'Above average!',
        'onboarding.ftue.niceWork': 'Nice work!',
      };
      let text = translations[key];
      if (!text) {
        // Handle t(key, fallback) pattern
        if (typeof paramsOrFallback === 'string') return paramsOrFallback;
        if (typeof fallback === 'string') return fallback;
        return key;
      }
      if (paramsOrFallback && typeof paramsOrFallback === 'object') {
        Object.entries(paramsOrFallback).forEach(([k, v]) => {
          text = text.replace(`{{${k}}}`, String(v));
        });
      }
      return text;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

import ScoreReveal from '../ScoreReveal';
import { fireVictoryConfetti } from '@/utils/confettiUtils';

describe('ScoreReveal', () => {
  const defaultProps = {
    score: 47,
    averageScore: 62,
    onTryAgain: vi.fn(),
    onContinue: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the score reveal component', () => {
    render(<ScoreReveal {...defaultProps} />);
    expect(screen.getByTestId('score-reveal')).toBeInTheDocument();
  });

  it('displays the player score', () => {
    render(<ScoreReveal {...defaultProps} />);
    expect(screen.getAllByText('47').length).toBeGreaterThanOrEqual(1);
  });

  it('displays the average score', () => {
    render(<ScoreReveal {...defaultProps} />);
    expect(screen.getAllByText('62').length).toBeGreaterThanOrEqual(1);
  });

  it('shows try again button', () => {
    render(<ScoreReveal {...defaultProps} />);
    expect(screen.getByText('Try again?')).toBeInTheDocument();
  });

  it('calls onTryAgain when try again is clicked', () => {
    render(<ScoreReveal {...defaultProps} />);
    fireEvent.click(screen.getByText('Try again?'));
    expect(defaultProps.onTryAgain).toHaveBeenCalledTimes(1);
  });

  it('calls onContinue when continue is clicked', () => {
    render(<ScoreReveal {...defaultProps} />);
    fireEvent.click(screen.getByText('Continue'));
    expect(defaultProps.onContinue).toHaveBeenCalledTimes(1);
  });

  it('fires confetti on mount', () => {
    render(<ScoreReveal {...defaultProps} />);
    expect(fireVictoryConfetti).toHaveBeenCalledTimes(1);
  });

  it('shows trophy celebration icon', () => {
    render(<ScoreReveal {...defaultProps} />);
    expect(screen.getByTestId('trophy-icon')).toBeInTheDocument();
  });

  it('shows above average badge when score beats average', () => {
    render(<ScoreReveal {...defaultProps} score={100} averageScore={62} />);
    expect(screen.getByText('Above average!')).toBeInTheDocument();
  });

  it('does not show above average badge when score is below average', () => {
    render(<ScoreReveal {...defaultProps} score={40} averageScore={62} />);
    expect(screen.queryByText('Above average!')).not.toBeInTheDocument();
  });
});
