import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { es } from '@/translations/es';
import { he } from '@/translations/he';
import {
  billingFromSubscriptionRow,
  formatTeacherDeleteImpactSummary,
  normalizeDeleteReason,
} from '@/lib/account/deleteAccountImpact';

describe('billingFromSubscriptionRow', () => {
  it('renews only for a live pro row with a provider id that is not set to cancel', () => {
    expect(billingFromSubscriptionRow({
      tier: 'pro',
      status: 'active',
      lemon_squeezy_subscription_id: 'sub_1',
      cancel_at_period_end: false,
    }).renews).toBe(true);
    expect(billingFromSubscriptionRow({
      tier: 'pro',
      status: 'trialing',
      lemon_squeezy_subscription_id: 'sub_1',
      cancel_at_period_end: false,
    }).renews).toBe(true);
    expect(billingFromSubscriptionRow({
      tier: 'pro',
      status: 'past_due',
      lemon_squeezy_subscription_id: 'sub_1',
      cancel_at_period_end: false,
    }).renews).toBe(true);
  });

  it('does not renew for free, canceled, paused, cancel-at-period-end, or a missing provider id', () => {
    expect(billingFromSubscriptionRow(null).renews).toBe(false);
    expect(billingFromSubscriptionRow({ tier: 'free', status: 'active' }).renews).toBe(false);
    expect(billingFromSubscriptionRow({
      tier: 'pro',
      status: 'canceled',
      lemon_squeezy_subscription_id: 'sub_1',
      cancel_at_period_end: false,
    }).renews).toBe(false);
    expect(billingFromSubscriptionRow({
      tier: 'pro',
      status: 'paused',
      lemon_squeezy_subscription_id: 'sub_1',
      cancel_at_period_end: false,
    }).renews).toBe(false);
    expect(billingFromSubscriptionRow({
      tier: 'pro',
      status: 'active',
      lemon_squeezy_subscription_id: 'sub_1',
      cancel_at_period_end: true,
    }).renews).toBe(false);
    expect(billingFromSubscriptionRow({
      tier: 'pro',
      status: 'active',
      lemon_squeezy_subscription_id: null,
      cancel_at_period_end: false,
    }).renews).toBe(false);
  });
});

describe('normalizeDeleteReason', () => {
  it('accepts the picker set and still accepts legacy values', () => {
    expect(normalizeDeleteReason('too_expensive')).toBe('too_expensive');
    expect(normalizeDeleteReason('didnt_work_for_class')).toBe('didnt_work_for_class');
    expect(normalizeDeleteReason('too_many_emails')).toBe('too_many_emails');
    expect(normalizeDeleteReason('privacy_concerns')).toBe('privacy');
    expect(normalizeDeleteReason('not-a-reason')).toBeNull();
  });
});

describe('locale copy', () => {
  it('ships the spec sentence in en, es, and he', () => {
    const settings = (mod: { settings: Record<string, string> }) => mod.settings;
    expect(settings(en).teacherDeleteImpactSummaryV2).toContain('and their reports will be permanently deleted.');
    expect(settings(es).teacherDeleteImpactSummaryV2).toContain('y sus reportes se eliminarán permanentemente.');
    expect(settings(he).teacherDeleteImpactSummaryV2).toContain('והדוחות שלהם יימחקו לצמיתות.');
    expect(settings(en).teacherDeleteKeepFree).toBe('The free plan stays free');
    expect(settings(es).teacherDeleteKeepFree).toBe('El plan gratis sigue siendo gratis');
    expect(settings(he).teacherDeleteKeepFree).toBe('התוכנית החינמית נשארת חינמית');
  });
});
describe('formatTeacherDeleteImpactSummary', () => {
  it('renders the acceptance sentence for 1 class / 19 students / 15 rounds', () => {
    const sentence = formatTeacherDeleteImpactSummary(
      '{classes} {classNoun}, {students} {studentNoun}, {rounds} {roundNoun} and their reports will be permanently deleted.',
      { classes: 1, students: 19, rounds: 15 },
      { classNoun: 'class', studentNoun: 'students', roundNoun: 'rounds' },
    );
    expect(sentence).toBe('1 class, 19 students, 15 rounds and their reports will be permanently deleted.');
  });
});
