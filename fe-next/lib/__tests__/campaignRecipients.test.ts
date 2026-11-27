import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/email', () => ({
  CAMPAIGN_SUBSCRIPTION_COLUMN: 'daily_email_subscribed',
  isUnsubscribedFromCampaigns: (p: { daily_email_subscribed?: boolean | null }) => p.daily_email_subscribed === false,
}));

import { loadCampaignRecipients } from '../campaignRecipients';

function admin(profiles: Record<string, unknown>[], authUsers: { id: string; email?: string }[], neqSpy = vi.fn()) {
  return {
    from: () => ({
      select: () => ({
        neq: (col: string, val: unknown) => {
          neqSpy(col, val);
          return Promise.resolve({ data: profiles, error: null });
        },
      }),
    }),
    auth: {
      admin: {
        listUsers: vi.fn(async ({ page, perPage }: { page: number; perPage: number }) => ({
          data: { users: authUsers.slice((page - 1) * perPage, page * perPage) },
          error: null,
        })),
      },
    },
  };
}

describe('loadCampaignRecipients', () => {
  it('given 120 auth users, it reads every page instead of the first 50', async () => {
    const users = Array.from({ length: 120 }, (_, i) => ({ id: `u${i}`, email: `u${i}@x.io` }));
    const profiles = users.map((u) => ({ id: u.id, daily_email_subscribed: true }));
    const result = await loadCampaignRecipients(admin(profiles, users) as never);
    expect(result.ok && result.recipients.length).toBe(120);
  });

  it('drops unsubscribed players and players without an email, and filters subscription in the query', async () => {
    const neq = vi.fn();
    const result = await loadCampaignRecipients(
      admin(
        [
          { id: 'a', daily_email_subscribed: true },
          { id: 'b', daily_email_subscribed: false },
          { id: 'c', daily_email_subscribed: null },
        ],
        [{ id: 'a', email: 'a@x.io' }, { id: 'b', email: 'b@x.io' }],
        neq
      ) as never
    );
    expect(neq).toHaveBeenCalledWith('daily_email_subscribed', false);
    expect(result.ok && result.recipients.map((r) => [r.id, r.email])).toEqual([['a', 'a@x.io']]);
  });

  it('leaves out QA test accounts', async () => {
    const result = await loadCampaignRecipients(
      admin(
        [{ id: 'a' }, { id: 't', is_test_account: true }],
        [{ id: 'a', email: 'a@x.io' }, { id: 't', email: 't@lexiclash.test' }]
      ) as never
    );
    expect(result.ok && result.recipients.map((r) => r.id)).toEqual(['a']);
  });

  it('given the auth listing fails, it reports an error instead of an empty audience', async () => {
    const a = admin([{ id: 'a' }], []);
    a.auth.admin.listUsers = vi.fn(async () => ({ data: { users: [] }, error: { message: 'boom' } })) as never;
    const result = await loadCampaignRecipients(a as never);
    expect(result).toEqual({ ok: false, error: 'Failed to list auth users: boom' });
  });
});
