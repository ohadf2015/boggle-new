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

  it('falls back to English copy for other locales but keeps their link', () => {
    const { subject, html } = teacherAbandonedCheckout({ full_name: 'Ana', locale: 'es', mode: 'paid' });
    expect(subject).toBe('Finish your Teacher Pro checkout');
    expect(html).toContain(abandonedCheckoutUpgradeUrl('es'));
  });

  it('escapes a hostile display name', () => {
    const { html } = teacherAbandonedCheckout({ full_name: '<script>x</script>', locale: 'en', mode: 'paid' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
