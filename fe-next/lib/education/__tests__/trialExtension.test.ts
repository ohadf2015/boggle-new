import { describe, it, expect } from 'vitest';
import { planTrialExtension, GOODWILL_EXTENSION_MARKER } from '../trialExtension';
import { pickTrialReminder } from '../trialReminders';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-08-29T12:00:00.000Z');

const row = (over: Partial<Parameters<typeof planTrialExtension>[0][number]> = {}) => ({
  id: 'r1',
  email: 'teacher@example.com',
  user_id: 'u1',
  full_name: 'Teacher',
  locale: 'en' as const,
  created_at: '2026-07-01T00:00:00.000Z',
  trial_expires_at: '2026-07-16T00:00:00.000Z',
  trial_reminders_sent: null,
  ...over,
});

describe('planTrialExtension', () => {
  it('extends an EXPIRED trial from today, not from the dead deadline', () => {
    // +14 days on a July deadline lands in August and is still expired — the
    // email would promise a trial the product had already ended.
    const [plan] = planTrialExtension([row()], NOW);
    expect(Date.parse(plan.newExpiresAt)).toBe(NOW + 14 * DAY);
  });

  it('extends an ACTIVE trial from its own deadline, never shortening it', () => {
    const active = row({ trial_expires_at: '2026-09-10T00:00:00.000Z' });
    const [plan] = planTrialExtension([active], NOW);
    expect(Date.parse(plan.newExpiresAt)).toBe(Date.parse('2026-09-10T00:00:00.000Z') + 14 * DAY);
  });

  it('gives a row with no deadline at all a fresh 14 days', () => {
    const [plan] = planTrialExtension([row({ trial_expires_at: null })], NOW);
    expect(Date.parse(plan.newExpiresAt)).toBe(NOW + 14 * DAY);
  });

  it('mails a person once, not once per request row', () => {
    // 46 approved rows belong to 34 people. Per-row mailing is the duplicate-email
    // bug `trial_reminders_sent` already caused once.
    const plans = planTrialExtension(
      [
        row({ id: 'old', created_at: '2026-07-01T00:00:00.000Z' }),
        row({ id: 'new', created_at: '2026-08-01T00:00:00.000Z' }),
        row({ id: 'shouty', email: 'TEACHER@example.com', created_at: '2026-06-01T00:00:00.000Z' }),
      ],
      NOW,
    );
    expect(plans).toHaveLength(1);
    expect(plans[0].row.id, 'keeps the most recent request row').toBe('new');
  });

  it('clears the old reminder buckets so the new deadline still gets its reminders', () => {
    // pickTrialReminder never re-sends a bucket it finds in the array, so
    // appending would leave every extended teacher with no ask at all on the
    // new deadline — an apology that quietly removes the payment prompt.
    const reminded = row({ trial_reminders_sent: ['t-3', 't-0', 't+3'] });
    const [plan] = planTrialExtension([reminded], NOW);
    expect(plan.newRemindersSent).toEqual([GOODWILL_EXTENSION_MARKER]);
    expect(pickTrialReminder(plan.newExpiresAt, plan.newRemindersSent, Date.parse('2026-09-10T12:00:00.000Z')))
      .toBe('t-3');
  });

  it('skips accountless legacy rows — there is no trial to extend', () => {
    expect(planTrialExtension([row({ user_id: null })], NOW)).toEqual([]);
  });

  it('is idempotent: a row already carrying the marker is skipped', () => {
    const done = row({ trial_reminders_sent: ['t-3', GOODWILL_EXTENSION_MARKER] });
    expect(planTrialExtension([done], NOW)).toEqual([]);
  });
});
