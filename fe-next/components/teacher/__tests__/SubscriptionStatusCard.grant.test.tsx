import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubscriptionStatusCard from '../SubscriptionStatusCard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string>) => (p ? `${k}:${Object.values(p).join(',')}` : k), language: 'en' }),
}));

describe('SubscriptionStatusCard — complimentary grant', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('says the plan is gifted, until when, with no billing portal and no upgrade button', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        has_pro: true, tier: 'pro', status: 'active', source: 'admin_grant', portal_url: null,
        current_period_end: '2027-09-05T12:00:00Z', cancel_at_period_end: false,
        grant: { id: 'g1', expires_at: '2027-09-05T12:00:00Z', days: 365, note: null, welcomed: true },
      }),
    }) as unknown as typeof fetch;
    render(<SubscriptionStatusCard />);
    await waitFor(() => expect(screen.getByText('teacher.subscription.proPlanName')).toBeInTheDocument());
    expect(screen.getByText('teacher.subscription.giftedBadge')).toBeInTheDocument();
    expect(screen.getByText('teacher.subscription.giftedUntil')).toBeInTheDocument();
    expect(screen.getByText('teacher.subscription.giftedNoCard')).toBeInTheDocument();
    expect(screen.queryByText('teacher.subscription.renewsOn')).not.toBeInTheDocument();
    expect(screen.queryByText('teacher.subscription.manageSubscription')).not.toBeInTheDocument();
    expect(screen.queryByText('teacher.subscription.upgradeNow')).not.toBeInTheDocument();
  });
});
