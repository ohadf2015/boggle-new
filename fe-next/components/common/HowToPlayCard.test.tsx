import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he', setLanguage: vi.fn() }),
}));

import { HowToPlayCard } from './HowToPlayCard';

const props = {
  storageKey: 'unit-test-game',
  title: 'איך משחקים',
  steps: ['שלב ראשון', 'שלב שני', 'שלב שלישי'],
  cta: 'הבנתי',
};

beforeEach(() => window.localStorage.clear());

describe('HowToPlayCard', () => {
  it('shows title, all steps and CTA on first run', () => {
    render(<HowToPlayCard {...props} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('איך משחקים')).toBeTruthy();
    props.steps.forEach((s) => expect(screen.getByText(s)).toBeTruthy());
    expect(screen.getByText('הבנתי')).toBeTruthy();
  });

  it('lays out RTL for Hebrew', () => {
    render(<HowToPlayCard {...props} />);
    expect(screen.getByRole('dialog').getAttribute('dir')).toBe('rtl');
  });

  it('dismisses and persists when CTA clicked', () => {
    render(<HowToPlayCard {...props} />);
    fireEvent.click(screen.getByText('הבנתי'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.localStorage.getItem('lexi-howto-seen-unit-test-game')).toBe('1');
  });

  it('does not show again once dismissed', () => {
    window.localStorage.setItem('lexi-howto-seen-unit-test-game', '1');
    render(<HowToPlayCard {...props} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
