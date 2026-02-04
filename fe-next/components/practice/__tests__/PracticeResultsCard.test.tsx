import { render, screen, fireEvent } from '@testing-library/react';
import { PracticeResultsCard } from '../PracticeResultsCard';

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'education.practice.encouragement0': 'Keep trying! Practice makes progress.',
        'education.practice.encouragement50': 'Good effort! Keep practicing.',
        'education.practice.encouragement80': 'Great job! Almost there.',
        'education.practice.encouragement100': "Perfect! You've mastered these words.",
        'education.practice.tryAgain': 'Try Again',
        'education.practice.back': 'Back',
        'education.practice.correctCount': 'correct',
        'education.xp.earned': 'XP earned',
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock Mascot
jest.mock('@/components/ui/Mascot', () => ({
  __esModule: true,
  Mascot: ({ variant }: { variant: string }) => (
    <div data-testid="mascot">Mascot: {variant}</div>
  ),
  default: ({ variant }: { variant: string }) => (
    <div data-testid="mascot">Mascot: {variant}</div>
  ),
}));

describe('PracticeResultsCard', () => {
  const defaultProps = {
    correct: 8,
    total: 10,
    onRestart: jest.fn(),
    onBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders percentage score', () => {
    render(<PracticeResultsCard {...defaultProps} />);

    // 8/10 = 80%
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('renders correct/total count', () => {
    render(<PracticeResultsCard {...defaultProps} />);

    expect(screen.getByText(/8.*\/.*10/)).toBeInTheDocument();
  });

  it('renders XP earned when provided', () => {
    render(<PracticeResultsCard {...defaultProps} xpEarned={50} />);

    expect(screen.getByText(/\+50/)).toBeInTheDocument();
  });

  it('does not render XP when not provided', () => {
    render(<PracticeResultsCard {...defaultProps} />);

    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
  });

  it('renders custom mastery message when provided', () => {
    render(
      <PracticeResultsCard {...defaultProps} masteryMessage="You are amazing!" />
    );

    expect(screen.getByText('You are amazing!')).toBeInTheDocument();
  });

  it('renders encouragement message for 0% score', () => {
    render(<PracticeResultsCard {...defaultProps} correct={0} total={10} />);

    expect(
      screen.getByText('Keep trying! Practice makes progress.')
    ).toBeInTheDocument();
  });

  it('renders encouragement message for 50% score', () => {
    render(<PracticeResultsCard {...defaultProps} correct={5} total={10} />);

    expect(screen.getByText('Good effort! Keep practicing.')).toBeInTheDocument();
  });

  it('renders encouragement message for 80% score', () => {
    render(<PracticeResultsCard {...defaultProps} correct={8} total={10} />);

    expect(screen.getByText('Great job! Almost there.')).toBeInTheDocument();
  });

  it('renders encouragement message for 100% score', () => {
    render(<PracticeResultsCard {...defaultProps} correct={10} total={10} />);

    expect(
      screen.getByText("Perfect! You've mastered these words.")
    ).toBeInTheDocument();
  });

  it('calls onRestart when Try Again button is clicked', () => {
    render(<PracticeResultsCard {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(defaultProps.onRestart).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when Back button is clicked', () => {
    render(<PracticeResultsCard {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('renders mascot with appropriate variant based on score', () => {
    // High score should show celebration mascot
    render(<PracticeResultsCard {...defaultProps} correct={10} total={10} />);

    expect(screen.getByTestId('mascot')).toBeInTheDocument();
    expect(screen.getByText(/mascot: celebration/i)).toBeInTheDocument();
  });

  it('renders oops mascot for low scores', () => {
    render(<PracticeResultsCard {...defaultProps} correct={2} total={10} />);

    expect(screen.getByText(/mascot: oops/i)).toBeInTheDocument();
  });

  it('renders trophy icon', () => {
    render(<PracticeResultsCard {...defaultProps} />);

    expect(screen.getByTestId('results-trophy')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<PracticeResultsCard {...defaultProps} className="custom-class" />);

    const card = screen.getByTestId('practice-results-card');
    expect(card).toHaveClass('custom-class');
  });
});
