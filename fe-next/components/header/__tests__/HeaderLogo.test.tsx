import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { en } from '@/translations/en';
import { he } from '@/translations/he';

const push = vi.fn();
let dict: Record<string, unknown> = en;
let language = 'en';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language,
    t: (k: string) => k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)?.[p], dict) ?? k,
  }),
}));

import HeaderLogo from '../HeaderLogo';

describe('HeaderLogo', () => {
  beforeEach(() => {
    dict = en;
    language = 'en';
  });

  it.each([
    ['en', en],
    ['he', he],
  ])('given %s, then the logo button is named LexiClash', (lang, d) => {
    language = lang;
    dict = d;
    render(<HeaderLogo />);
    expect(screen.getByRole('button', { name: /LexiClash/ })).toBeTruthy();
  });

  it('draws "Lexi" as one game tile per letter, hidden from screen readers', () => {
    render(<HeaderLogo />);
    const tiles = screen.getByTestId('logo-tiles');
    expect(tiles.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(Array.from(tiles.children).map((c) => c.textContent)).toEqual(['L', 'e', 'x', 'i']);
  });

  it('given Hebrew, then tiles follow the localized brand letters', () => {
    language = 'he';
    dict = he;
    render(<HeaderLogo />);
    expect(Array.from(screen.getByTestId('logo-tiles').children).map((c) => c.textContent).join('')).toBe('לקסי');
  });
});
