import { describe, it, expect } from 'vitest';
import { resumeDecision } from '../resumeDecision';

const ready = { proLoading: false, known: true, hasPro: false, offerTrial: true };

describe('resumeDecision — what to do after sign-in brings a teacher back', () => {
  it('waits while the entitlement read is still in flight', () => {
    expect(resumeDecision({ ...ready, trial: true, proLoading: true })).toBe('wait');
    expect(resumeDecision({ ...ready, trial: false, proLoading: true })).toBe('wait');
  });

  it('resumes the trial checkout only when the trial is still on offer', () => {
    expect(resumeDecision({ ...ready, trial: true })).toBe('checkout-trial');
  });

  it('never silently turns a used trial into a paid checkout', () => {
    expect(resumeDecision({ ...ready, trial: true, offerTrial: false })).toBe('trial-used');
  });

  it('resumes the paid checkout for a free teacher', () => {
    expect(resumeDecision({ ...ready, trial: false, offerTrial: false })).toBe('checkout-paid');
  });

  it('stops a second subscription when the account already has Pro', () => {
    expect(resumeDecision({ ...ready, trial: false, hasPro: true, offerTrial: false })).toBe('already-pro');
    expect(resumeDecision({ ...ready, trial: true, hasPro: true, offerTrial: false })).toBe('already-pro');
  });

  it('does not redirect to checkout when the status read failed', () => {
    expect(resumeDecision({ ...ready, trial: true, known: false, offerTrial: false })).toBe('unknown');
    expect(resumeDecision({ ...ready, trial: false, known: false, offerTrial: false })).toBe('unknown');
  });
});
