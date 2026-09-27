import { beforeEach, describe, expect, it, vi } from 'vitest';
import { maybeSendPaymentFailedEmail } from '@/lib/education/dunning';
import { sendEmail } from '@/lib/email/send';
import { teacherPaymentFailed } from '@/lib/email/templates/teacherPaymentFailed';
import { logSubscriptionEvent } from '@/lib/subscriptions';
import { getPolarClient } from '@/lib/polar';

const subLimitMock = vi.fn();
const accessMaybeSingleMock = vi.fn();
const createCustomerPortalUrlMock = vi.fn();

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'subscription_events') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => ({ limit: subLimitMock }),
              }),
            }),
          }),
        };
      }
      if (table === 'teacher_access_requests') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({ maybeSingle: accessMaybeSingleMock }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

vi.mock('@/lib/polar', () => ({
  getPolarClient: () => ({
    createCustomerPortalUrl: createCustomerPortalUrlMock,
  }),
}));

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/email/templates/teacherPaymentFailed', () => ({
  teacherPaymentFailed: vi.fn(() => ({ subject: 'Payment failed', html: '<p>update card</p>' })),
}));

vi.mock('@/lib/subscriptions', () => ({
  logSubscriptionEvent: vi.fn(async () => undefined),
}));

vi.mock('@/utils/logger', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

const payload = {
  type: 'subscription.past_due',
  data: {
    id: 'sub_123',
    current_period_end: '2026-10-09T00:00:00.000Z',
    customer: { email: 'teacher@school.org' },
  },
};

describe('maybeSendPaymentFailedEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subLimitMock.mockResolvedValue({ data: [] });
    accessMaybeSingleMock.mockResolvedValue({ data: null });
    createCustomerPortalUrlMock.mockResolvedValue('https://polar.sh/portal/session_123');
    vi.mocked(sendEmail).mockResolvedValue({ ok: true } as any);
  });

  it('sends the payment-failed email with teacher name, locale, portal URL, and logs the dedupe marker', async () => {
    accessMaybeSingleMock.mockResolvedValue({
      data: { full_name: 'Dana Cohen', locale: 'he' },
    });

    const result = await maybeSendPaymentFailedEmail({ payload, userId: 'u1' });

    expect(result).toEqual({ sent: true });
    expect(createCustomerPortalUrlMock).toHaveBeenCalledWith('u1');
    expect(vi.mocked(teacherPaymentFailed)).toHaveBeenCalledWith({
      full_name: 'Dana Cohen',
      locale: 'he',
      portalUrl: 'https://polar.sh/portal/session_123',
      renewalDate: '2026-10-09T00:00:00.000Z',
    });
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith({
      to: 'teacher@school.org',
      subject: 'Payment failed',
      html: '<p>update card</p>',
    });
    expect(vi.mocked(logSubscriptionEvent)).toHaveBeenCalledWith({
      userId: 'u1',
      eventType: 'teacher_payment_failed_email',
      subscriptionId: 'sub_123',
      payload: { email: 'teacher@school.org', locale: 'he' },
    });
  });

  it('dedupes repeat past_due events for the same subscription inside the 72h window', async () => {
    subLimitMock.mockResolvedValue({ data: [{ id: 'evt_1' }] });

    const result = await maybeSendPaymentFailedEmail({ payload, userId: 'u1' });

    expect(result).toEqual({ sent: false, reason: 'deduped' });
    expect(createCustomerPortalUrlMock).not.toHaveBeenCalled();
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
    expect(vi.mocked(logSubscriptionEvent)).not.toHaveBeenCalled();
  });

  it('falls back to the English dashboard link when the portal session fails, and does not log when sending fails', async () => {
    createCustomerPortalUrlMock.mockRejectedValue(new Error('polar down'));
    vi.mocked(sendEmail).mockResolvedValue({ ok: false, error: 'resend down' } as any);

    const result = await maybeSendPaymentFailedEmail({ payload, userId: 'u1' });

    expect(result).toEqual({ sent: false, reason: 'send-failed' });
    expect(vi.mocked(teacherPaymentFailed)).toHaveBeenCalledWith({
      full_name: 'teacher',
      locale: 'en',
      portalUrl: 'https://www.lexiclash.live/en/teacher',
      renewalDate: '2026-10-09T00:00:00.000Z',
    });
    expect(vi.mocked(logSubscriptionEvent)).not.toHaveBeenCalled();
  });
});
