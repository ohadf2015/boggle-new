/**
 * 375 referral codes issued, 0 rows in `referrals`, 0 profiles with referred_by,
 * 0 rewards granted — ever. Not an RLS bug: nothing in the app ever sent a code
 * anywhere. The share link is `<origin>?ref=CODE`, and this module is the half
 * that reads it back and holds it until the visitor has an account to attach it to.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PENDING_REFERRAL_KEY,
  readReferralCodeFromSearch,
  storePendingReferral,
  readPendingReferral,
  clearPendingReferral,
} from '../pendingReferral';

describe('readReferralCodeFromSearch', () => {
  it('reads ?ref= and normalises to upper case', () => {
    expect(readReferralCodeFromSearch('?ref=ab12cd')).toBe('AB12CD');
    expect(readReferralCodeFromSearch('?utm_source=x&ref=LEXI99')).toBe('LEXI99');
  });

  it('tolerates a missing leading question mark and surrounding space', () => {
    expect(readReferralCodeFromSearch('ref=%20ab12cd%20')).toBe('AB12CD');
  });

  it('returns null when there is no code', () => {
    expect(readReferralCodeFromSearch('')).toBeNull();
    expect(readReferralCodeFromSearch('?utm_source=x')).toBeNull();
    expect(readReferralCodeFromSearch('?ref=')).toBeNull();
  });

  it('rejects anything that is not a plausible code, rather than posting junk', () => {
    expect(readReferralCodeFromSearch('?ref=ab')).toBeNull(); // too short
    expect(readReferralCodeFromSearch('?ref=' + 'A'.repeat(17))).toBeNull(); // too long
    expect(readReferralCodeFromSearch('?ref=drop-table')).toBeNull(); // not alphanumeric
  });
});

describe('pending referral storage', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a code and clears it', () => {
    expect(readPendingReferral()).toBeNull();

    storePendingReferral('AB12CD');
    expect(localStorage.getItem(PENDING_REFERRAL_KEY)).toBe('AB12CD');
    expect(readPendingReferral()).toBe('AB12CD');

    clearPendingReferral();
    expect(readPendingReferral()).toBeNull();
  });

  it('never stores an invalid code', () => {
    storePendingReferral('nope!');
    expect(readPendingReferral()).toBeNull();
  });

  it('rejects a junk value already sitting in storage', () => {
    localStorage.setItem(PENDING_REFERRAL_KEY, 'not a code');
    expect(readPendingReferral()).toBeNull();
  });
});
