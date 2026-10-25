import { describe, it, expect } from 'vitest';
import { teacherAbandonedCheckout } from '../teacherAbandonedCheckout';
import { abandonedCheckoutUpgradeUrl } from '@/lib/education/abandonedCheckout';

describe('teacherAbandonedCheckout', () => {
  it('asks a paid-checkout teacher to finish, linking a fresh checkout', () => {
    const { subject, html, replyTo } = teacherAbandonedCheckout({ full_name: 'Maya', locale: 'en', mode: 'paid' });
    expect(subject).toBe('Finish your Teacher Pro checkout');
    expect(html).toContain(abandonedCheckoutUpgradeUrl('en'));
    expect(html).toContain('Maya');
    expect(html).toContain('$9');
    expect(replyTo).toBe('ohadf2015@gmail.com');
  });

  it('talks about the free trial when that is what they started', () => {
    const { subject, html } = teacherAbandonedCheckout({ full_name: 'Maya', locale: 'en', mode: 'trial' });
    expect(subject).toMatch(/free Teacher Pro trial/);
    expect(html).toContain('Start my free trial');
  });

  it('renders Hebrew RTL with the Hebrew upgrade link', () => {
    const { html } = teacherAbandonedCheckout({ full_name: 'מורה', locale: 'he', mode: 'paid' });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain(abandonedCheckoutUpgradeUrl('he'));
    expect(html).not.toContain('Finish checkout');
  });

  it('has its own copy and link for every teacher locale', () => {
    const { subject, html } = teacherAbandonedCheckout({ full_name: 'Ana', locale: 'es', mode: 'paid' });
    expect(subject).toBe('Termina tu compra de Teacher Pro');
    expect(html).toContain(abandonedCheckoutUpgradeUrl('es'));
    for (const locale of ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const) {
      for (const mode of ['paid', 'trial', 'keep'] as const) {
        const out = teacherAbandonedCheckout({ full_name: 'T', locale, mode });
        expect(out.subject.length).toBeGreaterThan(0);
        expect(out.html).toContain(abandonedCheckoutUpgradeUrl(locale));
        expect(out.html).toMatch(/\$9|9\$/);
      }
      if (locale !== 'en') {
        expect(teacherAbandonedCheckout({ full_name: 'T', locale, mode: 'keep' }).subject).not.toBe(
          'Keep Teacher Pro after your free trial',
        );
      }
    }
  });

  it('inside the free access trial: keep Pro after it, never a second 14-day trial', () => {
    for (const locale of ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const) {
      const keep = teacherAbandonedCheckout({ full_name: 'T', locale, mode: 'keep' });
      const trial = teacherAbandonedCheckout({ full_name: 'T', locale, mode: 'trial' });
      expect(keep.subject).not.toBe(trial.subject);
      expect(keep.html).not.toMatch(/14[- ]?(day|dag|día|日|дн)|14 יו/);
    }
    const en = teacherAbandonedCheckout({ full_name: 'Maya', locale: 'en', mode: 'keep' });
    expect(en.subject).toBe('Keep Teacher Pro after your free trial');
    expect(en.html).toContain('$9/mo starts only when your free trial ends');
    expect(en.html).toContain('Keep Teacher Pro after my trial');
  });

  it('escapes a hostile display name', () => {
    const { html } = teacherAbandonedCheckout({ full_name: '<script>x</script>', locale: 'en', mode: 'paid' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
