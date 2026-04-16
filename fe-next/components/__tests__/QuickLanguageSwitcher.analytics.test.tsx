/**
 * QuickLanguageSwitcher — language_changed tracking
 *
 * When the user picks a new locale, we must fire `trackLanguageChanged(from,
 * to)` BEFORE `setLanguage`, so the event timestamp precedes UI locale swap
 * and the super-prop `locale` registration lands ahead of the next page
 * events.
 *
 * Radix Select's `onValueChange` doesn't fire reliably in JSDOM, so we mock
 * `@/components/ui/select` with a minimal shim that exposes the callback via
 * a test-only `<select>` element.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackLanguageChanged = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackLanguageChanged: (...a: unknown[]) => trackLanguageChanged(...a),
}));

const setLanguage = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage,
    t: (k: string) => k,
    currentFlag: '🇺🇸',
  }),
}));

vi.mock('@/components/ui/select', () => {
  const Select = ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="lang-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      <option value="en">en</option>
      <option value="he">he</option>
      <option value="sv">sv</option>
      <option value="ja">ja</option>
      <option value="es">es</option>
      {children}
    </select>
  );
  const passthrough = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return {
    Select,
    SelectContent: passthrough,
    SelectItem: passthrough,
    SelectTrigger: passthrough,
    SelectValue: passthrough,
  };
});

import { QuickLanguageSwitcher } from '../QuickLanguageSwitcher';

describe('QuickLanguageSwitcher — language_changed tracking', () => {
  beforeEach(() => {
    trackLanguageChanged.mockClear();
    setLanguage.mockClear();
  });

  it('fires trackLanguageChanged(from, to) when user picks a new locale', () => {
    render(<QuickLanguageSwitcher />);

    fireEvent.change(screen.getByTestId('lang-select'), { target: { value: 'he' } });

    expect(trackLanguageChanged).toHaveBeenCalledWith('en', 'he');
  });

  it('fires tracking BEFORE setLanguage (timestamp + super-prop ordering)', () => {
    const order: string[] = [];
    trackLanguageChanged.mockImplementation(() => order.push('track'));
    setLanguage.mockImplementation(() => order.push('set'));

    render(<QuickLanguageSwitcher />);
    fireEvent.change(screen.getByTestId('lang-select'), { target: { value: 'ja' } });

    expect(order).toEqual(['track', 'set']);
  });

  it('still calls setLanguage after tracking', () => {
    render(<QuickLanguageSwitcher />);

    fireEvent.change(screen.getByTestId('lang-select'), { target: { value: 'sv' } });

    expect(setLanguage).toHaveBeenCalledWith('sv');
  });
});
