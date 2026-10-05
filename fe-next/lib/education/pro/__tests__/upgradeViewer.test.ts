import { describe, it, expect } from 'vitest';
import { upgradeViewer, showTrialOffer } from '../upgradeViewer';

const signedIn = { authLoading: false, signedIn: true, proLoading: false, known: true, hasPro: false };

describe('upgradeViewer — whose plan card is "current"', () => {
  it('is loading until auth resolves', () => {
    expect(upgradeViewer({ ...signedIn, authLoading: true })).toBe('loading');
  });

  it('is anon for a logged-out visitor, whatever the status hook says', () => {
    expect(upgradeViewer({ ...signedIn, signedIn: false, known: false })).toBe('anon');
    expect(upgradeViewer({ ...signedIn, signedIn: false, proLoading: true })).toBe('anon');
  });

  it('is loading while a signed-in teacher\'s entitlement is in flight', () => {
    expect(upgradeViewer({ ...signedIn, proLoading: true })).toBe('loading');
  });

  it('is unknown when the status read failed, so no card claims to be theirs', () => {
    expect(upgradeViewer({ ...signedIn, known: false })).toBe('unknown');
  });

  it('separates free and pro', () => {
    expect(upgradeViewer(signedIn)).toBe('free');
    expect(upgradeViewer({ ...signedIn, hasPro: true })).toBe('pro');
  });
});

describe('showTrialOffer — the trial button only where the code grants a trial', () => {
  it('offers it to a logged-out visitor (a new account has never trialed)', () => {
    expect(showTrialOffer('anon', false)).toBe(true);
  });

  it('follows the server-derived eligibility for a signed-in free teacher', () => {
    expect(showTrialOffer('free', true)).toBe(true);
    expect(showTrialOffer('free', false)).toBe(false);
  });

  it('offers it while auth/entitlement is loading, so the server render matches a signed-out visitor', () => {
    expect(showTrialOffer('loading', false)).toBe(true);
    expect(showTrialOffer('loading', true)).toBe(true);
  });

  it('never offers it once resolved as unknown or Pro', () => {
    expect(showTrialOffer('unknown', true)).toBe(false);
    expect(showTrialOffer('pro', true)).toBe(false);
    expect(showTrialOffer('pro', false)).toBe(false);
  });
});
