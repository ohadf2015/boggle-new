import { describe, expect, it } from 'vitest';
import { shouldSkipQaMoneyCapture } from '../qaMoneyCapture';

describe('shouldSkipQaMoneyCapture', () => {
  it('skips a fake upgrade from a @lexiclash.test teacher', () => {
    expect(shouldSkipQaMoneyCapture('teacher_pro_upgraded', { email: 'prove@lexiclash.test' })).toBe(true);
    expect(shouldSkipQaMoneyCapture('checkout_complete', { email: 'prove@lexiclash.test' })).toBe(true);
  });

  it('skips money events for an is_test_account flag', () => {
    expect(shouldSkipQaMoneyCapture('trial_started', { isTestAccount: true })).toBe(true);
  });

  it('does not skip a real teacher, or a classroom event from QA', () => {
    expect(shouldSkipQaMoneyCapture('teacher_pro_upgraded', { email: 'ada@school.edu' })).toBe(false);
    expect(shouldSkipQaMoneyCapture('edu_classroom_game_started', { email: 'prove@lexiclash.test', isTestAccount: true })).toBe(false);
  });
});
