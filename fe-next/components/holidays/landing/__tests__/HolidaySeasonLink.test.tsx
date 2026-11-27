import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { holiday: 'hanukkah' as 'hanukkah' | 'christmas' | null, resolved: true };
const lang = { language: 'he' };
vi.mock('@/hooks/useHoliday', () => ({ useHoliday: () => state }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => lang }));

import HolidaySeasonLink from '../HolidaySeasonLink';

beforeEach(() => {
  Object.assign(state, { holiday: 'hanukkah', resolved: true });
  lang.language = 'he';
});

describe('HolidaySeasonLink', () => {
  it('Given Hanukkah active in Hebrew, Then it links to the Hebrew Hanukkah landing', () => {
    render(<HolidaySeasonLink />);
    const a = screen.getByRole('link');
    expect(a.getAttribute('href')).toBe('/he/mischakim-lechanuka');
    expect(a.textContent).toBe('משחקים לחנוכה');
  });

  it('Given Christmas active in Russian, Then it links to the New Year landing', () => {
    Object.assign(state, { holiday: 'christmas' });
    lang.language = 'ru';
    render(<HolidaySeasonLink />);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/ru/novogodnie-igry');
  });

  it('renders nothing until the holiday resolves, off-season, or when the language has no page', () => {
    for (const [holiday, resolved, language] of [
      ['hanukkah', false, 'he'],
      [null, true, 'he'],
      ['christmas', true, 'he'],
      ['hanukkah', true, 'sv'],
    ] as const) {
      Object.assign(state, { holiday, resolved });
      lang.language = language;
      const { container, unmount } = render(<HolidaySeasonLink />);
      expect(container.innerHTML).toBe('');
      unmount();
    }
  });
});
