import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock LanguageContext
const mockSetLanguage = vi.fn();
const mockT = vi.fn((key: string) => key);
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: mockSetLanguage,
    t: mockT,
    dir: 'ltr',
    currentFlag: '🇺🇸',
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>,
    h1: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <p {...props}>{children}</p>,
  },
}));

import LanguageSelect from '../LanguageSelect';

describe('LanguageSelect', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 5 supported languages', () => {
    render(<LanguageSelect onSelect={mockOnSelect} />);
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('עברית')).toBeInTheDocument();
    expect(screen.getByText('Svenska')).toBeInTheDocument();
    expect(screen.getByText('日本語')).toBeInTheDocument();
    expect(screen.getByText('Español')).toBeInTheDocument();
  });

  it('renders language flags', () => {
    render(<LanguageSelect onSelect={mockOnSelect} />);
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
    expect(screen.getByText('🇮🇱')).toBeInTheDocument();
    expect(screen.getByText('🇸🇪')).toBeInTheDocument();
    expect(screen.getByText('🇯🇵')).toBeInTheDocument();
    expect(screen.getByText('🇪🇸')).toBeInTheDocument();
  });

  it('highlights the currently selected language', () => {
    render(<LanguageSelect onSelect={mockOnSelect} />);
    const englishButton = screen.getByTestId('lang-en');
    // Selected card uses lime border styling
    expect(englishButton.className).toContain('border-neo-lime');
  });

  it('does NOT call setLanguage immediately when tapping a language card', () => {
    // Regression: setLanguage triggers router.push() to a new locale path,
    // which remounts OnboardingFlow and loops the user back to LanguageSelect.
    // Defer language change until the user confirms.
    render(<LanguageSelect onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByTestId('lang-he'));
    expect(mockSetLanguage).not.toHaveBeenCalled();
  });

  it('visually highlights the tapped language card', () => {
    render(<LanguageSelect onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByTestId('lang-he'));
    const hebrewButton = screen.getByTestId('lang-he');
    expect(hebrewButton.className).toContain('border-neo-lime');
  });

  it('applies the selected language and advances when the continue button is clicked', () => {
    render(<LanguageSelect onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByTestId('lang-he'));
    // Language change happens on confirmation, not on tap
    expect(mockSetLanguage).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('language-continue'));

    expect(mockSetLanguage).toHaveBeenCalledWith('he', { skipNavigation: true });
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('does not call setLanguage when confirming with the current language unchanged', () => {
    render(<LanguageSelect onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByTestId('language-continue'));
    expect(mockSetLanguage).not.toHaveBeenCalled();
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('tapping the already-selected language advances immediately', () => {
    render(<LanguageSelect onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByTestId('lang-en')); // already selected
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('has a continue button enabled by default (pre-selected language)', () => {
    render(<LanguageSelect onSelect={mockOnSelect} />);
    const continueBtn = screen.getByTestId('language-continue');
    expect(continueBtn).not.toBeDisabled();
  });
});
