/**
 * Tests for LanguageDropdown — extracted from DailyReadyScreen.
 * Shows current flag + count of languages played today, opens dropdown
 * to select from the 5 supported languages.
 *
 * Exercises the real (unmocked) Radix DropdownMenu primitive, same pattern
 * as AuthButtonMenu.a11y.test.tsx — Radix opens on pointerdown, not a bare
 * `click` event, so interactions go through `userEvent`.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageDropdown } from '../LanguageDropdown';

vi.mock('@/utils/dailyChallenge', () => ({
  hasPlayedWordHuntToday: (lang: string) => lang === 'en' || lang === 'he',
}));

describe('LanguageDropdown', () => {
  const noop = () => {};

  it('renders current flag button', () => {
    render(<LanguageDropdown language="en" currentFlag="🇺🇸" onLanguageChange={noop} />);
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
  });

  it('shows completed-today badge when at least one language played', () => {
    render(<LanguageDropdown language="en" currentFlag="🇺🇸" onLanguageChange={noop} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('opens dropdown with all 5 language options on click', async () => {
    const user = userEvent.setup();
    render(<LanguageDropdown language="en" currentFlag="🇺🇸" onLanguageChange={noop} />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument());
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('עברית')).toBeInTheDocument();
    expect(screen.getByText('Svenska')).toBeInTheDocument();
    expect(screen.getByText('日本語')).toBeInTheDocument();
    expect(screen.getByText('Español')).toBeInTheDocument();
  });

  it('calls onLanguageChange with selected code', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LanguageDropdown language="en" currentFlag="🇺🇸" onLanguageChange={onChange} />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument());
    await user.click(screen.getByText('Svenska'));
    expect(onChange).toHaveBeenCalledWith('sv');
  });
});
