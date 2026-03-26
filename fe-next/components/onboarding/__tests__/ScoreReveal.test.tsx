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
  return {
    motion: { div: MotionDiv, span: MotionDiv },
    AnimatePresence: function AnimatePresence({ children }: any) {
      return <>{children}</>;
    },
  };
});

// Mock lucide-react
vi.mock('lucide-react', () => ({
  TrendingUp: () => <div data-testid="trending-up" />,
  RotateCcw: () => <div data-testid="rotate-ccw" />,
  ArrowRight: () => <div data-testid="arrow-right" />,
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'onboarding.ftue.yourScore': 'You scored {{score}}',
        'onboarding.ftue.averageScore': "Today's average is {{average}}",
        'onboarding.ftue.tryAgain': 'Try again?',
        'onboarding.ftue.continue': 'Continue',
      };
      let text = translations[key] || key;
      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([k, v]) => {
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
    expect(screen.getByText('47')).toBeInTheDocument();
  });

  it('displays the average score', () => {
    render(<ScoreReveal {...defaultProps} />);
    expect(screen.getByText('62')).toBeInTheDocument();
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
});
