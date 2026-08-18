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
    expect(html).toMatch(/feedback or feature request/i);
    expect(html).toMatch(/I read everything/i);
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
});
