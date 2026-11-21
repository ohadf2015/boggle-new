import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackLanguageChanged = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackLanguageChanged: (...a: unknown[]) => trackLanguageChanged(...a),
}));

const capture = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => capture(...a) } }));

const assign = vi.fn();
vi.mock('@/lib/navigation/assignLocation', () => ({ assignLocation: (u: string) => assign(u) }));

const setLanguage = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'he', setLanguage, t: (k: string) => k, currentFlag: '🇮🇱' }),
}));

vi.mock('@/components/ui/select', () => {
  const Select = ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => (
    <select data-testid="lang-select" value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="he">he</option>
      <option value="ar-soon">ar-soon</option>
      {children}
    </select>
  );
  const passthrough = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return { Select, SelectContent: passthrough, SelectItem: passthrough, SelectTrigger: passthrough, SelectValue: passthrough };
});

import { QuickLanguageSwitcher } from '../QuickLanguageSwitcher';

describe('QuickLanguageSwitcher — Arabic coming-soon entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists Arabic as coming soon, in Arabic', () => {
    render(<QuickLanguageSwitcher />);
    expect(screen.getByText(/العربية/)).toBeInTheDocument();
  });

  it('opens the Arabic waitlist page and records the click without switching language', () => {
    render(<QuickLanguageSwitcher />);
    fireEvent.change(screen.getByTestId('lang-select'), { target: { value: 'ar-soon' } });

    expect(assign).toHaveBeenCalledWith('/en/laabat-kalimat-arabiya');
    expect(capture).toHaveBeenCalledWith('waitlist_entry_clicked', { language: 'ar', from: 'he', surface: 'language_switcher' });
    expect(setLanguage).not.toHaveBeenCalled();
    expect(trackLanguageChanged).not.toHaveBeenCalled();
  });
});
