/**
 * Duel combo scoring — server-side source of truth.
 *
 * The combo bonus is ADDITIVE: a word is worth its base dictionary score PLUS
 * a flat streak bonus. It is never a multiplier, so a long word can never be
 * inflated out of proportion by a fast streak (Class-3 guard: the client only
 * ever displays the streak the server sends, it never recomputes points).
 */

import { describe, it, expect } from 'vitest';
import {
  DUEL_COMBO_WINDOW_MS,
  DUEL_COMBO_BONUS_STEP,
  DUEL_COMBO_MAX_BONUS,
  createDuelComboState,
  advanceDuelCombo,
  breakDuelCombo,
} from '../duelCombo';

describe('duelCombo', () => {
  describe('createDuelComboState', () => {
    it('starts with no streak', () => {
      const state = createDuelComboState();
      expect(state.streak).toBe(0);
      expect(state.lastAcceptedAt).toBe(0);
    });
  });

  describe('advanceDuelCombo', () => {
    it('gives the first word a streak of 1 and zero bonus', () => {
      const state = createDuelComboState();
      const result = advanceDuelCombo(state, 1_000);

      expect(result.streak).toBe(1);
      expect(result.bonus).toBe(0);
      expect(state.streak).toBe(1);
      expect(state.lastAcceptedAt).toBe(1_000);
    });

    it('grows the streak while words land inside the combo window', () => {
      const state = createDuelComboState();
      advanceDuelCombo(state, 1_000);
      const second = advanceDuelCombo(state, 1_000 + DUEL_COMBO_WINDOW_MS - 1);

      expect(second.streak).toBe(2);
      expect(second.bonus).toBe(DUEL_COMBO_BONUS_STEP);
    });

    it('resets the streak to 1 when the window has lapsed', () => {
      const state = createDuelComboState();
      advanceDuelCombo(state, 1_000);
      advanceDuelCombo(state, 2_000);
      const lapsed = advanceDuelCombo(state, 2_000 + DUEL_COMBO_WINDOW_MS + 1);

      expect(lapsed.streak).toBe(1);
      expect(lapsed.bonus).toBe(0);
    });

    it('scales the bonus additively with the streak', () => {
      const state = createDuelComboState();
      const bonuses: number[] = [];
      for (let i = 0; i < 4; i++) {
        bonuses.push(advanceDuelCombo(state, 1_000 + i * 100).bonus);
      }

      expect(bonuses).toEqual([
        0,
        DUEL_COMBO_BONUS_STEP,
        DUEL_COMBO_BONUS_STEP * 2,
        DUEL_COMBO_BONUS_STEP * 3,
      ]);
    });

    it('caps the bonus so a long streak can never run away', () => {
      const state = createDuelComboState();
      let last = { streak: 0, bonus: 0 };
      for (let i = 0; i < 40; i++) {
        last = advanceDuelCombo(state, 1_000 + i * 100);
      }

      expect(last.streak).toBe(40);
      expect(last.bonus).toBe(DUEL_COMBO_MAX_BONUS);
    });
  });

  describe('breakDuelCombo', () => {
    it('drops the streak back to zero so the next word starts over', () => {
      const state = createDuelComboState();
      advanceDuelCombo(state, 1_000);
      advanceDuelCombo(state, 1_100);
      expect(state.streak).toBe(2);

      breakDuelCombo(state);
      expect(state.streak).toBe(0);

      const afterBreak = advanceDuelCombo(state, 1_200);
      expect(afterBreak.streak).toBe(1);
      expect(afterBreak.bonus).toBe(0);
    });
  });
});
