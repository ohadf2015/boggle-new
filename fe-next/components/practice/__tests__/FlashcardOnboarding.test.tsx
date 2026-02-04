import { render, screen, fireEvent } from '@testing-library/react';
import { FlashcardOnboarding } from '../FlashcardOnboarding';

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'education.practice.swipeHint': 'Swipe to answer',
        'education.practice.swipeExplain':
          "Swipe right for 'Got It', left for 'Don't Know'",
        'education.practice.gotIt': 'Got It',
        'education.practice.dontKnow': "Don't Know",
        'common.gotIt': 'Got it!',
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

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('FlashcardOnboarding', () => {
  const defaultProps = {
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders when isVisible is true', () => {
    render(<FlashcardOnboarding {...defaultProps} isVisible />);

    expect(screen.getByText('Swipe to answer')).toBeInTheDocument();
    expect(
      screen.getByText("Swipe right for 'Got It', left for 'Don't Know'")
    ).toBeInTheDocument();
  });

  it('does not render when isVisible is false', () => {
    render(<FlashcardOnboarding {...defaultProps} isVisible={false} />);

    expect(screen.queryByText('Swipe to answer')).not.toBeInTheDocument();
  });

  it('renders Got it button', () => {
    render(<FlashcardOnboarding {...defaultProps} isVisible />);

    expect(screen.getByRole('button', { name: /got it/i })).toBeInTheDocument();
  });

  it('calls onDismiss when Got it button is clicked', () => {
    render(<FlashcardOnboarding {...defaultProps} isVisible />);

    fireEvent.click(screen.getByRole('button', { name: /got it/i }));

    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders mascot with thinking variant', () => {
    render(<FlashcardOnboarding {...defaultProps} isVisible />);

    expect(screen.getByTestId('mascot')).toBeInTheDocument();
    expect(screen.getByText(/mascot: thinking/i)).toBeInTheDocument();
  });

  it('renders swipe gesture indicators', () => {
    render(<FlashcardOnboarding {...defaultProps} isVisible />);

    // Check for swipe direction indicators
    expect(screen.getByTestId('swipe-left-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('swipe-right-indicator')).toBeInTheDocument();
  });

  it('has accessible overlay structure', () => {
    render(<FlashcardOnboarding {...defaultProps} isVisible />);

    // Should have proper role for modal-like overlay
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('FlashcardOnboarding localStorage utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('hasSeenOnboarding returns false when not set', () => {
    // Import the utility after mocking localStorage
    const { hasSeenFlashcardOnboarding } = require('../FlashcardOnboarding');

    expect(hasSeenFlashcardOnboarding()).toBe(false);
    expect(localStorageMock.getItem).toHaveBeenCalledWith(
      'flashcard-onboarding-complete'
    );
  });

  it('hasSeenOnboarding returns true when set', () => {
    localStorageMock.getItem.mockReturnValueOnce('true');
    const { hasSeenFlashcardOnboarding } = require('../FlashcardOnboarding');

    expect(hasSeenFlashcardOnboarding()).toBe(true);
  });

  it('markOnboardingComplete sets localStorage flag', () => {
    const { markFlashcardOnboardingComplete } = require('../FlashcardOnboarding');

    markFlashcardOnboardingComplete();

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'flashcard-onboarding-complete',
      'true'
    );
  });
});
