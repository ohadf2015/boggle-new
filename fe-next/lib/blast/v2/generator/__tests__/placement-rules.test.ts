import { describe, it, expect } from 'vitest';
import { placementRulesForLevel } from '../placement-rules';

describe('placementRulesForLevel', () => {
  it('levels 1-3 anchor the first word to row 0 (horizontal foundation)', () => {
    expect(placementRulesForLevel(1).firstWordRowZero).toBe(true);
    expect(placementRulesForLevel(2).firstWordRowZero).toBe(true);
    expect(placementRulesForLevel(3).firstWordRowZero).toBe(true);
  });

  it('levels 4+ allow the first word to land anywhere', () => {
    expect(placementRulesForLevel(4).firstWordRowZero).toBe(false);
    expect(placementRulesForLevel(7).firstWordRowZero).toBe(false);
    expect(placementRulesForLevel(40).firstWordRowZero).toBe(false);
  });

  it('levels 1-5 do not require a vertical word', () => {
    expect(placementRulesForLevel(1).requireVerticalWord).toBe(false);
    expect(placementRulesForLevel(5).requireVerticalWord).toBe(false);
  });

  it('levels 6+ require at least one vertical word', () => {
    expect(placementRulesForLevel(6).requireVerticalWord).toBe(true);
    expect(placementRulesForLevel(12).requireVerticalWord).toBe(true);
    expect(placementRulesForLevel(50).requireVerticalWord).toBe(true);
  });
});
