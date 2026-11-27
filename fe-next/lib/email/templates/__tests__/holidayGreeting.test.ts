import { describe, expect, it } from 'vitest';
import { holidayGreeting } from '../holidayGreeting';
import { HOLIDAY_EMAIL_LANGUAGES } from '../holidayGreeting.copy';

const UNSUB = 'https://www.lexiclash.live/api/email/unsubscribe?token=abc';
const HOLIDAYS = ['hanukkah', 'christmas'] as const;
const render = (o: Partial<Parameters<typeof holidayGreeting>[0]> = {}) =>
  holidayGreeting({ holiday: 'hanukkah', language: 'en', recipientName: 'Dana', unsubscribeUrl: UNSUB, ...o });

describe('holidayGreeting on the neo layout', () => {
  it.each(HOLIDAYS.flatMap((h) => HOLIDAY_EMAIL_LANGUAGES.map((l) => [h, l] as const)))(
    '%s/%s has the neo card, holiday hero, tracked CTA, privacy and unsubscribe',
    (holiday, language) => {
      const { subject, html } = render({ holiday, language });
      expect(subject).toContain('Dana');
      expect(html).toContain('class="neo-h1"');
      expect(html).toMatch(/border-(right|left)-width:6px/);
      expect(html).toContain(`src="https://www.lexiclash.live/holidays/email-${holiday}.png"`);
      expect(html).toContain(`href="https://www.lexiclash.live/${language}?utm_source=email&amp;utm_campaign=holiday-${holiday}-2026"`);
      expect(html).toContain(`href="${UNSUB}"`);
      expect(html).toContain(`href="https://www.lexiclash.live/${language}/privacy"`);
      expect(html).toMatch(new RegExp(`<html dir="${language === 'he' ? 'rtl' : 'ltr'}" lang="${language}"`));
      expect(html).not.toMatch(/undefined|\[object|NaN/);
    },
  );

  it('gives each holiday its own accent', () => {
    expect(render({ holiday: 'hanukkah' }).html).toContain('#00E5FF');
    expect(render({ holiday: 'christmas' }).html).toContain('#FF5FB0');
  });

  it('escapes the recipient name', () => {
    const { html } = render({ recipientName: '<script>x</script>' });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('isolates a Latin name inside Hebrew text', () => {
    expect(render({ language: 'he', recipientName: 'Fish' }).html).toContain('⁨Fish⁩');
  });

  it('falls back to English for an unknown language', () => {
    const { html } = render({ language: 'de' });
    expect(html).toContain('lang="en"');
    expect(html).toContain('Happy Hanukkah!');
  });
});
