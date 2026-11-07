import { describe, expect, it } from 'vitest';
import { teacherTrialExpiry } from '@/lib/education/trial';
import { FIRST_ROUND_MINUTES } from '@/components/education/lobby/inviteLinks';
import {
  DAY0_BRIDGE_PAYWALL_FROM_DAY,
  firstClassBridgeCopy,
  showDay0FirstClassBridge,
} from '../day0FirstClassBridge';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-11-07T12:00:00Z');

describe('showDay0FirstClassBridge', () => {
  it('shows the bridge on the approval day', () => {
    expect(showDay0FirstClassBridge(teacherTrialExpiry(NOW), NOW)).toBe(true);
  });

  it('keeps the bridge through the day before the paywall returns', () => {
    const approvedAt = NOW - (DAY0_BRIDGE_PAYWALL_FROM_DAY - 1) * DAY;
    expect(showDay0FirstClassBridge(teacherTrialExpiry(approvedAt), NOW)).toBe(true);
  });

  it('returns the paywall on day 3 of the access trial', () => {
    const approvedAt = NOW - DAY0_BRIDGE_PAYWALL_FROM_DAY * DAY;
    expect(showDay0FirstClassBridge(teacherTrialExpiry(approvedAt), NOW)).toBe(false);
  });

  it('returns the paywall after the access trial ends', () => {
    expect(showDay0FirstClassBridge(new Date(NOW - DAY).toISOString(), NOW)).toBe(false);
  });

  it('returns the paywall when approval time is unknown', () => {
    expect(showDay0FirstClassBridge(null, NOW)).toBe(false);
    expect(showDay0FirstClassBridge(undefined, NOW)).toBe(false);
    expect(showDay0FirstClassBridge('not-a-date', NOW)).toBe(false);
  });

  it('does not treat an extended trial as a fresh approval', () => {
    expect(showDay0FirstClassBridge(new Date(NOW + 20 * DAY).toISOString(), NOW)).toBe(false);
  });
});

describe('firstClassBridgeCopy', () => {
  it('names the real first-round length in every locale', () => {
    for (const locale of ['en', 'he', 'es', 'sv', 'ja', 'ru', 'en-US']) {
      const copy = firstClassBridgeCopy(locale);
      expect(copy.title).toContain(String(FIRST_ROUND_MINUTES));
      expect(copy.body.length).toBeGreaterThan(0);
      expect(copy.cta.length).toBeGreaterThan(0);
    }
  });

  it('uses the English line the card is named for', () => {
    expect(firstClassBridgeCopy('en').title).toBe('Your first class in 2 minutes');
  });

  it('falls back to English for an unknown locale', () => {
    expect(firstClassBridgeCopy('de').title).toBe(firstClassBridgeCopy('en').title);
  });
});
