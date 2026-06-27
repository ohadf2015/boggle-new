import { describe, it, expect } from 'vitest';
import { teacherAccessConfirmation } from '../teacherAccessConfirmation';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;

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

  it('explains what teacher mode offers', () => {
    const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en' });
    // mentions at least one concrete teacher capability
    expect(html.toLowerCase()).toMatch(/classroom|class|student|dashboard/);
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

  describe('trial urgency', () => {
    // ~13.something days out → the email should show the rounded-up day count.
    const trialExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 - 60_000).toISOString();

    it('renders a trial countdown block with the remaining day count', () => {
      const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en', trialExpiresAt });
      expect(html).toContain('trial-urgency');
      expect(html).toMatch(/14\s*day/i);
    });

    it('puts the trial framing in the subject line', () => {
      const { subject } = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en', trialExpiresAt });
      expect(subject.toLowerCase()).toContain('trial');
    });

    it.each(LOCALES)('renders the trial block for %s', (locale) => {
      const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale, trialExpiresAt });
      expect(html).toContain('trial-urgency');
    });

    it('omits the trial block when no expiry is provided (back-compat)', () => {
      const { html } = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en' });
      expect(html).not.toContain('trial-urgency');
    });
  });
});
