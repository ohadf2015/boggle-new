/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useSpeechSynthesis } from '../useSpeechSynthesis';
import * as textToSpeech from '../../lib/speech/textToSpeech';

// Mock the textToSpeech module
jest.mock('../../lib/speech/textToSpeech', () => ({
  speakWord: jest.fn(),
  cancelSpeech: jest.fn(),
  getAvailableVoices: jest.fn(),
}));

const mockSpeakWord = textToSpeech.speakWord as jest.MockedFunction<typeof textToSpeech.speakWord>;
const mockCancelSpeech = textToSpeech.cancelSpeech as jest.MockedFunction<typeof textToSpeech.cancelSpeech>;
const mockGetAvailableVoices = textToSpeech.getAvailableVoices as jest.MockedFunction<typeof textToSpeech.getAvailableVoices>;

beforeEach(() => {
  jest.clearAllMocks();

  // Default: Web Speech API supported
  mockGetAvailableVoices.mockReturnValue([
    { lang: 'en-US', name: 'English Voice', default: true } as SpeechSynthesisVoice,
  ]);

  // Default: speakWord succeeds
  mockSpeakWord.mockResolvedValue(true);
});

describe('useSpeechSynthesis', () => {
  describe('initialization', () => {
    it('should initialize with default state', () => {
      // WHEN
      const { result } = renderHook(() => useSpeechSynthesis());

      // THEN
      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.isSupported).toBe(true);
      expect(typeof result.current.speak).toBe('function');
      expect(typeof result.current.cancel).toBe('function');
    });

    it('should detect when speech synthesis not supported', () => {
      // GIVEN
      mockGetAvailableVoices.mockReturnValue([]);

      // WHEN
      const { result } = renderHook(() => useSpeechSynthesis());

      // THEN
      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('speak', () => {
    it('should call speakWord with word and language', async () => {
      // GIVEN
      const { result } = renderHook(() => useSpeechSynthesis());
      const word = 'hello';
      const lang = 'en-US';

      // WHEN
      await act(async () => {
        await result.current.speak(word, lang);
      });

      // THEN
      expect(mockSpeakWord).toHaveBeenCalledTimes(1);
      expect(mockSpeakWord).toHaveBeenCalledWith(word, lang);
    });

    it('should set isSpeaking to true during speech', async () => {
      // GIVEN
      const { result } = renderHook(() => useSpeechSynthesis());

      // Mock speakWord to delay resolution
      let resolveSpeech: (value: boolean) => void;
      mockSpeakWord.mockImplementation(() => {
        return new Promise((resolve) => {
          resolveSpeech = resolve;
        });
      });

      // WHEN
      act(() => {
        result.current.speak('hello', 'en-US');
      });

      // THEN
      expect(result.current.isSpeaking).toBe(true);

      // Cleanup: resolve the promise
      await act(async () => {
        resolveSpeech(true);
      });
    });

    it('should set isSpeaking to false after speech completes', async () => {
      // GIVEN
      const { result } = renderHook(() => useSpeechSynthesis());

      // WHEN
      await act(async () => {
        await result.current.speak('hello', 'en-US');
      });

      // THEN
      expect(result.current.isSpeaking).toBe(false);
    });

    it('should set isSpeaking to false after speech fails', async () => {
      // GIVEN
      const { result } = renderHook(() => useSpeechSynthesis());
      mockSpeakWord.mockRejectedValue(new Error('Speech failed'));

      // WHEN
      await act(async () => {
        try {
          await result.current.speak('hello', 'en-US');
        } catch {
          // Expected to fail
        }
      });

      // THEN
      expect(result.current.isSpeaking).toBe(false);
    });

    it('should interrupt previous speech when speaking new word', async () => {
      // GIVEN
      const { result } = renderHook(() => useSpeechSynthesis());

      // Mock first speech to take longer
      let resolveFirstSpeech: (value: boolean) => void;
      mockSpeakWord.mockImplementationOnce(() => {
        return new Promise((resolve) => {
          resolveFirstSpeech = resolve;
        });
      });

      // Start first speech
      act(() => {
        result.current.speak('first', 'en-US');
      });

      expect(result.current.isSpeaking).toBe(true);

      // Mock second speech
      mockSpeakWord.mockResolvedValueOnce(true);

      // WHEN - Start second speech before first completes
      await act(async () => {
        await result.current.speak('second', 'en-US');
      });

      // THEN
      expect(mockCancelSpeech).toHaveBeenCalled();
      expect(mockSpeakWord).toHaveBeenCalledWith('second', 'en-US');

      // Cleanup: resolve first speech
      await act(async () => {
        resolveFirstSpeech(true);
      });
    });

    it('should use default language if not provided', async () => {
      // GIVEN
      const { result } = renderHook(() => useSpeechSynthesis('es-ES'));
      const word = 'hola';

      // WHEN
      await act(async () => {
        await result.current.speak(word);
      });

      // THEN
      expect(mockSpeakWord).toHaveBeenCalledWith(word, 'es-ES');
    });

    it('should override default language when provided', async () => {
      // GIVEN
      const { result } = renderHook(() => useSpeechSynthesis('es-ES'));
      const word = 'hello';

      // WHEN
      await act(async () => {
        await result.current.speak(word, 'en-US');
      });

      // THEN
      expect(mockSpeakWord).toHaveBeenCalledWith(word, 'en-US');
    });
  });

  describe('cancel', () => {
    it('should call cancelSpeech', () => {
      // GIVEN
      const { result } = renderHook(() => useSpeechSynthesis());

      // WHEN
      act(() => {
        result.current.cancel();
      });

      // THEN
      expect(mockCancelSpeech).toHaveBeenCalledTimes(1);
    });

    it('should set isSpeaking to false', async () => {
      // GIVEN
      const { result } = renderHook(() => useSpeechSynthesis());

      // Start speaking
      let resolveSpeech: (value: boolean) => void;
      mockSpeakWord.mockImplementation(() => {
        return new Promise((resolve) => {
          resolveSpeech = resolve;
        });
      });

      act(() => {
        result.current.speak('hello', 'en-US');
      });

      expect(result.current.isSpeaking).toBe(true);

      // WHEN - Cancel speech
      act(() => {
        result.current.cancel();
      });

      // THEN
      expect(result.current.isSpeaking).toBe(false);

      // Cleanup
      await act(async () => {
        resolveSpeech(true);
      });
    });
  });

  describe('cleanup on unmount', () => {
    it('should cancel speech on unmount', async () => {
      // GIVEN
      const { result, unmount } = renderHook(() => useSpeechSynthesis());

      // Start speaking
      let resolveSpeech: (value: boolean) => void;
      mockSpeakWord.mockImplementation(() => {
        return new Promise((resolve) => {
          resolveSpeech = resolve;
        });
      });

      act(() => {
        result.current.speak('hello', 'en-US');
      });

      // WHEN
      unmount();

      // THEN
      expect(mockCancelSpeech).toHaveBeenCalled();

      // Cleanup
      await act(async () => {
        resolveSpeech(true);
      });
    });
  });

  describe('isSupported', () => {
    it('should reflect initial voice availability', () => {
      // GIVEN - Start with voices available
      mockGetAvailableVoices.mockReturnValue([
        { lang: 'en-US', name: 'English Voice', default: true } as SpeechSynthesisVoice,
      ]);

      // WHEN
      const { result } = renderHook(() => useSpeechSynthesis());

      // THEN
      expect(result.current.isSupported).toBe(true);
    });

    it('should be false when no voices available', () => {
      // GIVEN - Start with no voices
      mockGetAvailableVoices.mockReturnValue([]);

      // WHEN
      const { result } = renderHook(() => useSpeechSynthesis());

      // THEN
      expect(result.current.isSupported).toBe(false);
    });
  });
});
