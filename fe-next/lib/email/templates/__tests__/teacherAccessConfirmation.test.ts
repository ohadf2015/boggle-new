import { describe, it, expect } from 'vitest';
import { teacherAccessConfirmation } from '../teacherAccessConfirmation';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

describe('teacherAccessConfirmation email', () => {
  it('includes the welcome hero image', () => {
    const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en' });
    expect(html).toContain('/email/teacher-welcome.jpg');
    expect(html).toMatch(/<img[^>]+src=/i);
  });

  it('links the CTA to the locale teacher dashboard on the live domain', () => {
    const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale: 'es' });
    expect(html).toContain('https://www.lexiclash.live/es/teacher');
  });

  it('is personal: from Ohad the creator, signed Ohad, with his contact address', () => {
    const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en' });
    // The template HTML-escapes apostrophes (I&#39;m) — assert the escaped form.
    expect(html).toContain('I&#39;m Ohad, the creator of LexiClash');
    expect(html).toContain('ohadf2015@gmail.com');
    expect(html).toContain('— Ohad');
    expect(html).not.toContain('The LexiClash Team');
  });

  it('asks for feedback / feature requests and promises Ohad reads everything', () => {
    const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en' });
    expect(html).toMatch(/feedback/i);
    expect(html).toMatch(/feature request/i);
    expect(html).toMatch(/I read everything/i);
  });

  it('keeps the original email structure: what-you-can-do feature bullets', () => {
    const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en' });
    expect(html).toContain('What you can do');
    expect(html).toMatch(/classroom word games/i);
    expect(html).toMatch(/Teacher Dashboard/i);
  });

  it.each(LOCALES)('is personal and asks for feedback in %s', (locale) => {
    const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale });
    // Every locale keeps the real contact address and a personal sign-off.
    expect(html).toContain('ohadf2015@gmail.com');
    expect(html).toMatch(/Ohad|Охад|אוהד/);
  });

  it('renders an admin custom message when provided', () => {
    const { html } = teacherAccessConfirmation({
      full_name: 'Jane', locale: 'en', message: 'Welcome aboard, reach out anytime!',
    });
    expect(html).toContain('Welcome aboard, reach out anytime!');
  });

  it('omits the message block when no message is given', () => {
    const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en' });
    expect(html).not.toContain('admin-message');
  });

  it('escapes HTML in the name and the custom message (no injection)', () => {
    const { html } = teacherAccessConfirmation({
      full_name: '<script>x</script>', locale: 'en', message: '<b>hi</b> & <i>bye</i>',
    });
    expect(html).not.toContain('<script>x</script>');
    expect(html).not.toContain('<b>hi</b>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
  });

  it('preserves admin message line breaks', () => {
    const { html } = teacherAccessConfirmation({
      full_name: 'Jane', locale: 'en', message: 'line one\nline two',
    });
    expect(html).toContain('line one<br');
  });

  it.each(LOCALES)('produces a non-empty subject + body for %s', (locale) => {
    const { subject, html } = teacherAccessConfirmation({ full_name: 'Jane', locale });
    expect(subject.length).toBeGreaterThan(0);
    expect(html.length).toBeGreaterThan(0);
  });

  it('has real Russian copy for ru (no undefined COPY entry)', () => {
    const { subject, html } = teacherAccessConfirmation({ full_name: 'Иван', locale: 'ru' });
    expect(subject).toMatch(/[Ѐ-ӿ]/);
    expect(html).toContain('Иван');
    expect(html).toContain('https://www.lexiclash.live/ru/teacher');
  });

  it('keeps Hebrew RTL', () => {
    const { html } = teacherAccessConfirmation({ full_name: 'יעל', locale: 'he' });
    expect(html).toContain('dir="rtl"');
    expect(html).toMatch(/[֐-׿]/);
  });

  describe('trial window line', () => {
    const trialExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 - 60_000).toISOString();

    it('mentions the trial window in one line — no countdown/urgency block', () => {
      const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en', trialExpiresAt });
      expect(html).toMatch(/free trial runs until/i);
      expect(html).not.toContain('trial-urgency');
    });

    it.each(LOCALES)('renders the trial line for %s', (locale) => {
      const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale, trialExpiresAt });
      // The line carries a formatted date — locale-independent check: some
      // digit from the expiry date appears.
      const year = new Date(trialExpiresAt).getFullYear();
      expect(html).toContain(String(year));
      expect(html).not.toContain('trial-urgency');
    });

    it('omits the trial line when no expiry is provided (back-compat)', () => {
      const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en' });
      expect(html).not.toMatch(/free trial runs until/i);
    });

    it('omits the trial line once the trial has expired', () => {
      const expired = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en', trialExpiresAt: expired });
      expect(html).not.toMatch(/free trial runs until/i);
    });
  });

  describe('Teacher Pro line (secondary, single-trial wording)', () => {
    const inTrial = () => new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
    const KEEP: Record<string, string> = {
      en: 'Keep Teacher Pro after my trial',
      he: 'להמשיך עם פרו למורים אחרי הניסיון',
      sv: 'Behåll Teacher Pro efter min provperiod',
      ja: 'トライアル後もTeacher Proを続ける',
      es: 'Seguir con Teacher Pro después de mi prueba',
      ru: 'Сохранить Teacher Pro после пробного периода',
    };

    it.each(LOCALES)('%s: in the free access trial asks to keep Pro, with the date and $9, tracked link', (locale) => {
      const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale, trialExpiresAt: inTrial() });
      expect(html).toContain('id="teacher-pro-line"');
      expect(html).toContain(KEEP[locale]);
      expect(html).toContain('$9');
      expect(html).toContain(`https://www.lexiclash.live/api/education/email-click?c=approval_email&amp;l=${locale}`.replace('&amp;', '&'));
      expect(html).not.toMatch(/14[- ]day|14 días|14 dagars|14 дней|14日/);
    });

    it('sits under the main dashboard button, which stays the primary action', () => {
      const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en', trialExpiresAt: inTrial() });
      const main = html.indexOf('Open Teacher Dashboard');
      const pro = html.indexOf('id="teacher-pro-line"');
      expect(main).toBeGreaterThan(-1);
      expect(pro).toBeGreaterThan(main);
      expect(html).toContain('href="https://www.lexiclash.live/en/teacher"');
    });

    it('an ended trial goes straight to $9/mo; no date falls back to the 14-day trial', () => {
      const ended = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en', trialExpiresAt: new Date(Date.now() - 86400000).toISOString() }).html;
      expect(ended).toContain('Continue with Teacher Pro');
      const none = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en' }).html;
      expect(none).toContain('Start your 14-day Teacher Pro trial');
    });
  });
});
