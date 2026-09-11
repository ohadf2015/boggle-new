import { render, screen, fireEvent } from '@testing-library/react';
import { PracticeResultsCard } from '../PracticeResultsCard';

// PracticeResultsCard is now a thin adapter: every practice mode already
// imports it, so it keeps its old prop shape and delegates the actual payoff to
// PracticeCompletionMoment. These tests pin the adapter contract — the stars,
// confetti and stinger themselves are covered in
// components/education/practice/__tests__/PracticeCompletionMoment.test.tsx.

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'education.practice.time': 'Time',
        'education.practice.maxStreak': 'Max Streak',
        'education.practice.hintsUsed': 'Hints Used',
      };
      const base = translations[key] ?? key;
      return params ? `${base}:${JSON.stringify(params)}` : base;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn() }),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireVictoryConfetti: vi.fn(),
  fireRankConfetti: vi.fn(),
}));

vi.mock('@/components/ui/Mascot', () => ({
  __esModule: true,
  Mascot: ({ variant }: { variant: string }) => <div data-testid="mascot">Mascot: {variant}</div>,
  default: ({ variant }: { variant: string }) => <div data-testid="mascot">Mascot: {variant}</div>,
}));

describe('PracticeResultsCard', () => {
  const defaultProps = {
    correct: 8,
    total: 10,
    onRestart: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the shared completion moment', () => {
    render(<PracticeResultsCard {...defaultProps} />);
    expect(screen.getByTestId('practice-results-card')).toBeInTheDocument();
    expect(screen.getByTestId('practice-completion')).toBeInTheDocument();
  });

  it('scores the round so a strong result earns three stars', () => {
    render(<PracticeResultsCard {...defaultProps} correct={10} total={10} />);
    expect(screen.getByTestId('practice-completion-stars')).toHaveAttribute('data-stars', '3');
  });

  it('still celebrates a weak round with a single star', () => {
    render(<PracticeResultsCard {...defaultProps} correct={2} total={10} />);
    expect(screen.getByTestId('practice-completion-stars')).toHaveAttribute('data-stars', '1');
  });

  it('forwards XP earned', () => {
    render(<PracticeResultsCard {...defaultProps} xpEarned={50} />);
    expect(screen.getByTestId('practice-completion-xp')).toHaveTextContent('50');
  });

  it('omits the XP chip when nothing was earned', () => {
    render(<PracticeResultsCard {...defaultProps} />);
    expect(screen.queryByTestId('practice-completion-xp')).not.toBeInTheDocument();
  });

  it('forwards a server-authored mastery message', () => {
    render(<PracticeResultsCard {...defaultProps} masteryMessage="You are amazing!" />);
    expect(screen.getByText('You are amazing!')).toBeInTheDocument();
  });

  it('maps onRestart onto the AGAIN action', () => {
    render(<PracticeResultsCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('practice-completion-again'));
    expect(defaultProps.onRestart).toHaveBeenCalledTimes(1);
  });

  it('maps onBack onto the all-games action', () => {
    render(<PracticeResultsCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('practice-completion-back'));
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('offers a NEXT button when the picker supplies one', () => {
    const onNext = vi.fn();
    render(<PracticeResultsCard {...defaultProps} onNext={onNext} nextLabel="Spelling" />);
    fireEvent.click(screen.getByTestId('practice-completion-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('turns the optional extras into completion stats', () => {
    render(<PracticeResultsCard {...defaultProps} timeSpent={125} maxStreak={5} hintsUsed={2} />);
    expect(screen.getByTestId('practice-completion-stat-time')).toHaveTextContent('2:05');
    expect(screen.getByTestId('practice-completion-stat-streak')).toHaveTextContent('5');
    expect(screen.getByTestId('practice-completion-stat-hints')).toHaveTextContent('2');
  });

  it('renders no stats grid when no extras are supplied', () => {
    render(<PracticeResultsCard {...defaultProps} />);
    expect(screen.queryByTestId('practice-completion-stat-time')).not.toBeInTheDocument();
    expect(screen.queryByTestId('practice-completion-stat-streak')).not.toBeInTheDocument();
    expect(screen.queryByTestId('practice-completion-stat-hints')).not.toBeInTheDocument();
  });

  it('renders only the extras it was given', () => {
    render(<PracticeResultsCard {...defaultProps} timeSpent={60} />);
    expect(screen.getByTestId('practice-completion-stat-time')).toHaveTextContent('1:00');
    expect(screen.queryByTestId('practice-completion-stat-streak')).not.toBeInTheDocument();
  });

  it('applies a custom className to the wrapper', () => {
    render(<PracticeResultsCard {...defaultProps} className="custom-class" />);
    expect(screen.getByTestId('practice-results-card')).toHaveClass('custom-class');
  });
});
