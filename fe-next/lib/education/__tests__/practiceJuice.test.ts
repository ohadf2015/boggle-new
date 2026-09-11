import { describe, it, expect } from 'vitest';
import {
  practiceCelebrationPlan,
  streakFlameStage,
  coinBurstCount,
  beatTheClockSeconds,
  STREAK_FLAME_ART,
  practiceXpRate,
} from '../practiceJuice';

describe('practiceCelebrationPlan', () => {
  it('awards three stars for a near-perfect round', () => {
    const plan = practiceCelebrationPlan(9, 10);
    expect(plan.stars).toBe(3);
    expect(plan.rank).toBe('gold');
    expect(plan.confetti).toBe('victory');
  });

  it('flags a flawless round so the headline can say so', () => {
    const plan = practiceCelebrationPlan(10, 10);
    expect(plan.perfect).toBe(true);
    expect(plan.stars).toBe(3);
    expect(plan.headlineKey).toBe('student.practiceFun.headline.perfect');
  });

  it('awards two stars in the middle band', () => {
    const plan = practiceCelebrationPlan(7, 10);
    expect(plan.stars).toBe(2);
    expect(plan.rank).toBe('silver');
    expect(plan.mascot).toBe('trophy');
  });

  it('never drops below one star — finishing is the floor', () => {
    expect(practiceCelebrationPlan(0, 10).stars).toBe(1);
    expect(practiceCelebrationPlan(0, 0).stars).toBe(1);
  });

  it('still celebrates a low round, just more quietly', () => {
    const plan = practiceCelebrationPlan(1, 10);
    expect(plan.rank).toBe('bronze');
    expect(plan.mascot).toBe('encouraging');
    expect(plan.confetti).toBe('none');
    expect(plan.sound).toBe('questComplete');
  });

  it('treats a zero-question round as a completed bronze round, not a divide by zero', () => {
    const plan = practiceCelebrationPlan(0, 0);
    expect(plan.percent).toBe(0);
    expect(Number.isFinite(plan.percent)).toBe(true);
  });

  it('clamps a correct count above the total', () => {
    expect(practiceCelebrationPlan(12, 10).percent).toBe(100);
  });
});

describe('streakFlameStage', () => {
  it('shows no flame below the first rung', () => {
    expect(streakFlameStage(0).stage).toBe(0);
    expect(streakFlameStage(1).stage).toBe(0);
    expect(streakFlameStage(1).art).toBeNull();
  });

  it('grows the flame through four stages', () => {
    expect(streakFlameStage(2).stage).toBe(1);
    expect(streakFlameStage(4).stage).toBe(2);
    expect(streakFlameStage(7).stage).toBe(3);
    expect(streakFlameStage(12).stage).toBe(4);
    expect(streakFlameStage(40).stage).toBe(4);
  });

  it('points each stage at real mascot streak art', () => {
    for (let streak = 2; streak <= 20; streak += 1) {
      const { art } = streakFlameStage(streak);
      expect(art).not.toBeNull();
      expect(STREAK_FLAME_ART).toContain(art as string);
    }
  });

  it('fires the stinger only on the streak that first reaches a stage', () => {
    expect(streakFlameStage(2).milestone).toBe(true);
    expect(streakFlameStage(3).milestone).toBe(false);
    expect(streakFlameStage(4).milestone).toBe(true);
    expect(streakFlameStage(7).milestone).toBe(true);
    expect(streakFlameStage(12).milestone).toBe(true);
    expect(streakFlameStage(13).milestone).toBe(false);
  });
});

describe('coinBurstCount', () => {
  it('flies no coins when no XP was earned', () => {
    expect(coinBurstCount(0)).toBe(0);
    expect(coinBurstCount(-5)).toBe(0);
  });

  it('always flies a visible handful once XP exists', () => {
    expect(coinBurstCount(1)).toBe(3);
    expect(coinBurstCount(50)).toBe(5);
  });

  it('caps the burst so a huge round does not spray the phone', () => {
    expect(coinBurstCount(10_000)).toBe(12);
  });
});

describe('beatTheClockSeconds', () => {
  it('gives the board a round minute-and-a-half by default', () => {
    expect(beatTheClockSeconds('solo_board', 8)).toBe(90);
  });

  it('scales the flashcard clock with the deck but stays inside sane bounds', () => {
    expect(beatTheClockSeconds('flashcard', 4)).toBe(45);
    expect(beatTheClockSeconds('flashcard', 12)).toBe(72);
    expect(beatTheClockSeconds('flashcard', 200)).toBe(180);
  });
});

describe('practiceXpRate', () => {
  it('mirrors the server XP rates the picker advertises', () => {
    // Pinned against backend/modules/educationXpManager.ts EDUCATION_XP_CONFIG:
    // FLASHCARD_CORRECT 10, VOCABULARY_WORD_FOUND 15, MATCHING_PAIR_CORRECT 15,
    // SPELLING_WORD_CORRECT 20, BLITZ_WORD_FOUND 10.
    expect(practiceXpRate('flashcard')).toBe(10);
    expect(practiceXpRate('solo_board')).toBe(15);
    expect(practiceXpRate('matching')).toBe(15);
    expect(practiceXpRate('spelling')).toBe(20);
    expect(practiceXpRate('blitz')).toBe(10);
  });

  it('covers every vocabulary-skill tile without a per-skill entry', () => {
    expect(practiceXpRate('vocab_focus:synonym')).toBe(15);
    expect(practiceXpRate('vocab_focus:roots_affixes')).toBe(15);
  });

  it('advertises nothing for the read-only word list', () => {
    expect(practiceXpRate('word_list')).toBe(0);
  });

  it('falls back rather than returning undefined for an unknown tile', () => {
    expect(practiceXpRate('something_new')).toBeGreaterThan(0);
  });
});
