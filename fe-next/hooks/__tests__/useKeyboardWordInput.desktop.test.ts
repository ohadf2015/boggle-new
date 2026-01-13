/**
 * Tests for desktop-specific keyboard notification behavior in useKeyboardWordInput
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import { useKeyboardWordInput } from '../useKeyboardWordInput';
import { useIsDesktop } from '../useMediaQuery';
import type { LetterGrid } from '@/types';

// Mock dependencies
jest.mock('react-hot-toast');
jest.mock('../useMediaQuery');

const mockToast = toast as jest.Mocked<typeof toast>;
const mockUseIsDesktop = useIsDesktop as jest.MockedFunction<typeof useIsDesktop>;

describe('useKeyboardWordInput - Desktop notifications', () => {
  const mockGrid: LetterGrid = [
    ['ש', 'ל', 'ו'],
    ['ם', 'ה', 'א'],
    ['ב', 'ר', 'כ'],
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.error = jest.fn();
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
});
