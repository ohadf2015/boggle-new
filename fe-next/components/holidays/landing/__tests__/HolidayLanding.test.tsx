import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { landingFor } from '@/lib/holidays/landing';
import HolidayLanding from '../HolidayLanding';

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);
const hrefs = (el: HTMLElement) => [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'));

describe('HolidayLanding', () => {
  it('Given Hanukkah night 3, When the he page renders, Then it is RTL, live, and the CTA switches the theme on', () => {
    const { container } = render(<HolidayLanding page={landingFor('hanukkah', 'he')!} now={at('2026-12-06')} />);
    expect(container.querySelector('main')?.getAttribute('dir')).toBe('rtl');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('משחקים לחנוכה: שמונה לילות של משחק מילים');
    expect(screen.getByTestId('holiday-landing-status').textContent).toContain('12 בדצמבר 2026');
    expect(screen.getByTestId('holiday-landing-cta').getAttribute('href')).toBe('/he?holiday=hanukkah');
    expect(screen.getByRole('link', { name: 'לאתגר היומי' }).getAttribute('href')).toBe('/he/daily?holiday=hanukkah');
    const arcade = screen.getByTestId('holiday-landing-arcade');
    expect(hrefs(arcade)).toEqual(['oil', 'dreidel', 'sufganiyah'].map((g) => `/he/holiday-arcade?g=${g}&holiday=hanukkah`));
  });

  it('Given July 2027, When the en Hanukkah page renders, Then it shows the next start date and links to the regular game', () => {
    const { container } = render(<HolidayLanding page={landingFor('hanukkah', 'en')!} now={at('2027-07-01')} />);
    expect(container.querySelector('main')?.getAttribute('dir')).toBe('ltr');
    expect(screen.getByTestId('holiday-landing-status').textContent).toContain('December 24, 2027');
    expect(screen.getByTestId('holiday-landing-cta').getAttribute('href')).toBe('/en/multiplayer');
    const arcade = screen.getByTestId('holiday-landing-arcade');
    expect(arcade.querySelectorAll('a')).toHaveLength(0);
    expect(within(arcade).getByText('The arcade opens with the holiday.')).toBeTruthy();
    expect(container.innerHTML).not.toContain('holiday-arcade');
  });

  it('Given 2029 with no calendar data, When rendering, Then it still renders with the generic comeback line', () => {
    render(<HolidayLanding page={landingFor('hanukkah', 'en')!} now={at('2029-03-01')} />);
    expect(screen.getByTestId('holiday-landing-status').textContent).toBe(
      'The event comes back next Hanukkah. The regular game is open all year in the meantime.',
    );
  });

  it('Given late November, When the ru page renders, Then the FAQ and Event JSON-LD carry the Jan 7 end', () => {
    const { container } = render(<HolidayLanding page={landingFor('christmas', 'ru')!} now={at('2026-11-27')} />);
    const ld = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.textContent!);
    const ev = ld['@graph'].find((n: { '@type': string }) => n['@type'] === 'Event');
    expect(ev.endDate).toBe('2027-01-07');
    const faq = ld['@graph'].find((n: { '@type': string }) => n['@type'] === 'FAQPage');
    const when = faq.mainEntity.find((q: { name: string }) => q.name === 'Когда проходит событие?');
    expect(when.acceptedAnswer.text).toContain('7 января 2027');
    expect(screen.getByText('Когда проходит событие?')).toBeTruthy();
  });

  it('renders the hero art, the locale mascot and every feature art for each page', () => {
    for (const [holiday, locale, mascot] of [
      ['christmas', 'sv', 'm-lucia'],
      ['christmas', 'ru', 'm-dedmoroz'],
      ['christmas', 'es', 'm-christmas'],
    ] as const) {
      const { container, unmount } = render(<HolidayLanding page={landingFor(holiday, locale)!} now={at('2026-12-20')} />);
      const srcs = [...container.querySelectorAll('img')].map((i) => decodeURIComponent(i.getAttribute('src') ?? ''));
      expect(srcs.some((s) => s.includes('/holidays/hero-christmas.webp'))).toBe(true);
      expect(srcs.some((s) => s.includes(`/holidays/${mascot}.webp`))).toBe(true);
      expect(srcs.filter((s) => s.includes('/holidays/arcade-')).length).toBe(3);
      unmount();
    }
  });
});
