import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  maybeSendPaymentFailedEmail,
  pickDunningStep,
  processDunningForPastDueSubs,
  sendDunningEmail,
  EVENT_DAY1,
  EVENT_DAY5,
} from '@/lib/education/dunning';
import { sendEmail } from '@/lib/email/send';
import { teacherPaymentFailed } from '@/lib/email/templates/teacherPaymentFailed';
import { teacherPaymentFailedDay5 } from '@/lib/email/templates/teacherPaymentFailedDay5';
import { logSubscriptionEvent } from '@/lib/subscriptions';
import { captureProFunnelServerEvent } from '@/lib/education/proFunnelServer';
import { getPolarClient } from '@/lib/polar';

const subEventsMock = vi.fn();
const accessMaybeSingleMock = vi.fn();
const subscriptionsMock = vi.fn();
const createCustomerPortalUrlMock = vi.fn();

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'subscription_events') {
        return {
          select: () => ({
            eq: () => ({
              in: subEventsMock,
              gte: () => ({ limit: subEventsMock }),
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
      if (table === 'subscriptions') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({ maybeSingle: subscriptionsMock }),
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

vi.mock('@/lib/email/templates/teacherPaymentFailedDay5', () => ({
  teacherPaymentFailedDay5: vi.fn(() => ({ subject: 'Urgent: Teacher Pro access pauses in 2 days', html: '<p>day 5 escalation</p>' })),
}));

vi.mock('@/lib/subscriptions', () => ({
  logSubscriptionEvent: vi.fn(async () => undefined),
}));

vi.mock('@/lib/education/proFunnelServer', () => ({
  buildDunningEmailSentEvent: vi.fn((userId: string, day: number, subscriptionId?: string) => ({
    distinctId: userId,
    event: 'dunning_email_sent',
    properties: { day, subscription_id: subscriptionId, teacher_id: userId },
  })),
  captureProFunnelServerEvent: vi.fn(),
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
    current_period_start: '2026-10-09T00:00:00.000Z',
    current_period_end: '2026-11-09T00:00:00.000Z',
    modified_at: '2026-10-09T00:05:00.000Z',
    created_at: '2026-09-09T00:00:00.000Z',
    customer: { email: 'teacher@school.org' },
  },
};

describe('pickDunningStep pure function', () => {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const onset = 1000000000;

  it('returns day-1 on days 0-4 when day-1 has not been sent', () => {
    expect(
      pickDunningStep({
        status: 'past_due',
        pastDueOnsetMs: onset,
        nowMs: onset + 0.5 * ONE_DAY,
        alreadySent: [],
      }),
    ).toBe('day-1');

    expect(
      pickDunningStep({
        status: 'past_due',
        pastDueOnsetMs: onset,
        nowMs: onset + 3 * ONE_DAY,
        alreadySent: [],
      }),
    ).toBe('day-1');
  });

  it('returns null on days 0-4 when day-1 was already sent (deduped)', () => {
    expect(
      pickDunningStep({
        status: 'past_due',
        pastDueOnsetMs: onset,
        nowMs: onset + 1 * ONE_DAY,
        alreadySent: [EVENT_DAY1],
      }),
    ).toBeNull();
  });

  it('returns day-5 on or after day 5 when day-5 has not been sent', () => {
    expect(
      pickDunningStep({
        status: 'past_due',
        pastDueOnsetMs: onset,
        nowMs: onset + 5 * ONE_DAY,
        alreadySent: [EVENT_DAY1],
      }),
    ).toBe('day-5');

    expect(
      pickDunningStep({
        status: 'past_due',
        pastDueOnsetMs: onset,
        nowMs: onset + 6 * ONE_DAY,
        alreadySent: [],
      }),
    ).toBe('day-5');
  });

  it('returns null when day-5 was already sent', () => {
    expect(
      pickDunningStep({
        status: 'past_due',
        pastDueOnsetMs: onset,
        nowMs: onset + 5.5 * ONE_DAY,
        alreadySent: [EVENT_DAY1, EVENT_DAY5],
      }),
    ).toBeNull();
  });

  it('returns null for non-past_due status', () => {
    expect(
      pickDunningStep({
        status: 'active',
        pastDueOnsetMs: onset,
        nowMs: onset + 5 * ONE_DAY,
        alreadySent: [],
      }),
    ).toBeNull();
  });
});

describe('sendDunningEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendEmail).mockResolvedValue({ ok: true } as any);
  });

  it('verifiably fires day-1 dunning email, writes subscription_events, and emits PostHog event', async () => {
    const res = await sendDunningEmail({
      subscriptionId: 'sub_123',
      userId: 'u1',
      email: 'teacher@school.org',
      fullName: 'Dana Cohen',
      locale: 'he',
      step: 'day-1',
      renewalDate: '2026-11-09T00:00:00.000Z',
    });

    expect(res).toEqual({ sent: true });
    expect(teacherPaymentFailed).toHaveBeenCalledWith({
      full_name: 'Dana Cohen',
      locale: 'he',
      portalUrl: 'https://www.lexiclash.live/api/subscription/portal?locale=he',
      renewalDate: '2026-11-09T00:00:00.000Z',
    });
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'teacher@school.org',
      subject: 'Payment failed',
      html: '<p>update card</p>',
    });
    expect(logSubscriptionEvent).toHaveBeenCalledWith({
      userId: 'u1',
      eventType: EVENT_DAY1,
      subscriptionId: 'sub_123',
      payload: { email: 'teacher@school.org', locale: 'he', step: 'day-1', day: 1 },
    });
    expect(captureProFunnelServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'dunning_email_sent',
        properties: expect.objectContaining({ day: 1 }),
      }),
    );
  });

  it('verifiably fires day-5 escalation email with one-click portal link, writes subscription_events, and emits PostHog event', async () => {
    const res = await sendDunningEmail({
      subscriptionId: 'sub_123',
      userId: 'u1',
      email: 'teacher@school.org',
      fullName: 'Dana Cohen',
      locale: 'en',
      step: 'day-5',
    });

    expect(res).toEqual({ sent: true });
    expect(teacherPaymentFailedDay5).toHaveBeenCalledWith({
      full_name: 'Dana Cohen',
      locale: 'en',
      portalUrl: 'https://www.lexiclash.live/api/subscription/portal?locale=en',
    });
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'teacher@school.org',
      subject: 'Urgent: Teacher Pro access pauses in 2 days',
      html: '<p>day 5 escalation</p>',
    });
    expect(logSubscriptionEvent).toHaveBeenCalledWith({
      userId: 'u1',
      eventType: EVENT_DAY5,
      subscriptionId: 'sub_123',
      payload: { email: 'teacher@school.org', locale: 'en', step: 'day-5', day: 5 },
    });
    expect(captureProFunnelServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'dunning_email_sent',
        properties: expect.objectContaining({ day: 5 }),
      }),
    );
  });
});

describe('maybeSendPaymentFailedEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subEventsMock.mockResolvedValue({ data: [] });
    accessMaybeSingleMock.mockResolvedValue({ data: null });
    subscriptionsMock.mockResolvedValue({ data: null });
    createCustomerPortalUrlMock.mockResolvedValue('https://polar.sh/portal/session_123');
    vi.mocked(sendEmail).mockResolvedValue({ ok: true } as any);
  });

  it('sends the payment-failed email with teacher name, locale, portal URL, and logs the dedupe marker', async () => {
    accessMaybeSingleMock.mockResolvedValue({
      data: { full_name: 'Dana Cohen', locale: 'he' },
    });

    const result = await maybeSendPaymentFailedEmail({ payload, userId: 'u1' });

    expect(result).toEqual({ sent: true });
    expect(createCustomerPortalUrlMock).not.toHaveBeenCalled();
    expect(vi.mocked(teacherPaymentFailed)).toHaveBeenCalledWith({
      full_name: 'Dana Cohen',
      locale: 'he',
      portalUrl: 'https://www.lexiclash.live/api/subscription/portal?locale=he',
      renewalDate: '2026-10-09T00:05:00.000Z',
    });
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith({
      to: 'teacher@school.org',
      subject: 'Payment failed',
      html: '<p>update card</p>',
    });
    expect(vi.mocked(logSubscriptionEvent)).toHaveBeenCalledWith({
      userId: 'u1',
      eventType: EVENT_DAY1,
      subscriptionId: 'sub_123',
      payload: { email: 'teacher@school.org', locale: 'he', step: 'day-1', day: 1 },
    });
    expect(captureProFunnelServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'dunning_email_sent',
        properties: expect.objectContaining({ day: 1 }),
      }),
    );
  });

  it('recovers email from teacher_access_requests by userId if customer.email is missing in webhook payload', async () => {
    accessMaybeSingleMock.mockResolvedValue({
      data: { email: 'recovered@school.org', full_name: 'Sarah Levy', locale: 'he' },
    });

    const payloadWithoutEmail = {
      type: 'subscription.past_due',
      data: {
        id: 'sub_456',
        current_period_end: '2026-11-09T00:00:00.000Z',
        customer: {},
      },
    };

    const result = await maybeSendPaymentFailedEmail({ payload: payloadWithoutEmail, userId: 'u2' });

    expect(result).toEqual({ sent: true });
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'recovered@school.org',
      subject: 'Payment failed',
      html: '<p>update card</p>',
    });
  });

  it('dedupes repeat past_due events for the same subscription inside the window', async () => {
    subEventsMock.mockResolvedValue({ data: [{ event_type: EVENT_DAY1 }] });

    const result = await maybeSendPaymentFailedEmail({ payload, userId: 'u1' });

    expect(result).toEqual({ sent: false, reason: 'deduped' });
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
    expect(vi.mocked(logSubscriptionEvent)).not.toHaveBeenCalled();
  });

  it('sends day-5 escalation when forced or elapsed >= 5 days', async () => {
    subEventsMock.mockResolvedValue({ data: [{ event_type: EVENT_DAY1 }] });

    const result = await maybeSendPaymentFailedEmail({ payload, userId: 'u1', forceStep: 'day-5' });

    expect(result).toEqual({ sent: true });
    expect(teacherPaymentFailedDay5).toHaveBeenCalledWith(
      expect.objectContaining({
        portalUrl: expect.stringContaining('/api/subscription/portal'),
      }),
    );
    expect(logSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: EVENT_DAY5 }),
    );
    expect(captureProFunnelServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'dunning_email_sent',
        properties: expect.objectContaining({ day: 5 }),
      }),
    );
  });
});

describe('processDunningForPastDueSubs cron sweep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subEventsMock.mockResolvedValue({ data: [] });
    accessMaybeSingleMock.mockResolvedValue({ data: { full_name: 'Teacher', locale: 'en' } });
    subscriptionsMock.mockResolvedValue({ data: { user_id: 'u-1', provider_event_at: '2026-11-09T00:00:00.000Z' } });
    vi.mocked(sendEmail).mockResolvedValue({ ok: true } as any);
  });

  it('dry run plans day-5 enqueue for a sub past_due for 5+ days without sending', async () => {
    const subs = [
      {
        id: 'sub_past_due_5',
        status: 'past_due',
        cancelAtPeriodEnd: false,
        email: 'teacher@school.org',
        amount: 900,
        currency: 'usd',
        currentPeriodEnd: '2026-11-09T00:00:00.000Z',
        startedAt: '2026-09-09T00:00:00.000Z',
      },
    ];

    // Simulate now being 2026-11-14 (5 days after 2026-11-09)
    const nowMs = Date.parse('2026-11-14T12:00:00.000Z');
    subEventsMock.mockResolvedValue({ data: [{ event_type: EVENT_DAY1 }] });

    const sweep = await processDunningForPastDueSubs(subs, { dry: true, nowMs });

    expect(sweep.processed).toBe(1);
    expect(sweep.items[0]).toEqual({
      subscriptionId: 'sub_past_due_5',
      userId: 'u-1',
      email: 'teacher@school.org',
      step: 'day-5',
      sent: false,
      reason: 'dry-run',
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('live run sends day-5 escalation email and logs subscription_events', async () => {
    const subs = [
      {
        id: 'sub_past_due_5',
        status: 'past_due',
        cancelAtPeriodEnd: false,
        email: 'teacher@school.org',
        amount: 900,
        currency: 'usd',
        currentPeriodEnd: '2026-11-09T00:00:00.000Z',
        startedAt: '2026-09-09T00:00:00.000Z',
      },
    ];

    const nowMs = Date.parse('2026-11-14T12:00:00.000Z');
    subEventsMock.mockResolvedValue({ data: [{ event_type: EVENT_DAY1 }] });

    const sweep = await processDunningForPastDueSubs(subs, { dry: false, nowMs });

    expect(sweep.processed).toBe(1);
    expect(sweep.items[0].sent).toBe(true);
    expect(sweep.items[0].step).toBe('day-5');
    expect(teacherPaymentFailedDay5).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'teacher@school.org' }));
  });
});
