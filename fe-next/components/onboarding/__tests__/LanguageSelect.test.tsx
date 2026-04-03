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
  motion: {
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

  it('calls setLanguage when a language card is clicked', () => {
    render(<LanguageSelect onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByTestId('lang-he'));
    expect(mockSetLanguage).toHaveBeenCalledWith('he');
  });

  it('calls onSelect after selecting and clicking continue', () => {
    render(<LanguageSelect onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByTestId('lang-he'));
    // Click the continue button
    const continueBtn = screen.getByTestId('language-continue');
    fireEvent.click(continueBtn);
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('has a continue button enabled by default (pre-selected language)', () => {
    render(<LanguageSelect onSelect={mockOnSelect} />);
    const continueBtn = screen.getByTestId('language-continue');
    expect(continueBtn).not.toBeDisabled();
  });
});
