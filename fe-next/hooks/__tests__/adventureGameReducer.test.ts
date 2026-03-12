import { calculateStars } from '../adventureGameReducer';
import type { LevelObjective } from '../../types/adventure';

function makeObjective(
  overrides: Partial<LevelObjective> & { isPrimary: boolean }
): LevelObjective {
  return {
    type: 'scoreTarget',
    target: 100,
    current: 0,
    isComplete: false,
    ...overrides,
  };
}

describe('calculateStars', () => {
  // --- Existing behavior (should not change) ---

  it('returns 0 when primary objective is not met', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 50 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
    ];
    expect(calculateStars(objectives)).toBe(0);
  });

  it('returns 1 when primary met but no secondaries completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 0 }),
      makeObjective({ isPrimary: false, target: 5, current: 0 }),
      makeObjective({ isPrimary: false, target: 8, current: 0 }),
    ];
    expect(calculateStars(objectives)).toBe(1);
  });

  it('returns 2 when primary met and 1 secondary completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
      makeObjective({ isPrimary: false, target: 5, current: 0 }),
      makeObjective({ isPrimary: false, target: 8, current: 0 }),
    ];
    expect(calculateStars(objectives)).toBe(2);
  });

  it('returns 3 when primary met and ALL secondaries completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
      makeObjective({ isPrimary: false, target: 5, current: 5 }),
      makeObjective({ isPrimary: false, target: 8, current: 8 }),
    ];
    expect(calculateStars(objectives)).toBe(3);
  });

  // --- New behavior: 3 stars with 2+ secondaries completed (when 3+ exist) ---

  it('returns 3 when primary met and 2 of 3 secondaries completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
      makeObjective({ isPrimary: false, target: 5, current: 5 }),
      makeObjective({ isPrimary: false, target: 8, current: 0 }), // impossible one
    ];
    expect(calculateStars(objectives)).toBe(3);
  });

  it('returns 3 when primary met and 3 of 4 secondaries completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
      makeObjective({ isPrimary: false, target: 5, current: 5 }),
      makeObjective({ isPrimary: false, target: 8, current: 8 }),
      makeObjective({ isPrimary: false, target: 3, current: 0 }),
    ];
    expect(calculateStars(objectives)).toBe(3);
  });

  // --- Edge: only 1 or 2 secondaries require ALL for 3 stars ---

  it('returns 2 (not 3) when only 1 secondary exists and it is not completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 0 }),
    ];
    expect(calculateStars(objectives)).toBe(1);
  });

  it('returns 3 when only 1 secondary exists and it IS completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
    ];
    expect(calculateStars(objectives)).toBe(3);
  });

  it('returns 3 when only 2 secondaries exist and both completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
      makeObjective({ isPrimary: false, target: 5, current: 5 }),
    ];
    expect(calculateStars(objectives)).toBe(3);
  });

  it('returns 2 when only 2 secondaries exist and only 1 completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
      makeObjective({ isPrimary: false, target: 5, current: 0 }),
    ];
    expect(calculateStars(objectives)).toBe(2);
  });

  // --- Edge: no secondaries ---

  it('returns 3 when primary met and no secondaries exist', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
    ];
    expect(calculateStars(objectives)).toBe(3);
  });
});
