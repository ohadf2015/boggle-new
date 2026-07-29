/**
 * Tests for Word Hunt minimum/maximum word length enforcement
 *
 * Two distinct minimums:
 * 1. Target word: 5-6 letters (except Japanese 2+) - enforced during puzzle generation
 * 2. Discovery words: 2-8 letters - filters trivial 1-letter entries and absurdly long paths
 *
 * Expected Behavior:
 * - For all languages: Accept 2-8 letter discovered words
 * - Target word generation enforces 5+ (except Japanese) separately
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSurvivalGameLogic } from '../useSurvivalGameLogic';
import { MIN_ANSWER_LENGTH, MIN_DISCOVERY_WORD_LENGTH, MAX_DISCOVERY_WORD_LENGTH } from '@/shared/constants/gameConstants';

// Mock contexts and hooks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    isAuthenticated: false,
  }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));
vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    currentTrack: null,
    volume: 0.5,
    isMuted: false,
    isPlaying: false,
    audioUnlocked: false,
    playTrack: vi.fn(),
    stopMusic: vi.fn(),
    fadeToTrack: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    unlockAudio: vi.fn(),
    preloadMusicTrack: vi.fn(),
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
vi.mock('@/hooks/useGameMusic', () => ({
  useGameMusic: () => ({
    resetUrgentMusic: vi.fn(),
  }),
}));

// Mock fetch for dictionary validation
global.fetch = vi.fn(() =>
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
    onComplete: vi.fn(),
    t: (key: string) => key,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Constants', () => {
    it('should have target word minimum of 5 for non-Japanese', () => {
      expect(MIN_ANSWER_LENGTH.en).toBeGreaterThanOrEqual(5);
      expect(MIN_ANSWER_LENGTH.he).toBeGreaterThanOrEqual(5);
      expect(MIN_ANSWER_LENGTH.sv).toBeGreaterThanOrEqual(5);
      expect(MIN_ANSWER_LENGTH.es).toBeGreaterThanOrEqual(5);
    });

    it('should have target word minimum of 2 for Japanese', () => {
      expect(MIN_ANSWER_LENGTH.ja).toBe(2);
    });

    it('should have discovery word minimum of 2', () => {
      expect(MIN_DISCOVERY_WORD_LENGTH).toBe(2);
    });

    it('should have discovery word maximum of 8', () => {
      expect(MAX_DISCOVERY_WORD_LENGTH).toBe(8);
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

    it('should accept 2-letter English words (MIN_DISCOVERY_WORD_LENGTH is 2)', async () => {
      const { result } = renderHook(() =>
        useSurvivalGameLogic(createProps('en'))
      );

      act(() => {
        result.current[1].handleWordSubmit('AB');
      });

      await waitFor(() => {
        // 2-letter words are valid since MIN_DISCOVERY_WORD_LENGTH=2
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

    it('should accept 3-letter Japanese words', async () => {
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
        result.current[1].handleWordSubmit('ゆれあ');
      });

      await waitFor(() => {
        expect(result.current[0].feedbackType).not.toBe('too-short');
      });
    });
  });
});
