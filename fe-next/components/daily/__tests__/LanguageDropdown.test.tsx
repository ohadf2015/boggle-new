/**
 * Tests for LanguageDropdown — extracted from DailyReadyScreen.
 * Shows current flag + count of languages played today, opens dropdown
 * to select from the 5 supported languages.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageDropdown } from '../LanguageDropdown';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: new Proxy({}, { get: () => (props: Record<string, unknown>) => {
    const { children, ...rest } = props as { children?: React.ReactNode } & Record<string, unknown>;
    return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
  } }),
}));

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

  it('opens dropdown with all 5 language options on click', () => {
    render(<LanguageDropdown language="en" currentFlag="🇺🇸" onLanguageChange={noop} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('עברית')).toBeInTheDocument();
    expect(screen.getByText('Svenska')).toBeInTheDocument();
    expect(screen.getByText('日本語')).toBeInTheDocument();
    expect(screen.getByText('Español')).toBeInTheDocument();
  });

  it('calls onLanguageChange with selected code', () => {
    const onChange = vi.fn();
    render(<LanguageDropdown language="en" currentFlag="🇺🇸" onLanguageChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Svenska'));
    expect(onChange).toHaveBeenCalledWith('sv');
  });
});
