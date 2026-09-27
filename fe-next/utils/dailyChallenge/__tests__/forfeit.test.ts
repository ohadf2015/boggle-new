/**
 * Daily Word Hunt forfeit-marker tests
 *
 * A forfeit marker records that the player bailed out of today's Word Hunt
 * mid-game. It gates re-entry behind a rewarded ad (native) without saving a
 * result. One marker per language per UTC day.
 */

import {
  markWordHuntForfeitToday,
  hasWordHuntForfeitToday,
  clearWordHuntForfeitToday,
} from '../storage';
import { WORD_HUNT_FORFEIT_KEY } from '../constants';
import type { Language } from '@/types';

vi.mock('@/utils/storageHelpers', () => ({
  getJsonFromLocalStorage: vi.fn(),
  saveJsonToLocalStorage: vi.fn(),
  removeFromLocalStorage: vi.fn(),
  getFromLocalStorage: vi.fn(),
}));

vi.mock('../dateUtils', () => ({
  getDailyChallengeDate: vi.fn(() => '2025-01-20'),
}));

vi.mock('../streaks', () => ({
  updateDailyStreak: vi.fn(),
}));

import {
  saveJsonToLocalStorage,
  removeFromLocalStorage,
  getFromLocalStorage,
} from '@/utils/storageHelpers';

const EN = 'en' as Language;
const expectedKey = `${WORD_HUNT_FORFEIT_KEY}_en_2025-01-20`;

describe('word hunt forfeit marker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('markWordHuntForfeitToday', () => {
    it('writes a per-language, per-day marker key', () => {
      // WHEN the player forfeits today's run
      markWordHuntForfeitToday(EN);

      // THEN a marker is persisted under the language+date scoped key
      expect(saveJsonToLocalStorage).toHaveBeenCalledWith(expectedKey, true);
    });
  });

  describe('hasWordHuntForfeitToday', () => {
    it('returns true when a marker exists for today', () => {
      // GIVEN a marker is present
      (getFromLocalStorage as unknown as ReturnType<typeof vi.fn>).mockReturnValue('true');

      // THEN the check reports a forfeit
      expect(hasWordHuntForfeitToday(EN)).toBe(true);
      expect(getFromLocalStorage).toHaveBeenCalledWith(expectedKey);
    });

    it('returns false when no marker exists', () => {
      // GIVEN no marker
      (getFromLocalStorage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);

      // THEN no forfeit is reported
      expect(hasWordHuntForfeitToday(EN)).toBe(false);
    });
  });

  describe('clearWordHuntForfeitToday', () => {
    it('removes the marker for today', () => {
      // WHEN the forfeit is consumed (ad watched / replay granted)
      clearWordHuntForfeitToday(EN);

      // THEN the marker key is removed
      expect(removeFromLocalStorage).toHaveBeenCalledWith(expectedKey);
    });
  });
});
