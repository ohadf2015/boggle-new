import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const dismiss = vi.fn();
let mockState = { visible: true, language: 'es', dismiss };

vi.mock('@/hooks/useFirstGameLanguageNotice', () => ({
  useFirstGameLanguageNotice: () => mockState,
}));

let mockSuggested: string | null = null;
vi.mock('@/hooks/useNativeLanguageSuggestion', () => ({
  useNativeLanguageSuggestion: () => ({ suggested: mockSuggested, accept: vi.fn(), dismiss: vi.fn() }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.language ? `${key}:${params.language}` : key,
  }),
}));

// The switcher is independently tested; stub it so this test stays focused.
vi.mock('@/components/QuickLanguageSwitcher', () => ({
  QuickLanguageSwitcher: () => <div data-testid="lang-switcher" />,
}));

import { FirstGameLanguageNotice } from '../FirstGameLanguageNotice';

describe('FirstGameLanguageNotice', () => {
  beforeEach(() => {
    dismiss.mockClear();
    mockState = { visible: true, language: 'es', dismiss };
    mockSuggested = null;
  });

  it('emphasises the active language using its native autonym', () => {
    render(<FirstGameLanguageNotice />);
    // t() stub echoes key + interpolated language; es autonym is "Español".
    expect(screen.getByText('settings.firstGamePlayingIn:Español')).toBeInTheDocument();
  });

  it('offers the language switcher as the change affordance', () => {
    render(<FirstGameLanguageNotice />);
    expect(screen.getByTestId('lang-switcher')).toBeInTheDocument();
  });

  it('calls dismiss when the close button is tapped', () => {
    render(<FirstGameLanguageNotice />);
    fireEvent.click(screen.getByRole('button', { name: 'settings.firstGameDismiss' }));
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('renders nothing when not visible', () => {
    mockState = { visible: false, language: 'es', dismiss };
    const { container } = render(<FirstGameLanguageNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it('defers to the native-language banner when it is offering a switch', () => {
    // Stuck-Brazilian case: en cookie, pt browser -> the more-actionable banner
    // shows; the first-game notice must yield to avoid stacking at top-0.
    mockSuggested = 'es';
    const { container } = render(<FirstGameLanguageNotice />);
    expect(container).toBeEmptyDOMElement();
  });
});
