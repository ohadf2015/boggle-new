/**
 * Tests for desktop-specific keyboard notification behavior in useKeyboardWordInput
 */

import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import { useKeyboardWordInput } from '../useKeyboardWordInput';
import { useIsDesktop } from '../useMediaQuery';
import type { LetterGrid } from '@/types';

// Mock dependencies
vi.mock('react-hot-toast');
vi.mock('../useMediaQuery');
const mockTranslations: Record<string, string> = {
  keyboardLanguageMismatch: 'Please switch to {language} keyboard to match the board language',
  hebrew: 'Hebrew',
  english: 'English',
  swedish: 'Swedish',
  japanese: 'Japanese',
  spanish: 'Spanish',
  'joinView.hebrew': 'Hebrew',
  'joinView.english': 'English',
  'joinView.swedish': 'Swedish',
  'joinView.japanese': 'Japanese',
  'joinView.spanish': 'Spanish',
};
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({
    t: (key: string, params?: Record<string, string>) => {
      let result = mockTranslations[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, v);
        });
      }
      return result;
    },
    language: 'en',
  }),
}));

const mockToast = toast as any;
const mockUseIsDesktop = useIsDesktop as any;

describe('useKeyboardWordInput - Desktop notifications', () => {
  const mockGrid: LetterGrid = [
    ['ש', 'ל', 'ו'],
    ['ם', 'ה', 'א'],
    ['ב', 'ר', 'כ'],
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.error = vi.fn();
  });

  describe('Language mismatch notification', () => {
    it('should show notification when typing English letters on Hebrew board (desktop)', async () => {
      mockUseIsDesktop.mockReturnValue(true);

      const { result } = renderHook(() =>
        useKeyboardWordInput({
          grid: mockGrid,
          language: 'he',
          gameLanguage: 'he',
          enabled: true,
          minWordLength: 2,
        })
      );

      // Simulate typing English letter on Hebrew board
      act(() => {
        const keyEvent = new KeyboardEvent('keydown', { key: 'a' });
        window.dispatchEvent(keyEvent);
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledTimes(1);
        expect(mockToast.error).toHaveBeenCalledWith(
          'Please switch to Hebrew keyboard to match the board language',
          expect.objectContaining({
            duration: 5000,
            position: 'top-center',
            icon: '⌨️',
          })
        );
      });
    });

    it('should NOT show notification when typing correct language letters (desktop)', async () => {
      mockUseIsDesktop.mockReturnValue(true);

      renderHook(() =>
        useKeyboardWordInput({
          grid: mockGrid,
          language: 'he',
          gameLanguage: 'he',
          enabled: true,
          minWordLength: 2,
        })
      );

      // Simulate typing Hebrew letter on Hebrew board
      act(() => {
        const keyEvent = new KeyboardEvent('keydown', { key: 'א' });
        window.dispatchEvent(keyEvent);
      });

      await waitFor(() => {
        expect(mockToast.error).not.toHaveBeenCalled();
      });
    });

    it('should NOT show notification on mobile devices', async () => {
      mockUseIsDesktop.mockReturnValue(false);

      renderHook(() =>
        useKeyboardWordInput({
          grid: mockGrid,
          language: 'he',
          gameLanguage: 'he',
          enabled: true,
          minWordLength: 2,
        })
      );

      // Simulate typing English letter on Hebrew board (mobile)
      act(() => {
        const keyEvent = new KeyboardEvent('keydown', { key: 'a' });
        window.dispatchEvent(keyEvent);
      });

      await waitFor(() => {
        expect(mockToast.error).not.toHaveBeenCalled();
      });
    });

    it('should NOT show notification when gameLanguage is not provided', async () => {
      mockUseIsDesktop.mockReturnValue(true);

      renderHook(() =>
        useKeyboardWordInput({
          grid: mockGrid,
          language: 'he',
          gameLanguage: null,
          enabled: true,
          minWordLength: 2,
        })
      );

      // Simulate typing English letter
      act(() => {
        const keyEvent = new KeyboardEvent('keydown', { key: 'a' });
        window.dispatchEvent(keyEvent);
      });

      await waitFor(() => {
        expect(mockToast.error).not.toHaveBeenCalled();
      });
    });
  });

  describe('Notification debouncing', () => {
    it('should show notification only once per game session', async () => {
      mockUseIsDesktop.mockReturnValue(true);

      renderHook(() =>
        useKeyboardWordInput({
          grid: mockGrid,
          language: 'he',
          gameLanguage: 'he',
          enabled: true,
          minWordLength: 2,
        })
      );

      // Type first English letter - should show notification
      act(() => {
        const keyEvent1 = new KeyboardEvent('keydown', { key: 'a' });
        window.dispatchEvent(keyEvent1);
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledTimes(1);
      });

      // Type second English letter - should NOT show notification again
      act(() => {
        const keyEvent2 = new KeyboardEvent('keydown', { key: 'b' });
        window.dispatchEvent(keyEvent2);
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledTimes(1); // Still only 1 call
      });

      // Type third English letter - should NOT show notification again
      act(() => {
        const keyEvent3 = new KeyboardEvent('keydown', { key: 'c' });
        window.dispatchEvent(keyEvent3);
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledTimes(1); // Still only 1 call
      });
    });

    it('should reset notification flag when grid changes (new game)', async () => {
      mockUseIsDesktop.mockReturnValue(true);

      const newGrid: LetterGrid = [
        ['א', 'ב', 'ג'],
        ['ד', 'ה', 'ו'],
        ['ז', 'ח', 'ט'],
      ];

      const { rerender } = renderHook(
        ({ grid }) =>
          useKeyboardWordInput({
            grid,
            language: 'he',
            gameLanguage: 'he',
            enabled: true,
            minWordLength: 2,
          }),
        { initialProps: { grid: mockGrid } }
      );

      // Type first English letter - should show notification
      act(() => {
        const keyEvent1 = new KeyboardEvent('keydown', { key: 'a' });
        window.dispatchEvent(keyEvent1);
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledTimes(1);
      });

      // Change grid (new game)
      rerender({ grid: newGrid });

      // Type another English letter - should show notification again
      act(() => {
        const keyEvent2 = new KeyboardEvent('keydown', { key: 'b' });
        window.dispatchEvent(keyEvent2);
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledTimes(2); // Notification shown again
      });
    });
  });

  describe('Cross-language scenarios', () => {
    it('should notify when typing Hebrew on English board', async () => {
      mockUseIsDesktop.mockReturnValue(true);

      const englishGrid: LetterGrid = [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
        ['G', 'H', 'I'],
      ];

      renderHook(() =>
        useKeyboardWordInput({
          grid: englishGrid,
          language: 'en',
          gameLanguage: 'en',
          enabled: true,
          minWordLength: 2,
        })
      );

      // Simulate typing Hebrew letter on English board
      act(() => {
        const keyEvent = new KeyboardEvent('keydown', { key: 'א' });
        window.dispatchEvent(keyEvent);
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledTimes(1);
        expect(mockToast.error).toHaveBeenCalledWith(
          'Please switch to English keyboard to match the board language',
          expect.any(Object)
        );
      });
    });

    it('should notify when typing Swedish characters on English board', async () => {
      mockUseIsDesktop.mockReturnValue(true);

      const englishGrid: LetterGrid = [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
        ['G', 'H', 'I'],
      ];

      renderHook(() =>
        useKeyboardWordInput({
          grid: englishGrid,
          language: 'en',
          gameLanguage: 'en',
          enabled: true,
          minWordLength: 2,
        })
      );

      // Simulate typing Swedish letter on English board
      act(() => {
        const keyEvent = new KeyboardEvent('keydown', { key: 'å' });
        window.dispatchEvent(keyEvent);
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledTimes(1);
        expect(mockToast.error).toHaveBeenCalledWith(
          'Please switch to English keyboard to match the board language',
          expect.any(Object)
        );
      });
    });
  });

  describe('disablePathHighlighting (Word Hunt mode)', () => {
    const englishGrid: LetterGrid = [
      ['C', 'A', 'T'],
      ['D', 'O', 'G'],
      ['R', 'U', 'N'],
    ];

    it('should return empty highlightedCells when disablePathHighlighting is true', () => {
      mockUseIsDesktop.mockReturnValue(true);

      const { result } = renderHook(() =>
        useKeyboardWordInput({
          grid: englishGrid,
          language: 'en',
          enabled: true,
          minWordLength: 2,
          disablePathHighlighting: true,
        })
      );

      // Type a word that exists on the grid
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
      });

      // Word should be typed but no highlighting
      expect(result.current.typedWord).toBe('CAT');
      expect(result.current.highlightedCells).toEqual([]);
      expect(result.current.isTypingMode).toBe(true);
    });

    it('should return highlighted cells when disablePathHighlighting is false', () => {
      mockUseIsDesktop.mockReturnValue(true);

      const { result } = renderHook(() =>
        useKeyboardWordInput({
          grid: englishGrid,
          language: 'en',
          enabled: true,
          minWordLength: 2,
          disablePathHighlighting: false,
        })
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
      });

      expect(result.current.typedWord).toBe('CAT');
      expect(result.current.highlightedCells.length).toBeGreaterThan(0);
    });
  });
});
