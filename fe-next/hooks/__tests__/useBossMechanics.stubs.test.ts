/**
 * useBossMechanics — Differentiated Mechanic Tests
 *
 * Each boss mechanic tests a genuinely different word property:
 * - hiveMind (W2 Spelling Bee): double letters (BOOK, TEETH, LETTER)
 * - idiomBattle (W4 Captain Metaphor): same start & end letter (KAYAK, ROAR)
 * - assemblyLine (W5 Baron Buildaword): common prefix/suffix (UN-, RE-, -ING, -TION)
 * - babelSummit (W9 Linguist Sage): high unique-letter ratio (>=80%)
 */

import { renderHook } from '@testing-library/react';
import { useBossMechanics } from '../useBossMechanics';

const WORLD_2 = 2;
const WORLD_4 = 4;
const WORLD_5 = 5;
const WORLD_9 = 9;

// ==============================================
// HIVE MIND (World 2 — Double Letters)
// ==============================================

describe('useBossMechanics - hiveMind (World 2 Spelling Bee)', () => {
  it('should load spellingBee boss with hiveMind twist', () => {
    const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_2 }));
    expect(result.current.boss?.id).toBe('spellingBee');
    expect(result.current.boss?.twistMechanic.type).toBe('hiveMind');
    expect(result.current.isActive).toBe(true);
  });

  describe('double-letter detection', () => {
    it('should trigger for BOOK (OO)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_2 }));
      const r = result.current.checkWord('BOOK');
      expect(r.meetsRequirement).toBe(true);
      expect(r.scoreMultiplier).toBe(2.0);
    });

    it('should trigger for TEETH (EE)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_2 }));
      expect(result.current.checkWord('TEETH').meetsRequirement).toBe(true);
    });

    it('should trigger for LETTER (TT)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_2 }));
      expect(result.current.checkWord('LETTER').meetsRequirement).toBe(true);
    });

    it('should trigger for BUZZING (ZZ)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_2 }));
      expect(result.current.checkWord('BUZZING').meetsRequirement).toBe(true);
    });

    it('should NOT trigger for WORD (no doubles)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_2 }));
      const r = result.current.checkWord('WORD');
      expect(r.meetsRequirement).toBe(false);
      expect(r.scoreMultiplier).toBe(1.0);
    });

    it('should NOT trigger for ABCDE (all unique)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_2 }));
      expect(result.current.checkWord('ABCDE').meetsRequirement).toBe(false);
    });

    it('should NOT trigger for CAT', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_2 }));
      expect(result.current.checkWord('CAT').meetsRequirement).toBe(false);
    });

    it('should handle empty string', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_2 }));
      expect(result.current.checkWord('').meetsRequirement).toBe(false);
    });
  });

  describe('case insensitivity', () => {
    it('should detect book (lowercase)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_2 }));
      expect(result.current.checkWord('book').meetsRequirement).toBe(true);
    });

    it('should detect Book (mixed case)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_2 }));
      expect(result.current.checkWord('Book').meetsRequirement).toBe(true);
    });
  });

  describe('feedback and effects', () => {
    it('should trigger taunt and effect for matches', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_2 }));
      const r = result.current.checkWord('BOOK');
      expect(r.triggerTaunt).toBe('onMechanic');
      expect(r.triggerEffect).toBe(true);
      expect(r.feedbackKey).toBe('adventure.bosses.common.doubleLetterFound');
    });

    it('should NOT trigger taunt for non-matches', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_2 }));
      const r = result.current.checkWord('WORD');
      expect(r.triggerTaunt).toBeUndefined();
      expect(r.triggerEffect).toBe(false);
    });
  });
});

// ==============================================
// IDIOM BATTLE (World 4 — Same Start & End Letter)
// ==============================================

describe('useBossMechanics - idiomBattle (World 4 Captain Metaphor)', () => {
  it('should load captainMetaphor boss with idiomBattle twist', () => {
    const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_4 }));
    expect(result.current.boss?.id).toBe('captainMetaphor');
    expect(result.current.boss?.twistMechanic.type).toBe('idiomBattle');
    expect(result.current.isActive).toBe(true);
  });

  describe('same start & end letter detection', () => {
    it('should trigger for KAYAK (K...K)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_4 }));
      const r = result.current.checkWord('KAYAK');
      expect(r.meetsRequirement).toBe(true);
      expect(r.scoreMultiplier).toBe(2.5);
    });

    it('should trigger for ROAR (R...R)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_4 }));
      expect(result.current.checkWord('ROAR').meetsRequirement).toBe(true);
    });

    it('should trigger for STATS (S...S)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_4 }));
      expect(result.current.checkWord('STATS').meetsRequirement).toBe(true);
    });

    it('should trigger for COMIC (C...C)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_4 }));
      expect(result.current.checkWord('COMIC').meetsRequirement).toBe(true);
    });

    it('should trigger for TREAT (T...T)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_4 }));
      expect(result.current.checkWord('TREAT').meetsRequirement).toBe(true);
    });

    it('should NOT trigger for WORD (W...D)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_4 }));
      const r = result.current.checkWord('WORD');
      expect(r.meetsRequirement).toBe(false);
      expect(r.scoreMultiplier).toBe(1.0);
    });

    it('should NOT trigger for HOUSE (H...E)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_4 }));
      expect(result.current.checkWord('HOUSE').meetsRequirement).toBe(false);
    });

    it('should NOT trigger for single letter', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_4 }));
      // Single char trivially matches start==end, but min length should prevent it
      expect(result.current.checkWord('A').meetsRequirement).toBe(false);
    });

    it('should NOT trigger for 2-letter words (too short)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_4 }));
      expect(result.current.checkWord('AA').meetsRequirement).toBe(false);
    });

    it('should handle empty string', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_4 }));
      expect(result.current.checkWord('').meetsRequirement).toBe(false);
    });
  });

  describe('case insensitivity', () => {
    it('should detect kayak (lowercase)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_4 }));
      expect(result.current.checkWord('kayak').meetsRequirement).toBe(true);
    });

    it('should detect Kayak (mixed case)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_4 }));
      expect(result.current.checkWord('Kayak').meetsRequirement).toBe(true);
    });
  });

  describe('feedback and effects', () => {
    it('should trigger taunt and effect for matches', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_4 }));
      const r = result.current.checkWord('ROAR');
      expect(r.triggerTaunt).toBe('onMechanic');
      expect(r.triggerEffect).toBe(true);
      expect(r.feedbackKey).toBe('adventure.bosses.common.fullCircleWord');
    });

    it('should NOT trigger taunt for non-matches', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_4 }));
      const r = result.current.checkWord('HOUSE');
      expect(r.triggerTaunt).toBeUndefined();
      expect(r.triggerEffect).toBe(false);
    });
  });
});

// ==============================================
// ASSEMBLY LINE (World 5 — Common Prefix/Suffix)
// ==============================================

describe('useBossMechanics - assemblyLine (World 5 Baron Buildaword)', () => {
  it('should load baronBuildaword boss with assemblyLine twist', () => {
    const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
    expect(result.current.boss?.id).toBe('baronBuildaword');
    expect(result.current.boss?.twistMechanic.type).toBe('assemblyLine');
    expect(result.current.isActive).toBe(true);
  });

  describe('prefix detection', () => {
    it('should trigger for UNDO (UN- prefix)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      const r = result.current.checkWord('UNDO');
      expect(r.meetsRequirement).toBe(true);
      expect(r.scoreMultiplier).toBe(3.0);
    });

    it('should trigger for REDO (RE- prefix)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('REDO').meetsRequirement).toBe(true);
    });

    it('should trigger for PREVIEW (PRE- prefix)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('PREVIEW').meetsRequirement).toBe(true);
    });

    it('should trigger for OUTDOOR (OUT- prefix)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('OUTDOOR').meetsRequirement).toBe(true);
    });

    it('should trigger for OVERFLOW (OVER- prefix)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('OVERFLOW').meetsRequirement).toBe(true);
    });

    it('should trigger for DISABLE (DIS- prefix)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('DISABLE').meetsRequirement).toBe(true);
    });
  });

  describe('suffix detection', () => {
    it('should trigger for RUNNING (-ING suffix)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('RUNNING').meetsRequirement).toBe(true);
    });

    it('should trigger for NATION (-TION suffix)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('NATION').meetsRequirement).toBe(true);
    });

    it('should trigger for KINDNESS (-NESS suffix)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('KINDNESS').meetsRequirement).toBe(true);
    });

    it('should trigger for PAYMENT (-MENT suffix)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('PAYMENT').meetsRequirement).toBe(true);
    });

    it('should trigger for CAPABLE (-ABLE suffix)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('CAPABLE').meetsRequirement).toBe(true);
    });

    it('should trigger for QUICKLY (-LY suffix)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('QUICKLY').meetsRequirement).toBe(true);
    });

    it('should trigger for CARELESS (-LESS suffix)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('CARELESS').meetsRequirement).toBe(true);
    });

    it('should trigger for HOPEFUL (-FUL suffix)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('HOPEFUL').meetsRequirement).toBe(true);
    });
  });

  describe('no prefix or suffix', () => {
    it('should NOT trigger for WORD', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      const r = result.current.checkWord('WORD');
      expect(r.meetsRequirement).toBe(false);
      expect(r.scoreMultiplier).toBe(1.0);
    });

    it('should NOT trigger for LAMP', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('LAMP').meetsRequirement).toBe(false);
    });

    it('should NOT trigger for BRICK', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('BRICK').meetsRequirement).toBe(false);
    });

    it('should handle empty string', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('').meetsRequirement).toBe(false);
    });
  });

  describe('case insensitivity', () => {
    it('should detect undo (lowercase)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('undo').meetsRequirement).toBe(true);
    });

    it('should detect Running (mixed case)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      expect(result.current.checkWord('Running').meetsRequirement).toBe(true);
    });
  });

  describe('feedback and effects', () => {
    it('should show compoundDetected feedback for matches', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      const r = result.current.checkWord('UNDO');
      expect(r.triggerTaunt).toBe('onMechanic');
      expect(r.triggerEffect).toBe(true);
      expect(r.feedbackKey).toBe('adventure.bosses.common.compoundDetected');
    });

    it('should NOT trigger taunt for non-matches', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_5 }));
      const r = result.current.checkWord('LAMP');
      expect(r.triggerTaunt).toBeUndefined();
      expect(r.triggerEffect).toBe(false);
    });
  });
});

// ==============================================
// BABEL SUMMIT (World 9 — Unique Letter Ratio)
// ==============================================

describe('useBossMechanics - babelSummit (World 9 Linguist Sage)', () => {
  it('should load linguistSage boss with babelSummit twist', () => {
    const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
    expect(result.current.boss?.id).toBe('linguistSage');
    expect(result.current.boss?.twistMechanic.type).toBe('babelSummit');
    expect(result.current.isActive).toBe(true);
  });

  describe('high unique-letter ratio (>=80%, min 4 letters)', () => {
    it('should trigger for WORLD (5 unique / 5 total = 100%)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      const r = result.current.checkWord('WORLD');
      expect(r.meetsRequirement).toBe(true);
      expect(r.scoreMultiplier).toBe(3.0);
    });

    it('should trigger for FRENCH (6 unique / 6 total = 100%)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      expect(result.current.checkWord('FRENCH').meetsRequirement).toBe(true);
    });

    it('should trigger for HYPE (4 unique / 4 total = 100%)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      expect(result.current.checkWord('HYPE').meetsRequirement).toBe(true);
    });

    it('should trigger for STUDY (5 unique / 5 total = 100%)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      expect(result.current.checkWord('STUDY').meetsRequirement).toBe(true);
    });

    it('should trigger for LANKY (5 unique / 5 total = 100%)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      expect(result.current.checkWord('LANKY').meetsRequirement).toBe(true);
    });
  });

  describe('low unique-letter ratio rejection', () => {
    it('should NOT trigger for TEETH (4 unique / 5 total = 80% but has TT+EE)', () => {
      // TEETH = T,E,E,T,H → 3 unique / 5 = 60%
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      expect(result.current.checkWord('TEETH').meetsRequirement).toBe(false);
    });

    it('should NOT trigger for BANANA (3 unique / 6 total = 50%)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      const r = result.current.checkWord('BANANA');
      expect(r.meetsRequirement).toBe(false);
    });

    it('should NOT trigger for ASSESS (3 unique / 6 total = 50%)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      expect(result.current.checkWord('ASSESS').meetsRequirement).toBe(false);
    });

    it('should NOT trigger for LETTER (4 unique / 6 total = 67%)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      expect(result.current.checkWord('LETTER').meetsRequirement).toBe(false);
    });
  });

  describe('minimum length requirement', () => {
    it('should NOT trigger for CAT (too short, 3 letters)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      expect(result.current.checkWord('CAT').meetsRequirement).toBe(false);
    });

    it('should NOT trigger for IT (too short)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      expect(result.current.checkWord('IT').meetsRequirement).toBe(false);
    });

    it('should handle empty string', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      expect(result.current.checkWord('').meetsRequirement).toBe(false);
    });
  });

  describe('loanword fallback multiplier for non-matches', () => {
    it('should give 1.5x for words that dont meet requirement', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      const r = result.current.checkWord('BANANA');
      expect(r.meetsRequirement).toBe(false);
      expect(r.scoreMultiplier).toBe(1.5);
    });

    it('should give 1.5x even for very short words', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      expect(result.current.checkWord('IT').scoreMultiplier).toBe(1.5);
    });
  });

  describe('case insensitivity', () => {
    it('should detect world (lowercase)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      expect(result.current.checkWord('world').meetsRequirement).toBe(true);
    });

    it('should detect World (mixed case)', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      expect(result.current.checkWord('World').meetsRequirement).toBe(true);
    });
  });

  describe('feedback and effects', () => {
    it('should show diverseWord feedback for matches', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      const r = result.current.checkWord('WORLD');
      expect(r.triggerTaunt).toBe('onMechanic');
      expect(r.triggerEffect).toBe(true);
      expect(r.feedbackKey).toBe('adventure.bosses.common.diverseWord');
    });

    it('should NOT trigger taunt for non-matches', () => {
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_9 }));
      const r = result.current.checkWord('BANANA');
      expect(r.triggerTaunt).toBeUndefined();
      expect(r.triggerEffect).toBe(false);
    });
  });
});
