import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  it('reserves layout space instead of overlaying the top strip', () => {
    // Regression: a `fixed top-0 inset-x-0` bar floated over the in-game exit
    // button (top-left classic / top-right word-hunt), making it hard to tap.
    // The banner must sit IN FLOW so it pushes content down and clears both
    // corners at any viewport width.
    render(<FirstGameLanguageNotice />);
    const banner = screen.getByRole('status');
    expect(banner.className).not.toContain('fixed');
    expect(banner.className).not.toContain('inset-x-0');
  });

  describe('auto-dismiss', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('dismisses itself after the visible window so it never lingers over gameplay', () => {
      render(<FirstGameLanguageNotice />);
      expect(dismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(7000);
      expect(dismiss).toHaveBeenCalledOnce();
    });

    it('does not fire the auto-dismiss timer after unmount', () => {
      const { unmount } = render(<FirstGameLanguageNotice />);
      unmount();
      vi.advanceTimersByTime(7000);
      expect(dismiss).not.toHaveBeenCalled();
    });
  });
});
