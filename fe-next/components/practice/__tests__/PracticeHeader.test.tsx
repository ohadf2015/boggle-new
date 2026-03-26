import { render, screen, fireEvent } from '@testing-library/react';
import { PracticeHeader } from '../PracticeHeader';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'education.practice.flashcards': 'Flashcards',
        'education.practice.soloBoard': 'Solo Board',
        'education.practice.wordList': 'Word List',
        'education.practice.warmup': 'Warmup',
        'education.xp.level': 'Level',
        'education.xp.streak': 'day streak',
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock XpProgressBar
vi.mock('@/components/education/XpProgressBar', () => ({
  __esModule: true,
  default: ({ totalXp }: { totalXp: number }) => (
    <div data-testid="xp-progress-bar">XP: {totalXp}</div>
  ),
}));

// Mock StreakBonusIndicator
vi.mock('@/components/education/StreakBonusIndicator', () => ({
  __esModule: true,
  default: ({ currentStreak }: { currentStreak: number }) => (
    <div data-testid="streak-indicator">Streak: {currentStreak}</div>
  ),
}));

// Mock Mascot
vi.mock('@/components/ui/Mascot', () => ({
  __esModule: true,
  Mascot: ({ variant }: { variant: string }) => (
    <div data-testid="mascot">Mascot: {variant}</div>
  ),
  default: ({ variant }: { variant: string }) => (
    <div data-testid="mascot">Mascot: {variant}</div>
  ),
}));

describe('PracticeHeader', () => {
  const defaultProps = {
    lessonName: 'Test Lesson',
    mode: 'flashcard' as const,
    totalXp: 500,
    currentStreak: 5,
    progress: 50,
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders lesson name and mode', () => {
    render(<PracticeHeader {...defaultProps} />);

    expect(screen.getByText('Test Lesson')).toBeInTheDocument();
    expect(screen.getByText('Flashcards')).toBeInTheDocument();
  });

  it('renders XP progress bar', () => {
    render(<PracticeHeader {...defaultProps} />);

    expect(screen.getByTestId('xp-progress-bar')).toBeInTheDocument();
    expect(screen.getByText(/XP: 500/)).toBeInTheDocument();
  });

  it('renders streak indicator when streak > 0', () => {
    render(<PracticeHeader {...defaultProps} />);

    expect(screen.getByTestId('streak-indicator')).toBeInTheDocument();
    expect(screen.getByText(/Streak: 5/)).toBeInTheDocument();
  });

  it('does not render streak indicator when streak is 0', () => {
    render(<PracticeHeader {...defaultProps} currentStreak={0} />);

    expect(screen.queryByTestId('streak-indicator')).not.toBeInTheDocument();
  });

  it('renders progress bar with correct percentage', () => {
    render(<PracticeHeader {...defaultProps} />);

    const progressBar = screen.getByTestId('practice-progress-bar');
    expect(progressBar).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<PracticeHeader {...defaultProps} />);

    const backButton = screen.getByLabelText(/back/i);
    fireEvent.click(backButton);

    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('renders mascot when showMascot is true', () => {
    render(<PracticeHeader {...defaultProps} showMascot />);

    expect(screen.getByTestId('mascot')).toBeInTheDocument();
  });

  it('does not render mascot by default', () => {
    render(<PracticeHeader {...defaultProps} />);

    expect(screen.queryByTestId('mascot')).not.toBeInTheDocument();
  });

  it('displays correct mode label for each mode type', () => {
    const modes = [
      { mode: 'flashcard', label: 'Flashcards' },
      { mode: 'solo_board', label: 'Solo Board' },
      { mode: 'word_list', label: 'Word List' },
      { mode: 'warmup', label: 'Warmup' },
    ] as const;

    modes.forEach(({ mode, label }) => {
      const { unmount } = render(
        <PracticeHeader {...defaultProps} mode={mode} />
      );
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });
});
