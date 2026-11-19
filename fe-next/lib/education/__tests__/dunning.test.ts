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
const subscriptionUpdateMock = vi.fn(async (_patch: Record<string, unknown>) => ({ error: null }));
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
          update: (patch: Record<string, unknown>) => ({
            eq: () => subscriptionUpdateMock(patch),
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

  it('treats the teacher-pro-dunning day-1 marker as already sent', () => {
    expect(
      pickDunningStep({
        status: 'past_due',
        pastDueOnsetMs: onset,
        nowMs: onset + 1 * ONE_DAY,
        alreadySent: ['teacher_dunning_email_day_1'],
      }),
    ).toBeNull();
  });

  it('does not pick day-5 — that escalation is the teacher-pro-dunning cron, not this module', () => {
    // The local day-5 template always says "pauses in 2 days". Sending it on
    // day 5, 6, or a 9-day catch-up would be false and would double-email the
    // one-click escalation.
    for (const days of [5, 6, 9]) {
      expect(
        pickDunningStep({
          status: 'past_due',
          pastDueOnsetMs: onset,
          nowMs: onset + days * ONE_DAY,
          alreadySent: [EVENT_DAY1],
        }),
      ).toBeNull();
      expect(
        pickDunningStep({
          status: 'past_due',
          pastDueOnsetMs: onset,
          nowMs: onset + days * ONE_DAY,
          alreadySent: [],
        }),
      ).toBeNull();
    }
  });

  it('does not email a canceled or revoked subscription', () => {
    for (const status of ['canceled', 'cancelled', 'revoked', 'active']) {
      expect(
        pickDunningStep({
          status,
          pastDueOnsetMs: onset,
          nowMs: onset,
          alreadySent: [],
        }),
      ).toBeNull();
    }
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

  it('does not send when the payload status is canceled, even if the event name is updated', async () => {
    const result = await maybeSendPaymentFailedEmail({
      payload: {
        type: 'subscription.updated',
        data: { ...payload.data, status: 'canceled' },
      },
      userId: 'u1',
    });
    expect(result).toEqual({ sent: false, reason: 'not-past-due' });
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
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

  it('does not enqueue day-5 for a sub already 5+ days past_due', async () => {
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

    // 2026-11-14 is 5 days after onset; 2026-11-18 is the live 9-day catch-up.
    for (const nowMs of [Date.parse('2026-11-14T12:00:00.000Z'), Date.parse('2026-11-18T08:00:00.000Z')]) {
      subEventsMock.mockResolvedValue({ data: [{ event_type: EVENT_DAY1 }] });
      const sweep = await processDunningForPastDueSubs(subs, { dry: false, nowMs });
      expect(sweep).toEqual({ processed: 0, items: [] });
    }
    expect(teacherPaymentFailedDay5).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does not email again when teacher-pro-dunning already logged day-1', async () => {
    subEventsMock.mockResolvedValue({
      data: [{ event_type: 'teacher_dunning_email_day_1', created_at: '2026-11-10T00:00:00.000Z' }],
    });
    const sweep = await processDunningForPastDueSubs(
      [
        {
          id: 'sub_past_due_1',
          status: 'past_due',
          cancelAtPeriodEnd: false,
          email: 'teacher@school.org',
          amount: 900,
          currency: 'usd',
          currentPeriodEnd: '2026-12-09T00:00:00.000Z',
          startedAt: '2026-09-09T00:00:00.000Z',
        },
      ],
      { dry: false, nowMs: Date.parse('2026-11-11T08:00:00.000Z') },
    );
    expect(sweep.items).toEqual([]);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends day-1 once when two sweeps overlap before the marker is visible', async () => {
    let releaseSend: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseSend = resolve;
    });
    vi.mocked(sendEmail).mockImplementation(async () => {
      await gate;
      return { ok: true } as any;
    });
    subEventsMock.mockResolvedValue({ data: [] });
    subscriptionsMock.mockResolvedValue({
      data: { user_id: 'u-1', status: 'past_due', provider_event_at: '2026-11-10T00:00:00.000Z' },
    });
    const subs = [
      {
        id: 'sub_overlap',
        status: 'past_due',
        cancelAtPeriodEnd: false,
        email: 'teacher@school.org',
        amount: 900,
        currency: 'usd',
        currentPeriodEnd: '2026-12-10T00:00:00.000Z',
        startedAt: '2026-09-09T00:00:00.000Z',
      },
    ];
    const nowMs = Date.parse('2026-11-11T08:00:00.000Z');
    const first = processDunningForPastDueSubs(subs, { dry: false, nowMs });
    const second = processDunningForPastDueSubs(subs, { dry: false, nowMs });
    await new Promise((resolve) => setTimeout(resolve, 30));
    releaseSend();
    const [a, b] = await Promise.all([first, second]);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(a.items.filter((item) => item.sent).length + b.items.filter((item) => item.sent).length).toBe(1);
  });

  it('skips canceled subs even if they are passed into the sweep', async () => {
    const sweep = await processDunningForPastDueSubs(
      [
        {
          id: 'sub_canceled',
          status: 'canceled',
          cancelAtPeriodEnd: false,
          email: 'teacher@school.org',
          amount: 900,
          currency: 'usd',
          currentPeriodEnd: '2026-11-09T00:00:00.000Z',
          startedAt: '2026-09-09T00:00:00.000Z',
        },
      ],
      { dry: false, nowMs: Date.parse('2026-11-18T08:00:00.000Z') },
    );
    expect(sweep).toEqual({ processed: 0, items: [] });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('stamps a webhook-missed past_due row so the day-5 cron can see it, without sending the false day-5 note', async () => {
    subscriptionsMock.mockResolvedValue({
      data: {
        user_id: 'u-1',
        status: 'active',
        provider_event_at: '2026-09-09T00:00:00.000Z',
        current_period_end: '2026-11-09T00:00:00.000Z',
      },
    });
    subEventsMock.mockResolvedValue({ data: [{ event_type: EVENT_DAY1, created_at: '2026-11-09T01:05:37.000Z' }] });
    const sweep = await processDunningForPastDueSubs(
      [
        {
          id: 'sub_missed_webhook',
          status: 'past_due',
          cancelAtPeriodEnd: false,
          email: 'teacher@school.org',
          amount: 900,
          currency: 'usd',
          currentPeriodEnd: '2026-11-09T00:00:00.000Z',
          startedAt: '2026-09-09T00:00:00.000Z',
        },
      ],
      { dry: false, nowMs: Date.parse('2026-11-18T08:00:00.000Z') },
    );
    expect(sweep.items).toEqual([]);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(teacherPaymentFailedDay5).not.toHaveBeenCalled();
    expect(subscriptionUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'past_due', provider_event_at: '2026-11-09T00:00:00.000Z' }),
    );
  });
});
