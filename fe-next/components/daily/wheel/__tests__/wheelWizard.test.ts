import { describe, it, expect } from 'vitest';
import { reachesWizardRank } from '../wheelWizard';

describe('reachesWizardRank', () => {
  it('matches the ladder: a rank-3 score is not a wizard', () => {
    expect(reachesWizardRank(90, '2026-10-30')).toBe(false);
    expect(reachesWizardRank(599, '2026-10-30')).toBe(false);
    expect(reachesWizardRank(600, '2026-10-30')).toBe(true);
  });
  it('uses the scaled ladder on bonus days', () => {
    expect(reachesWizardRank(600, '2026-11-05')).toBe(false);
    expect(reachesWizardRank(900, '2026-11-05')).toBe(true);
  });
});
