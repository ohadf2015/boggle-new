import { describe, expect, it } from 'vitest';
import { billingPortalEmailUrl, billingPortalPath, canUseBillingPortal } from '../billingPortal';

describe('billingPortal', () => {
  it('builds a stable link with a validated locale', () => {
    expect(billingPortalPath('he')).toBe('/api/subscription/portal?locale=he');
    expect(billingPortalPath('xx')).toBe('/api/subscription/portal?locale=en');
    expect(billingPortalEmailUrl('ru')).toBe('https://www.lexiclash.live/api/subscription/portal?locale=ru');
  });

  it('past_due keeps the portal after the grace ends; grants and free teachers do not get one', () => {
    expect(canUseBillingPortal({ has_pro: false, status: 'past_due', source: 'polar' })).toBe(true);
    expect(canUseBillingPortal({ has_pro: true, status: 'active', source: 'polar' })).toBe(true);
    expect(canUseBillingPortal({ has_pro: true, status: 'active', source: 'admin_grant' })).toBe(false);
    expect(canUseBillingPortal({ has_pro: false, status: 'canceled', source: 'polar' })).toBe(false);
  });
});
