import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: h.send };
  },
}));

vi.mock('@/backend/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import {
  generateHolidayGreetingHtml,
  holidayCtaUrl,
  sendHolidayGreetingToRecipient,
  holidayForProfile,
  holidayEmailLanguage,
  planHolidayGreeting,
} from '../holidayGreetingEmail';
import { HOLIDAY_EMAIL_LANGUAGES } from '@/lib/email/templates/holidayGreeting.copy';

const UNSUB = 'https://www.lexiclash.live/api/email/unsubscribe?token=abc';
const HOLIDAYS = ['hanukkah', 'christmas'] as const;

describe('holiday greeting email', () => {
  beforeEach(() => {
    h.send.mockReset().mockResolvedValue({ data: { id: '1' }, error: null });
    vi.stubEnv('RESEND_API_KEY', 'k');
    vi.stubEnv('RESEND_FROM_EMAIL', 'hi@lexiclash.live');
  });

  for (const holiday of HOLIDAYS) {
    for (const language of HOLIDAY_EMAIL_LANGUAGES) {
      it(`given ${holiday}/${language}, it renders the hero, the tracked CTA, the unsubscribe link and direction`, async () => {
        const { subject, html } = await generateHolidayGreetingHtml({
          holiday,
          language,
          recipientName: 'Dana',
          unsubscribeUrl: UNSUB,
        });
        expect(subject).toContain('Dana');
        expect(html).toContain(`https://www.lexiclash.live/holidays/email-${holiday}.png`);
        expect(html).toContain(
          `https://www.lexiclash.live/${language}?utm_source=email&amp;utm_campaign=holiday-${holiday}-2026`
        );
        expect(html).toContain(UNSUB);
        expect(html).toMatch(new RegExp(`<html[^>]+dir="${language === 'he' ? 'rtl' : 'ltr'}"`));
        expect(html).toMatch(new RegExp(`lang="${language}"`));
      });
    }
  }

  it('escapes the recipient name', async () => {
    const { html } = await generateHolidayGreetingHtml({
      holiday: 'hanukkah',
      language: 'en',
      recipientName: '<script>x</script>',
      unsubscribeUrl: UNSUB,
    });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('falls back to English for an unknown language', () => {
    expect(holidayCtaUrl('de', 'christmas')).toBe(
      'https://www.lexiclash.live/en?utm_source=email&utm_campaign=holiday-christmas-2026'
    );
  });

  it('given a real send, it sets List-Unsubscribe headers and no [TEST] prefix', async () => {
    const result = await sendHolidayGreetingToRecipient({
      email: 'p@example.com',
      recipientName: 'P',
      language: 'he',
      holiday: 'hanukkah',
      unsubscribeUrl: UNSUB,
    });
    expect(result.success).toBe(true);
    const payload = h.send.mock.calls[0][0];
    expect(payload.subject).not.toContain('[TEST]');
    expect(payload.headers['List-Unsubscribe']).toBe(`<${UNSUB}>`);
    expect(payload.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  it('given Resend returns an error, it reports failure', async () => {
    h.send.mockResolvedValue({ data: null, error: { message: 'rate limited' } });
    const result = await sendHolidayGreetingToRecipient({
      email: 'p@example.com',
      recipientName: 'P',
      language: 'en',
      holiday: 'christmas',
      unsubscribeUrl: UNSUB,
    });
    expect(result).toEqual({ success: false, error: 'rate limited' });
  });
});

describe('holidayForProfile', () => {
  it.each([
    [{ country_code: 'IL' }, 'hanukkah'],
    [{ country_code: 'US', language: 'he' }, 'christmas'],
    [{ timezone: 'Asia/Jerusalem' }, 'hanukkah'],
    [{ language: 'he' }, 'hanukkah'],
    [{ country_code: 'SE' }, 'christmas'],
    [{}, 'christmas'],
  ])('given %o, the default holiday is %s', (profile, expected) => {
    expect(holidayForProfile(profile)).toBe(expected);
  });

  it('picks the email language from the profile, then the country, then English', () => {
    expect(holidayEmailLanguage({ language: 'ja' })).toBe('ja');
    expect(holidayEmailLanguage({ country_code: 'RU' })).toBe('ru');
    expect(holidayEmailLanguage({ country_code: 'MX' })).toBe('es');
    expect(holidayEmailLanguage({ language: 'de' })).toBe('en');
  });
});

describe('planHolidayGreeting', () => {
  const people = [
    { id: 'il', country_code: 'IL', language: 'he' },
    { id: 'us', country_code: 'US', language: 'en' },
    { id: 'jp', country_code: 'JP', language: 'ja' },
  ];

  it('counts recipients per holiday and language, Israelis included under Hanukkah only', () => {
    const { plan, counts } = planHolidayGreeting(people);
    expect(counts).toEqual({ hanukkah: { he: 1 }, christmas: { en: 1, ja: 1 } });
    expect(plan.find((p) => p.recipient.id === 'il')?.holiday).toBe('hanukkah');
  });

  it('given a holiday filter, keeps only recipients whose default is that holiday', () => {
    expect(planHolidayGreeting(people, 'christmas').plan.map((p) => p.recipient.id)).toEqual(['us', 'jp']);
  });
});
