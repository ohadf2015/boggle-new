import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickPracticeButton } from '../QuickPracticeButton';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'education.practice.quickPractice': 'Practice',
        'education.practice.flashcards': 'Flashcards',
        'education.practice.soloBoard': 'Solo Board',
        'education.practice.wordList': 'Word List',
        'education.practice.warmup': 'Warmup',
        'education.practice.moreOptions': 'More options',
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

describe('QuickPracticeButton', () => {
  const defaultProps = {
    onPractice: vi.fn(),
    lessonId: 'test-lesson-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders practice button', () => {
    render(<QuickPracticeButton {...defaultProps} />);
    expect(screen.getByRole('button', { name: /practice/i })).toBeInTheDocument();
  });

  it('calls onPractice with flashcard when primary button clicked', () => {
    render(<QuickPracticeButton {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /practice/i }));

    expect(defaultProps.onPractice).toHaveBeenCalledWith('flashcard');
  });

  it('shows dropdown with all 4 modes when dropdown trigger clicked', () => {
    render(<QuickPracticeButton {...defaultProps} />);

    // Click the dropdown trigger (chevron button)
    const dropdownTrigger = screen.getByLabelText(/more options/i);
    fireEvent.click(dropdownTrigger);

    // All 4 modes should be visible
    expect(screen.getByText(/flashcards/i)).toBeInTheDocument();
    expect(screen.getByText(/solo board/i)).toBeInTheDocument();
    expect(screen.getByText(/word list/i)).toBeInTheDocument();
    expect(screen.getByText(/warmup/i)).toBeInTheDocument();
  });

  it('calls onPractice with correct mode when dropdown option clicked', () => {
    render(<QuickPracticeButton {...defaultProps} />);

    // Open dropdown
    fireEvent.click(screen.getByLabelText(/more options/i));

    // Click solo board option
    fireEvent.click(screen.getByText(/solo board/i));

    expect(defaultProps.onPractice).toHaveBeenCalledWith('solo_board');
  });

  it('closes dropdown after selecting an option', async () => {
    render(<QuickPracticeButton {...defaultProps} />);

    // Open dropdown
    fireEvent.click(screen.getByLabelText(/more options/i));
    expect(screen.getByText(/word list/i)).toBeInTheDocument();

    // Click an option
    fireEvent.click(screen.getByText(/word list/i));

    // Dropdown should close (wait for state update)
    await waitFor(() => {
      expect(screen.queryByText(/warmup/i)).not.toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    render(<QuickPracticeButton {...defaultProps} className="custom-class" />);

    const container = screen.getByTestId('quick-practice-button');
    expect(container).toHaveClass('custom-class');
  });

  it('shows session counts when provided', () => {
    const sessionCounts = {
      flashcard: 5,
      solo_board: 3,
      word_list: 2,
      warmup: 1,
      matching: 0,
      spelling: 0,
      blitz: 0,
    };

    render(<QuickPracticeButton {...defaultProps} sessionCounts={sessionCounts} />);

    // Open dropdown
    fireEvent.click(screen.getByLabelText(/more options/i));

    // Check session counts are displayed
    expect(screen.getByText(/5 sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/3 sessions/i)).toBeInTheDocument();
  });
});
