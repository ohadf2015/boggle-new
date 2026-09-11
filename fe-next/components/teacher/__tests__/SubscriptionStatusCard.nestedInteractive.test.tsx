import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubscriptionStatusCard from '../SubscriptionStatusCard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string>) => (p ? `${k}:${Object.values(p).join(',')}` : k), language: 'en' }),
}));

/**
 * Category-5 bug: `<Link className="contents"><Button>...</Button></Link>`
 * renders an `<a>` wrapping a `<button>` — invalid HTML (interactive content
 * inside interactive content) and a duplicate/confusing keyboard tab stop.
 * The upgrade CTA, the billing-portal link, and the refund-policy link all
 * used this shape. The fix merges them into one element via `Button asChild`.
 */
describe('SubscriptionStatusCard — no nested interactive elements', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('free plan: the upgrade link is a single anchor, not an anchor wrapping a button', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        has_pro: false, tier: 'free', status: 'active', portal_url: null,
        current_period_end: null, cancel_at_period_end: false, grant: null,
      }),
    }) as unknown as typeof fetch;
    render(<SubscriptionStatusCard />);
    const upgradeLink = await waitFor(() => screen.getByRole('link', { name: /upgradeNow/ }));
    expect(upgradeLink.querySelector('button')).toBeNull();

    const refundLink = screen.getByRole('link', { name: /refundPolicy/ });
    expect(refundLink.querySelector('button')).toBeNull();
  });

  it('pro plan with a portal: the manage-subscription link is a single anchor', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        has_pro: true, tier: 'pro', status: 'active', portal_url: 'https://portal.example.com',
        current_period_end: '2027-01-01T00:00:00Z', cancel_at_period_end: false, grant: null,
      }),
    }) as unknown as typeof fetch;
    render(<SubscriptionStatusCard />);
    const manageLink = await waitFor(() => screen.getByRole('link', { name: /manageSubscription/ }));
    expect(manageLink.querySelector('button')).toBeNull();
  });
});
