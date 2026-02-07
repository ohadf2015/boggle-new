/**
 * Tests for Word Hunt minimum word length enforcement
 *
 * Two distinct minimums:
 * 1. Target word: 4+ letters (except Japanese 2+) - enforced during puzzle generation
 * 2. Discovery words: 2+ letters for ALL languages - players can find short words
 *
 * Expected Behavior:
 * - For all languages: Accept 2+ letter discovered words
 * - Target word generation enforces 4+ (except Japanese) separately
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSurvivalGameLogic } from '../useSurvivalGameLogic';
import { MIN_ANSWER_LENGTH, MIN_DISCOVERY_WORD_LENGTH } from '@/shared/constants/gameConstants';

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
  // Grid where short words can be formed
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

  describe('Constants', () => {
    it('should have target word minimum of 4 for non-Japanese', () => {
      expect(MIN_ANSWER_LENGTH.en).toBeGreaterThanOrEqual(4);
      expect(MIN_ANSWER_LENGTH.he).toBeGreaterThanOrEqual(4);
      expect(MIN_ANSWER_LENGTH.sv).toBeGreaterThanOrEqual(4);
      expect(MIN_ANSWER_LENGTH.es).toBeGreaterThanOrEqual(4);
    });

    it('should have target word minimum of 2 for Japanese', () => {
      expect(MIN_ANSWER_LENGTH.ja).toBe(2);
    });

    it('should have discovery word minimum of 2', () => {
      expect(MIN_DISCOVERY_WORD_LENGTH).toBe(2);
    });
  });

  describe('Discovery word minimum enforcement', () => {
    it('should reject 1-letter words with too-short toast', async () => {
      const { result } = renderHook(() =>
        useSurvivalGameLogic(createProps('en'))
      );

      act(() => {
        result.current[1].handleWordSubmit('A');
      });

      await waitFor(() => {
        expect(result.current[0].feedbackType).toBe('too-short');
      });

      expect(result.current[0].discoveredWords).toHaveLength(0);
    });

    it('should NOT reject 2-letter English words as too-short', async () => {
      const { result } = renderHook(() =>
        useSurvivalGameLogic(createProps('en'))
      );

      act(() => {
        // Submit a 2-letter word - should NOT be rejected as too-short
        // (may be rejected for other reasons like not-on-board or not-in-dictionary)
        result.current[1].handleWordSubmit('AB');
      });

      await waitFor(() => {
        // Should NOT show too-short toast for 2-letter words
        expect(result.current[0].feedbackType).not.toBe('too-short');
      });
    });

    it('should NOT reject 3-letter English words as too-short', async () => {
      const { result } = renderHook(() =>
        useSurvivalGameLogic(createProps('en'))
      );

      act(() => {
        result.current[1].handleWordSubmit('ABC');
      });

      await waitFor(() => {
        // Should NOT show too-short toast for 3-letter words
        expect(result.current[0].feedbackType).not.toBe('too-short');
      });
    });

    it('should accept 4-letter English words (not too-short)', async () => {
      const { result } = renderHook(() =>
        useSurvivalGameLogic(createProps('en'))
      );

      act(() => {
        result.current[1].handleWordSubmit('ABCD');
      });

      await waitFor(() => {
        expect(result.current[0].feedbackType).not.toBe('too-short');
      });
    });

    it('should accept 2-letter Japanese words', async () => {
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
        result.current[1].handleWordSubmit('ゆれ');
      });

      await waitFor(() => {
        expect(result.current[0].feedbackType).not.toBe('too-short');
      });
    });
  });
});
