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

  it.each([
    ['en', en, 'LexiClash'],
    ['he', he, 'לקסיקלאש'],
  ])('given %s, then the wordmark is plain text with no letter tiles or bolt', (lang, d, word) => {
    language = lang;
    dict = d;
    const { container } = render(<HeaderLogo />);
    const mark = screen.getByTestId('logo-wordmark');
    expect(mark.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(mark.textContent).toBe(word);
    expect(mark.children).toHaveLength(1);
    expect(screen.queryByTestId('logo-tiles')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('given a click outside a room, then it goes home in the current language', () => {
    language = 'he';
    dict = he;
    render(<HeaderLogo />);
    screen.getByRole('button').click();
    expect(push).toHaveBeenCalledWith('/he');
  });
});
