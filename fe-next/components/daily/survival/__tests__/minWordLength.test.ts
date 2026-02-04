/**
 * Tests for Word Hunt minimum word length enforcement
 *
 * Bug Report:
 * 1. Word Hunt allows 2-letter words for non-Japanese languages
 * 2. Minimum word length should be 4 for en/he/sv/es, and 2 for Japanese
 *
 * Expected Behavior:
 * - For English/Hebrew/Swedish/Spanish: Reject words < 4 letters
 * - For Japanese: Allow 2+ letter words (kanji compounds are shorter)
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSurvivalGameLogic } from '../useSurvivalGameLogic';
import { MIN_ANSWER_LENGTH } from '@/shared/constants/gameConstants';

// Mock contexts and hooks
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    isAuthenticated: false,
  }),
}));
jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: jest.fn(),
    setGameActive: jest.fn(),
  }),
}));
jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    currentTrack: null,
    volume: 0.5,
    isMuted: false,
    isPlaying: false,
    audioUnlocked: false,
    playTrack: jest.fn(),
    stopMusic: jest.fn(),
    fadeToTrack: jest.fn(),
    setVolume: jest.fn(),
    toggleMute: jest.fn(),
    unlockAudio: jest.fn(),
    preloadMusicTrack: jest.fn(),
    TRACKS: {
      LOBBY: 'lobby',
      BEFORE_GAME: 'beforeGame',
      IN_GAME: 'inGame',
      ALMOST_OUT_OF_TIME: 'almostOutOfTime',
      BOSSA_ARCADE: 'bossaArcade',
      BOSSA: 'bossa',
    },
  }),
}));
jest.mock('@/hooks/useGameMusic', () => ({
  useGameMusic: () => ({
    resetUrgentMusic: jest.fn(),
  }),
}));

// Mock fetch for dictionary validation
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ isValid: true }),
  })
) as jest.Mock;

describe('Word Hunt Minimum Word Length', () => {
  // Grid where "AB" can be formed but "ABCD" can too
  const testGrid = [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ];

  const createProps = (language: 'en' | 'he' | 'sv' | 'ja' | 'es') => ({
    grid: testGrid,
    puzzleNumber: 1,
    language,
    targetWord: 'TEST',
    onComplete: jest.fn(),
    t: (key: string) => key,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MIN_ANSWER_LENGTH constants', () => {
    it('should require 4+ letters for English', () => {
      expect(MIN_ANSWER_LENGTH.en).toBeGreaterThanOrEqual(4);
    });

    it('should require 4+ letters for Hebrew', () => {
      expect(MIN_ANSWER_LENGTH.he).toBeGreaterThanOrEqual(4);
    });

    it('should require 4+ letters for Swedish', () => {
      expect(MIN_ANSWER_LENGTH.sv).toBeGreaterThanOrEqual(4);
    });

    it('should require 4+ letters for Spanish', () => {
      expect(MIN_ANSWER_LENGTH.es).toBeGreaterThanOrEqual(4);
    });

    it('should allow 2+ letters for Japanese', () => {
      expect(MIN_ANSWER_LENGTH.ja).toBe(2);
    });
  });

  describe('handleWordDiscovery minimum length enforcement', () => {
    it('should reject 2-letter English words with too-short toast', async () => {
      const { result } = renderHook(() =>
        useSurvivalGameLogic(createProps('en'))
      );

      act(() => {
        // Try to submit a 2-letter word
        result.current[1].handleWordSubmit('AB');
      });

      // Wait for async operations
      await waitFor(() => {
        // Should show too-short toast (not valid-word)
        expect(result.current[0].feedbackType).toBe('too-short');
      });

      // Word should NOT be in discovered words
      expect(result.current[0].discoveredWords).toHaveLength(0);
    });

    it('should reject 3-letter English words with too-short toast', async () => {
      const { result } = renderHook(() =>
        useSurvivalGameLogic(createProps('en'))
      );

      act(() => {
        // Try to submit a 3-letter word
        result.current[1].handleWordSubmit('ABC');
      });

      await waitFor(() => {
        // Should show too-short toast for 3-letter words in English
        expect(result.current[0].feedbackType).toBe('too-short');
      });

      expect(result.current[0].discoveredWords).toHaveLength(0);
    });

    it('should accept 4-letter English words', async () => {
      const { result } = renderHook(() =>
        useSurvivalGameLogic(createProps('en'))
      );

      act(() => {
        // Submit a 4-letter word that's on the board
        result.current[1].handleWordSubmit('ABCD');
      });

      await waitFor(() => {
        // Should accept the word (if it's in dictionary and on board)
        // The word might be rejected for "not in dictionary" but NOT for "too-short"
        expect(result.current[0].feedbackType).not.toBe('too-short');
      });
    });

    it('should accept 2-letter Japanese words', async () => {
      // Create a grid with Japanese characters
      const japaneseGrid = [
        ['ゆ', 'れ', 'あ', 'い'],
        ['う', 'え', 'お', 'か'],
        ['き', 'く', 'け', 'こ'],
        ['さ', 'し', 'す', 'せ'],
      ];

      const props = {
        ...createProps('ja'),
        grid: japaneseGrid,
        targetWord: 'テスト',
      };

      const { result } = renderHook(() => useSurvivalGameLogic(props));

      act(() => {
        // Submit a 2-letter Japanese word
        result.current[1].handleWordSubmit('ゆれ');
      });

      await waitFor(() => {
        // Should NOT show too-short for Japanese 2-letter words
        expect(result.current[0].feedbackType).not.toBe('too-short');
      });
    });
  });
});
