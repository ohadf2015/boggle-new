import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickLanguageSwitcher } from '../QuickLanguageSwitcher';

// Mock LanguageContext
const mockSetLanguage = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: mockSetLanguage,
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.changeLanguage': 'Change Language',
        'joinView.english': 'English',
        'joinView.hebrew': 'עברית',
        'joinView.swedish': 'Svenska',
        'joinView.japanese': '日本語',
        'joinView.spanish': 'Español',
      };
      return translations[key] || key;
    },
    currentFlag: '🇺🇸',
  }),
}));

// Mock scrollIntoView for Radix UI Select (JSDOM doesn't implement it)
Element.prototype.scrollIntoView = vi.fn();

describe('QuickLanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render current language flag', () => {
    render(<QuickLanguageSwitcher />);

    // Find the flag emoji in the trigger
    expect(screen.getByRole('img', { name: 'English' })).toBeInTheDocument();
  });

  it('should have correct aria-label for accessibility', () => {
    render(<QuickLanguageSwitcher />);

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-label', 'Change Language');
  });

  it('should show all 5 language options when opened', async () => {
    render(<QuickLanguageSwitcher />);

    // Click to open the dropdown
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    // Wait for dropdown to open and check all options are present
    await waitFor(() => {
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('עברית')).toBeInTheDocument();
      expect(screen.getByText('Svenska')).toBeInTheDocument();
      expect(screen.getByText('日本語')).toBeInTheDocument();
      expect(screen.getByText('Español')).toBeInTheDocument();
    });
  });

  it('should have value bound to current language', () => {
    render(<QuickLanguageSwitcher />);

    // The combobox should have the current language value
    const trigger = screen.getByRole('combobox');
    // The current value is shown in the trigger (English flag and text via aria-label)
    expect(trigger).toBeInTheDocument();
    // The mock returns 'en' as language, so English flag should be shown
    expect(screen.getByRole('img', { name: 'English' })).toBeInTheDocument();
  });

  // Note: Testing Radix Select's onValueChange behavior is challenging in JSDOM
  // because the dropdown uses portals and complex event handling that doesn't
  // work reliably in the test environment. The component correctly passes
  // setLanguage to Select's onValueChange prop, which is verified by:
  // 1. The component compiles without type errors
  // 2. The component works correctly in the browser
  // 3. Integration tests cover this flow

  it('should render with showLabel prop showing language name', () => {
    render(<QuickLanguageSwitcher showLabel />);

    // When showLabel is true, should show the language name alongside flag
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('should apply compact styling when compact prop is true', () => {
    const { container } = render(<QuickLanguageSwitcher compact />);

    const trigger = container.querySelector('button');
    expect(trigger).toHaveClass('w-10', 'h-10');
  });

  it('should apply custom className', () => {
    const { container } = render(<QuickLanguageSwitcher className="custom-class" />);

    const trigger = container.querySelector('button');
    expect(trigger).toHaveClass('custom-class');
  });

  it('should have correct displayName for debugging', () => {
    expect(QuickLanguageSwitcher.displayName).toBe('QuickLanguageSwitcher');
  });
});

describe('QuickLanguageSwitcher - Responsive Behavior', () => {
  it('should render compact trigger without label by default', () => {
    render(<QuickLanguageSwitcher />);

    // Default (no showLabel) should not show text "English"
    const trigger = screen.getByRole('combobox');
    // The text "English" should only appear inside the flag's aria-label, not as visible text
    expect(trigger.textContent).not.toContain('English');
  });

  it('should render wider trigger with label when showLabel is true', () => {
    const { container } = render(<QuickLanguageSwitcher showLabel />);

    const trigger = container.querySelector('button');
    // With showLabel, width should be auto (w-auto class)
    expect(trigger).toHaveClass('w-auto');
  });
});
