import { describe, it, expect } from 'vitest';
import { teacherPaymentFailed } from '../teacherPaymentFailed';

describe('teacherPaymentFailed', () => {
  it('renders the card-update CTA at the portal URL', () => {
    const { subject, html } = teacherPaymentFailed({
      full_name: 'Wings Teacher',
      locale: 'en',
      portalUrl: 'https://polar.sh/portal/session_123',
      renewalDate: '2026-10-09T00:00:00Z',
    });
    expect(subject).toContain('did not go through');
    expect(html).toContain('https://polar.sh/portal/session_123');
    expect(html).toContain('Update my card');
    expect(html).toContain('Wings Teacher');
  });

  it('reassures the teacher their classroom is untouched', () => {
    const { html } = teacherPaymentFailed({
      full_name: 'T',
      locale: 'en',
      portalUrl: 'https://www.lexiclash.live/en/teacher',
      renewalDate: null,
    });
    expect(html).toContain('untouched');
  });

  it('renders Hebrew RTL with the Hebrew CTA', () => {
    const { subject, html } = teacherPaymentFailed({
      full_name: 'מורה',
      locale: 'he',
      portalUrl: 'https://polar.sh/portal/session_123',
      renewalDate: '2026-10-09T00:00:00Z',
    });
    expect(subject).toContain('לא עבר');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('לעדכן את הכרטיס');
  });

  it('escapes a hostile display name', () => {
    const { html } = teacherPaymentFailed({
      full_name: '<script>alert(1)</script>',
      locale: 'en',
      portalUrl: 'https://polar.sh/portal/x',
      renewalDate: null,
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
