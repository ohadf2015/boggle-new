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
    expect(html).toContain('Hi Wings,');
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

describe('teacherPaymentFailed neo layout', () => {
  it.each(['en', 'he'] as const)('%s stays calm: card-oops art, hard-shadow button, no em-dashes', (locale) => {
    const { subject, html } = teacherPaymentFailed({ full_name: 'T', locale, portalUrl: 'https://polar.sh/portal/x?a=1&b=2', renewalDate: '2026-10-09T00:00:00Z' });
    expect(html).toContain('/email/art/card-oops.png');
    expect(html).toMatch(/border-(right|left)-width:6px/);
    expect(html).not.toMatch(/undefined|\[object|NaN/);
    expect(`${subject}${html}`).not.toContain('—');
    expect(html).toContain('https://polar.sh/portal/x?a=1&amp;b=2');
    expect(html).toMatch(/\$9|9\$/);
  });
});
