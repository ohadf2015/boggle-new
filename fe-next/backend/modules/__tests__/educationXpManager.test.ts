/**
 * Education XP Manager Tests
 * TDD: RED phase - Write failing tests BEFORE implementation
 *
 * Tests XP calculation for education practice activities:
 * - Flashcard sessions (10 XP/correct, accuracy bonuses)
 * - Solo board sessions (15 XP/vocab word, new word bonus)
 * - Lesson completion (200 XP base, 100 mastery bonus)
 * - Streak multipliers (1.5x at 7d, 1.75x at 14d, 2x at 30d)
 * - Mastery message generation (mastery-first, not points-first)
 */

import {
  EDUCATION_XP_CONFIG,
  calculatePracticeXp,
  getMasteryMessage,
  type PracticeSessionXp,
} from '../educationXpManager';

describe('educationXpManager', () => {
  // ============================================
  // CONFIGURATION CONSTANTS
  // ============================================
  describe('EDUCATION_XP_CONFIG', () => {
    it('should have correct flashcard XP values', () => {
      expect(EDUCATION_XP_CONFIG.FLASHCARD_CORRECT).toBe(10);
      expect(EDUCATION_XP_CONFIG.FLASHCARD_ACCURACY_BONUS[90]).toBe(50);
      expect(EDUCATION_XP_CONFIG.FLASHCARD_ACCURACY_BONUS[80]).toBe(30);
      expect(EDUCATION_XP_CONFIG.FLASHCARD_ACCURACY_BONUS[70]).toBe(10);
      expect(EDUCATION_XP_CONFIG.FLASHCARD_PERFECT_SESSION).toBe(100);
    });

    it('should have correct board XP values', () => {
      expect(EDUCATION_XP_CONFIG.VOCABULARY_WORD_FOUND).toBe(15);
      expect(EDUCATION_XP_CONFIG.BOARD_COMPLETION).toBe(50);
      // Bumped 25 → 40 (audit D5): discovery is the highest-value learning
      // signal so the new-word bonus should clearly out-pay re-finding.
      expect(EDUCATION_XP_CONFIG.NEW_WORD_BONUS).toBe(40);
    });

    it('should have correct lesson XP values', () => {
      expect(EDUCATION_XP_CONFIG.LESSON_COMPLETED).toBe(200);
      expect(EDUCATION_XP_CONFIG.LESSON_MASTERY_BONUS).toBe(100);
    });

    it('should have correct daily and streak values', () => {
      expect(EDUCATION_XP_CONFIG.DAILY_PRACTICE_BASE).toBe(20);
      expect(EDUCATION_XP_CONFIG.STREAK_MULTIPLIERS[7]).toBe(1.5);
      expect(EDUCATION_XP_CONFIG.STREAK_MULTIPLIERS[14]).toBe(1.75);
      expect(EDUCATION_XP_CONFIG.STREAK_MULTIPLIERS[30]).toBe(2.0);
    });
  });

  // ============================================
  // FLASHCARD XP CALCULATIONS
  // ============================================
  describe('calculatePracticeXp - flashcard', () => {
    it('should calculate basic flashcard XP (5/10 correct)', () => {
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 5,
        },
      };

      const result = calculatePracticeXp(session);

      // 5 correct * 10 XP = 50 + 20 daily = 70 XP
      expect(result.totalXp).toBe(70);
      expect(result.breakdown.flashcardCorrect).toBe(50);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should apply 80% accuracy bonus (8/10 correct)', () => {
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 8,
        },
      };

      const result = calculatePracticeXp(session);

      // 8 correct * 10 = 80 + 30 bonus + 20 daily = 130 XP
      expect(result.totalXp).toBe(130);
      expect(result.breakdown.flashcardCorrect).toBe(80);
      expect(result.breakdown.accuracyBonus).toBe(30);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should apply 90% accuracy bonus (9/10 correct)', () => {
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 9,
        },
      };

      const result = calculatePracticeXp(session);

      // 9 correct * 10 = 90 + 50 bonus + 20 daily = 160 XP
      expect(result.totalXp).toBe(160);
      expect(result.breakdown.flashcardCorrect).toBe(90);
      expect(result.breakdown.accuracyBonus).toBe(50);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should apply perfect session bonus (10/10 correct)', () => {
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 10,
        },
      };

      const result = calculatePracticeXp(session);

      // 10 correct * 10 = 100 + 50 accuracy bonus + 100 perfect + 20 daily = 270 XP
      expect(result.totalXp).toBe(270);
      expect(result.breakdown.flashcardCorrect).toBe(100);
      expect(result.breakdown.accuracyBonus).toBe(50);
      expect(result.breakdown.perfectSession).toBe(100);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should handle 0 cards reviewed gracefully', () => {
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 0,
          cardsCorrect: 0,
        },
      };

      const result = calculatePracticeXp(session);

      // Just daily XP
      expect(result.totalXp).toBe(20);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should not apply accuracy bonus below 70%', () => {
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 6,
        },
      };

      const result = calculatePracticeXp(session);

      // 6 correct * 10 = 60 + 20 daily = 80 XP (no accuracy bonus)
      expect(result.totalXp).toBe(80);
      expect(result.breakdown.accuracyBonus).toBeUndefined();
    });
  });

  // ============================================
  // SOLO BOARD XP CALCULATIONS
  // ============================================
  describe('calculatePracticeXp - solo_board', () => {
    it('should calculate basic board XP (5 vocab words)', () => {
      const session: PracticeSessionXp = {
        type: 'solo_board',
        sessionData: {
          vocabularyWordsFound: ['apple', 'banana', 'cherry', 'date', 'elderberry'],
        },
      };

      const result = calculatePracticeXp(session);

      // 5 vocab * 15 = 75 + 50 completion + 20 daily = 145 XP
      expect(result.totalXp).toBe(145);
      expect(result.breakdown.vocabularyWords).toBe(75);
      expect(result.breakdown.boardCompletion).toBe(50);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should apply new word bonus', () => {
      const session: PracticeSessionXp = {
        type: 'solo_board',
        sessionData: {
          vocabularyWordsFound: ['apple', 'banana', 'cherry'],
          newWordsFound: ['cherry'], // 1 new word
        },
      };

      const result = calculatePracticeXp(session);

      // 3 vocab * 15 = 45 + 40 new word + 50 completion + 20 daily = 155 XP
      expect(result.totalXp).toBe(155);
      expect(result.breakdown.vocabularyWords).toBe(45);
      expect(result.breakdown.newWords).toBe(40);
      expect(result.breakdown.boardCompletion).toBe(50);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should handle empty vocabulary words', () => {
      const session: PracticeSessionXp = {
        type: 'solo_board',
        sessionData: {
          vocabularyWordsFound: [],
        },
      };

      const result = calculatePracticeXp(session);

      // 0 vocab + 50 completion + 20 daily = 70 XP
      expect(result.totalXp).toBe(70);
      expect(result.breakdown.vocabularyWords).toBe(0);
      expect(result.breakdown.boardCompletion).toBe(50);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should handle multiple new words', () => {
      const session: PracticeSessionXp = {
        type: 'solo_board',
        sessionData: {
          vocabularyWordsFound: ['apple', 'banana', 'cherry', 'date'],
          newWordsFound: ['cherry', 'date'], // 2 new words
        },
      };

      const result = calculatePracticeXp(session);

      // 4 vocab * 15 = 60 + 80 new words (2*40) + 50 completion + 20 daily = 210 XP
      expect(result.totalXp).toBe(210);
      expect(result.breakdown.newWords).toBe(80);
    });
  });

  // ============================================
  // LESSON COMPLETION XP CALCULATIONS
  // ============================================
  describe('calculatePracticeXp - lesson_completion', () => {
    it('should calculate basic lesson completion XP', () => {
      const session: PracticeSessionXp = {
        type: 'lesson_completion',
        sessionData: {
          masteryLevel: 'practicing',
        },
      };

      const result = calculatePracticeXp(session);

      // 200 lesson + 20 daily = 220 XP
      expect(result.totalXp).toBe(220);
      expect(result.breakdown.lessonCompleted).toBe(200);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should apply mastery bonus when mastered', () => {
      const session: PracticeSessionXp = {
        type: 'lesson_completion',
        sessionData: {
          masteryLevel: 'mastered',
        },
      };

      const result = calculatePracticeXp(session);

      // 200 lesson + 100 mastery + 20 daily = 320 XP
      expect(result.totalXp).toBe(320);
      expect(result.breakdown.lessonCompleted).toBe(200);
      expect(result.breakdown.masteryBonus).toBe(100);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should not apply mastery bonus for non-mastered lessons', () => {
      const session: PracticeSessionXp = {
        type: 'lesson_completion',
        sessionData: {
          masteryLevel: 'started',
        },
      };

      const result = calculatePracticeXp(session);

      // 200 lesson + 20 daily = 220 XP (no mastery bonus)
      expect(result.totalXp).toBe(220);
      expect(result.breakdown.masteryBonus).toBeUndefined();
    });
  });

  // ============================================
  // STREAK MULTIPLIER CALCULATIONS
  // ============================================
  describe('calculatePracticeXp - streak multipliers', () => {
    it('should apply 1.5x multiplier at 7 day streak', () => {
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 5,
        },
        streakDays: 7,
      };

      const result = calculatePracticeXp(session);

      // Base: 50 + 20 = 70, then +35 streak bonus (50% of 70) = 105 XP
      expect(result.totalXp).toBe(105);
      expect(result.breakdown.streakBonus).toBe(35);
    });

    it('should apply 1.75x multiplier at 14 day streak', () => {
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 5,
        },
        streakDays: 14,
      };

      const result = calculatePracticeXp(session);

      // Base: 50 + 20 = 70, then +53 streak bonus (75% of 70, rounded) = 123 XP
      expect(result.totalXp).toBe(123);
      expect(result.breakdown.streakBonus).toBe(53);
    });

    it('should apply 2.0x multiplier at 30 day streak', () => {
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 5,
        },
        streakDays: 30,
      };

      const result = calculatePracticeXp(session);

      // Base: 50 + 20 = 70, then +70 streak bonus (100% of 70) = 140 XP
      expect(result.totalXp).toBe(140);
      expect(result.breakdown.streakBonus).toBe(70);
    });

    it('should not apply multiplier below 7 day streak', () => {
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 5,
        },
        streakDays: 5,
      };

      const result = calculatePracticeXp(session);

      // Base: 50 + 20 = 70, no streak bonus
      expect(result.totalXp).toBe(70);
      expect(result.breakdown.streakBonus).toBeUndefined();
    });

    it('should use highest applicable multiplier (50 day streak uses 30d multiplier)', () => {
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 5,
        },
        streakDays: 50,
      };

      const result = calculatePracticeXp(session);

      // Base: 50 + 20 = 70, then +70 streak bonus (2.0x from 30d multiplier) = 140 XP
      expect(result.totalXp).toBe(140);
      expect(result.breakdown.streakBonus).toBe(70);
    });

    it('should apply streak bonus to larger XP amounts correctly', () => {
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 10, // Perfect session
        },
        streakDays: 7,
      };

      const result = calculatePracticeXp(session);

      // Base: 100 + 50 + 100 + 20 = 270, then +135 streak bonus (50% of 270) = 405 XP
      expect(result.totalXp).toBe(405);
      expect(result.breakdown.streakBonus).toBe(135);
    });
  });

  // ============================================
  // MASTERY MESSAGE GENERATION
  // ============================================
  describe('getMasteryMessage', () => {
    it('should generate perfect flashcard message', () => {
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 10,
        },
      };

      const message = getMasteryMessage(session);

      expect(message).toBe('Perfect! You mastered all 10 words!');
    });

    it('should generate partial flashcard message', () => {
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 7,
        },
      };

      const message = getMasteryMessage(session);

      expect(message).toBe('You learned 7 words!');
    });

    it('should generate new words board message', () => {
      const session: PracticeSessionXp = {
        type: 'solo_board',
        sessionData: {
          vocabularyWordsFound: ['apple', 'banana'],
          newWordsFound: ['banana'],
        },
      };

      const message = getMasteryMessage(session);

      expect(message).toBe('You discovered 1 new vocabulary words!');
    });

    it('should generate generic board message when no new words', () => {
      const session: PracticeSessionXp = {
        type: 'solo_board',
        sessionData: {
          vocabularyWordsFound: ['apple', 'banana'],
          newWordsFound: [],
        },
      };

      const message = getMasteryMessage(session);

      expect(message).toBe('Great practice! Keep finding those words!');
    });

    it('should generate mastered lesson message', () => {
      const session: PracticeSessionXp = {
        type: 'lesson_completion',
        sessionData: {
          masteryLevel: 'mastered',
        },
      };

      const message = getMasteryMessage(session);

      expect(message).toBe('Lesson mastered! You know these words!');
    });

    it('should generate in-progress lesson message', () => {
      const session: PracticeSessionXp = {
        type: 'lesson_completion',
        sessionData: {
          masteryLevel: 'practicing',
        },
      };

      const message = getMasteryMessage(session);

      expect(message).toBe('Nice work! Keep practicing to master this lesson.');
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe('edge cases', () => {
    it('should handle undefined sessionData fields gracefully', () => {
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {},
      };

      const result = calculatePracticeXp(session);

      // Just daily XP
      expect(result.totalXp).toBe(20);
    });

    it('should return integer XP values (no floating point)', () => {
      // Test with streak that could cause floating point issues
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 3,
          cardsCorrect: 2,
        },
        streakDays: 7,
      };

      const result = calculatePracticeXp(session);

      // All values should be integers
      expect(Number.isInteger(result.totalXp)).toBe(true);
      Object.values(result.breakdown).forEach((value) => {
        expect(Number.isInteger(value)).toBe(true);
      });
    });

    it('should include masteryMessage in result', () => {
      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 10,
        },
      };

      const result = calculatePracticeXp(session);

      expect(result.masteryMessage).toBeDefined();
      expect(typeof result.masteryMessage).toBe('string');
      expect(result.masteryMessage.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // MATCHING PRACTICE XP CALCULATIONS (Phase 37)
  // ============================================
  describe('calculatePracticeXp - matching', () => {
    it('should calculate basic matching XP (5/10 pairs)', () => {
      const session: PracticeSessionXp = {
        type: 'matching',
        sessionData: {
          pairsMatched: 5,
          totalPairs: 10,
        },
      };

      const result = calculatePracticeXp(session);

      // 5 pairs * 15 = 75 + 20 daily = 95 XP
      expect(result.totalXp).toBe(95);
      expect(result.breakdown.matchingPairs).toBe(75);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should apply 80% accuracy bonus (8/10 pairs)', () => {
      const session: PracticeSessionXp = {
        type: 'matching',
        sessionData: {
          pairsMatched: 8,
          totalPairs: 10,
        },
      };

      const result = calculatePracticeXp(session);

      // 8 pairs * 15 = 120 + 20 bonus + 20 daily = 160 XP
      expect(result.totalXp).toBe(160);
      expect(result.breakdown.matchingPairs).toBe(120);
      expect(result.breakdown.accuracyBonus).toBe(20);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should apply 90% accuracy bonus (9/10 pairs)', () => {
      const session: PracticeSessionXp = {
        type: 'matching',
        sessionData: {
          pairsMatched: 9,
          totalPairs: 10,
        },
      };

      const result = calculatePracticeXp(session);

      // 9 pairs * 15 = 135 + 40 bonus + 20 daily = 195 XP
      expect(result.totalXp).toBe(195);
      expect(result.breakdown.matchingPairs).toBe(135);
      expect(result.breakdown.accuracyBonus).toBe(40);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should apply perfect session bonus (10/10 pairs)', () => {
      const session: PracticeSessionXp = {
        type: 'matching',
        sessionData: {
          pairsMatched: 10,
          totalPairs: 10,
        },
      };

      const result = calculatePracticeXp(session);

      // 10 pairs * 15 = 150 + 40 accuracy + 60 perfect + 20 daily = 270 XP
      expect(result.totalXp).toBe(270);
      expect(result.breakdown.matchingPairs).toBe(150);
      expect(result.breakdown.accuracyBonus).toBe(40);
      expect(result.breakdown.perfectSession).toBe(60);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should not apply accuracy bonus below 70%', () => {
      const session: PracticeSessionXp = {
        type: 'matching',
        sessionData: {
          pairsMatched: 6,
          totalPairs: 10,
        },
      };

      const result = calculatePracticeXp(session);

      // 6 pairs * 15 = 90 + 20 daily = 110 XP (no accuracy bonus)
      expect(result.totalXp).toBe(110);
      expect(result.breakdown.accuracyBonus).toBeUndefined();
    });
  });

  // ============================================
  // SPELLING PRACTICE XP CALCULATIONS (Phase 37)
  // ============================================
  describe('calculatePracticeXp - spelling', () => {
    it('should calculate basic spelling XP (5 words)', () => {
      const session: PracticeSessionXp = {
        type: 'spelling',
        sessionData: {
          wordsSpelled: 5,
        },
      };

      const result = calculatePracticeXp(session);

      // 5 words * 20 = 100 + 20 daily = 120 XP
      expect(result.totalXp).toBe(120);
      expect(result.breakdown.spellingWords).toBe(100);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should apply streak bonus (3 word streak)', () => {
      const session: PracticeSessionXp = {
        type: 'spelling',
        sessionData: {
          wordsSpelled: 5,
          spellingStreak: 3,
        },
      };

      const result = calculatePracticeXp(session);

      // 5 words * 20 = 100 + (3 streak * 5) = 15 + 20 daily = 135 XP
      expect(result.totalXp).toBe(135);
      expect(result.breakdown.spellingWords).toBe(100);
      expect(result.breakdown.streakBonus).toBe(15);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should apply 90% accuracy bonus', () => {
      const session: PracticeSessionXp = {
        type: 'spelling',
        sessionData: {
          wordsSpelled: 9,
          wordsAttempted: 10, // 90% accuracy
        },
      };

      const result = calculatePracticeXp(session);

      // 9 words * 20 = 180 + 50 accuracy + 20 daily = 250 XP
      expect(result.totalXp).toBe(250);
      expect(result.breakdown.spellingWords).toBe(180);
      expect(result.breakdown.accuracyBonus).toBe(50);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should combine streak and accuracy bonuses', () => {
      const session: PracticeSessionXp = {
        type: 'spelling',
        sessionData: {
          wordsSpelled: 8,
          wordsAttempted: 10, // 80% accuracy
          spellingStreak: 5,
        },
      };

      const result = calculatePracticeXp(session);

      // 8 words * 20 = 160 + (5 streak * 5) = 25 + 30 accuracy (80%+) + 20 daily = 235 XP
      expect(result.totalXp).toBe(235);
      expect(result.breakdown.spellingWords).toBe(160);
      expect(result.breakdown.streakBonus).toBe(25);
      expect(result.breakdown.accuracyBonus).toBe(30);
      expect(result.breakdown.dailyPractice).toBe(20);
    });
  });

  // ============================================
  // BLITZ PRACTICE XP CALCULATIONS (Phase 37)
  // ============================================
  describe('calculatePracticeXp - blitz', () => {
    it('should calculate basic blitz XP (10 words found)', () => {
      const session: PracticeSessionXp = {
        type: 'blitz',
        sessionData: {
          blitzWordsFound: 10,
        },
      };

      const result = calculatePracticeXp(session);

      // 10 words * 10 = 100 + 40 completion + 20 daily = 160 XP
      expect(result.totalXp).toBe(160);
      expect(result.breakdown.blitzWords).toBe(100);
      expect(result.breakdown.blitzCompletion).toBe(40);
      expect(result.breakdown.dailyPractice).toBe(20);
    });

    it('should apply combo bonus (5 max combo)', () => {
      const session: PracticeSessionXp = {
        type: 'blitz',
        sessionData: {
          blitzWordsFound: 15,
          blitzMaxCombo: 5,
        },
      };

      const result = calculatePracticeXp(session);

      // Uncapped: 15*10 + 5*3 + 40 = 205 blitz portion. Capped to 180 + 20 daily = 200.
      expect(result.totalXp).toBe(200);
      expect(result.breakdown.blitzWords).toBe(150);
      expect(result.breakdown.comboBonus).toBe(15);
      expect(result.breakdown.blitzCompletion).toBe(40);
      expect(result.breakdown.dailyPractice).toBe(20);
      expect(result.breakdown.blitzCapApplied).toBe(25);
    });

    it('should handle high word count and combo (cap enforced)', () => {
      const session: PracticeSessionXp = {
        type: 'blitz',
        sessionData: {
          blitzWordsFound: 25,
          blitzMaxCombo: 10,
        },
      };

      const result = calculatePracticeXp(session);

      // Uncapped: 25*10 + 10*3 + 40 = 320 blitz portion. Capped to 180 + 20 daily = 200.
      expect(result.totalXp).toBe(200);
      expect(result.breakdown.blitzWords).toBe(250);
      expect(result.breakdown.comboBonus).toBe(30);
      expect(result.breakdown.blitzCompletion).toBe(40);
      expect(result.breakdown.dailyPractice).toBe(20);
      expect(result.breakdown.blitzCapApplied).toBe(140);
    });

    it('should NOT apply cap when under BLITZ_MAX_SESSION_XP', () => {
      const session: PracticeSessionXp = {
        type: 'blitz',
        sessionData: {
          blitzWordsFound: 12,
          blitzMaxCombo: 3,
        },
      };

      const result = calculatePracticeXp(session);

      // 12*10 + 3*3 + 40 = 169 blitz (< 180), + 20 daily = 189. No cap flag.
      expect(result.totalXp).toBe(189);
      expect(result.breakdown.blitzCapApplied).toBeUndefined();
    });
  });

  // ============================================
  // MASTERY MESSAGES FOR NEW MODES (Phase 37)
  // ============================================
  describe('getMasteryMessage - new modes', () => {
    it('should generate matching perfect message', () => {
      const session: PracticeSessionXp = {
        type: 'matching',
        sessionData: {
          pairsMatched: 10,
          totalPairs: 10,
        },
      };

      const message = getMasteryMessage(session);

      expect(message).toBe('Perfect matching!');
    });

    it('should generate matching partial message', () => {
      const session: PracticeSessionXp = {
        type: 'matching',
        sessionData: {
          pairsMatched: 7,
          totalPairs: 10,
        },
      };

      const message = getMasteryMessage(session);

      expect(message).toBe('You matched 7 pairs!');
    });

    it('should generate spelling message', () => {
      const session: PracticeSessionXp = {
        type: 'spelling',
        sessionData: {
          wordsSpelled: 8,
        },
      };

      const message = getMasteryMessage(session);

      expect(message).toBe('You spelled 8 words correctly!');
    });

    it('should generate spelling perfect message', () => {
      const session: PracticeSessionXp = {
        type: 'spelling',
        sessionData: {
          wordsSpelled: 10,
          spellingStreak: 10,
        },
      };

      const message = getMasteryMessage(session);

      expect(message).toBe('Perfect spelling!');
    });

    it('should generate blitz message', () => {
      const session: PracticeSessionXp = {
        type: 'blitz',
        sessionData: {
          blitzWordsFound: 15,
        },
      };

      const message = getMasteryMessage(session);

      expect(message).toBe('You found 15 words in 60 seconds!');
    });
  });
});
