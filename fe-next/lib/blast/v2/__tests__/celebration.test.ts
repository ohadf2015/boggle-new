import { describe, it, expect } from 'vitest';
import { resultCelebration } from '../celebration';

describe('resultCelebration', () => {
  it('gives a 3-star mastered run the epic treatment (most confetti + per-star bursts + finale)', () => {
    const epic = resultCelebration({ completionReason: 'mastered', stars: 3 });
    expect(epic.tier).toBe('epic');
    expect(epic.perStarBurst).toBe(true);
    expect(epic.finale).toBe(true);
  });

  it('gives a 1-2 star mastered run a standard celebration (no finale, no per-star burst)', () => {
    const std = resultCelebration({ completionReason: 'mastered', stars: 1 });
    expect(std.tier).toBe('standard');
    expect(std.perStarBurst).toBe(false);
    expect(std.finale).toBe(false);
  });

  it('softens a partial finish — fewer confetti than any mastered run, never epic', () => {
    const soft = resultCelebration({ completionReason: 'partial', stars: 1 });
    const std = resultCelebration({ completionReason: 'mastered', stars: 1 });
    const epic = resultCelebration({ completionReason: 'mastered', stars: 3 });
    expect(soft.tier).toBe('soft');
    expect(soft.confettiCount).toBeLessThan(std.confettiCount);
    expect(std.confettiCount).toBeLessThan(epic.confettiCount);
  });

  it('escalates confetti monotonically with celebration weight', () => {
    const soft = resultCelebration({ completionReason: 'partial', stars: 1 });
    const std = resultCelebration({ completionReason: 'mastered', stars: 2 });
    const epic = resultCelebration({ completionReason: 'mastered', stars: 3 });
    expect(soft.confettiCount).toBeGreaterThan(0);
    expect(epic.confettiCount).toBeGreaterThan(std.confettiCount);
  });
});
