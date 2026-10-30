import { describe, it, expect, beforeEach } from 'vitest';
import { needsBonusIntro, markBonusIntroSeen } from '../bonusIntro';

beforeEach(() => localStorage.clear());

describe('bonus intro', () => {
  it('is needed once on a bonus date, then never again', () => {
    expect(needsBonusIntro('2026-11-05')).toBe(true);
    markBonusIntroSeen();
    expect(needsBonusIntro('2026-11-05')).toBe(false);
  });
  it('is never needed before the bonus rules start', () => {
    expect(needsBonusIntro('2026-10-30')).toBe(false);
  });
});
