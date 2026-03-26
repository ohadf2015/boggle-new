import { vi, type Mock, } from 'vitest';
/**
 * @jest-environment jsdom
 */

import { speakWord, getAvailableVoices, cancelSpeech } from '../textToSpeech';

// Mock Web Speech API
const mockSpeak = vi.fn();
const mockCancel = vi.fn();
const mockGetVoices = vi.fn();

beforeEach(() => {
  mockSpeak.mockClear();
  mockCancel.mockClear();
  mockGetVoices.mockClear();

  // Default: auto-trigger onend for successful speech
  mockSpeak.mockImplementation((utterance) => {
    setTimeout(() => {
      if (utterance.onend) utterance.onend();
    }, 0);
  });

  // Mock speechSynthesis global
  Object.defineProperty(global, 'speechSynthesis', {
    writable: true,
    configurable: true,
    value: {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: mockGetVoices,
      speaking: false,
      pending: false,
      paused: false,
    },
  });

  // Mock SpeechSynthesisUtterance
  (global as any).SpeechSynthesisUtterance = class {
    text: string;
    lang = '';
    voice = null;
    rate = 1;
    pitch = 1;
    volume = 1;
    onend = null;
    onerror = null;
    onstart = null;

    constructor(text?: string) {
      this.text = text || '';
    }
  };
});

afterEach(() => {
  delete (global as any).speechSynthesis;
  delete (global as any).SpeechSynthesisUtterance;
});

describe('textToSpeech', () => {
  describe('speakWord', () => {
    it('should speak English word using Web Speech API', async () => {
      // GIVEN
      const word = 'hello';
      const lang = 'en-US';
      mockGetVoices.mockReturnValue([
        { lang: 'en-US', name: 'English Voice', default: true },
      ]);

      // WHEN
      const result = await speakWord(word, lang);

      // THEN
      expect(result).toBe(true);
      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.text).toBe(word);
      expect(utterance.lang).toBe(lang);
    });

    it('should select appropriate voice for language', async () => {
      // GIVEN
      const word = 'hello';
      const lang = 'en-US';
      const mockVoice = { lang: 'en-US', name: 'English Voice', default: false };
      mockGetVoices.mockReturnValue([
        { lang: 'es-ES', name: 'Spanish Voice', default: false },
        mockVoice,
        { lang: 'fr-FR', name: 'French Voice', default: false },
      ]);

      // WHEN
      await speakWord(word, lang);

      // THEN
      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.voice).toBe(mockVoice);
    });

    it('should handle language prefix matching (en-US matches en)', async () => {
      // GIVEN
      const word = 'hello';
      const lang = 'en-GB';
      const mockVoice = { lang: 'en-US', name: 'English Voice', default: false };
      mockGetVoices.mockReturnValue([mockVoice]);

      // WHEN
      await speakWord(word, lang);

      // THEN
      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.voice).toBe(mockVoice);
    });

    it('should return false when voice not available for Hebrew', async () => {
      // GIVEN
      const word = 'שלום';
      const lang = 'he-IL';
      mockGetVoices.mockReturnValue([
        { lang: 'en-US', name: 'English Voice', default: true },
        { lang: 'es-ES', name: 'Spanish Voice', default: false },
      ]);

      // WHEN
      const result = await speakWord(word, lang);

      // THEN
      expect(result).toBe(false);
      expect(mockSpeak).not.toHaveBeenCalled();
    });

    it('should cancel previous speech before speaking new word', async () => {
      // GIVEN
      const word = 'hello';
      const lang = 'en-US';
      mockGetVoices.mockReturnValue([
        { lang: 'en-US', name: 'English Voice', default: true },
      ]);

      // Track call order
      const callOrder: string[] = [];
      mockCancel.mockImplementation(() => callOrder.push('cancel'));
      mockSpeak.mockImplementation((utterance) => {
        callOrder.push('speak');
        setTimeout(() => {
          if (utterance.onend) utterance.onend();
        }, 0);
      });

      // WHEN
      await speakWord(word, lang);

      // THEN
      expect(mockCancel).toHaveBeenCalledTimes(1);
      expect(mockSpeak).toHaveBeenCalledTimes(1);
      expect(callOrder).toEqual(['cancel', 'speak']);
    });

    it('should handle speech synthesis not available', async () => {
      // GIVEN
      delete (global as any).speechSynthesis;
      const word = 'hello';
      const lang = 'en-US';

      // WHEN
      const result = await speakWord(word, lang);

      // THEN
      expect(result).toBe(false);
    });

    it('should set rate to 0.9 for more natural pronunciation', async () => {
      // GIVEN
      const word = 'hello';
      const lang = 'en-US';
      mockGetVoices.mockReturnValue([
        { lang: 'en-US', name: 'English Voice', default: true },
      ]);

      // WHEN
      await speakWord(word, lang);

      // THEN
      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.rate).toBe(0.9);
    });

    it('should return Promise that resolves on speech end', async () => {
      // GIVEN
      const word = 'hello';
      const lang = 'en-US';
      mockGetVoices.mockReturnValue([
        { lang: 'en-US', name: 'English Voice', default: true },
      ]);

      // Default mockSpeak already triggers onend

      // WHEN
      const resultPromise = speakWord(word, lang);

      // THEN
      await expect(resultPromise).resolves.toBe(true);
    });

    it('should reject Promise on speech error', async () => {
      // GIVEN
      const word = 'hello';
      const lang = 'en-US';
      mockGetVoices.mockReturnValue([
        { lang: 'en-US', name: 'English Voice', default: true },
      ]);

      mockSpeak.mockImplementation((utterance) => {
        // Simulate speech error
        setTimeout(() => {
          if (utterance.onerror) utterance.onerror(new Event('error'));
        }, 10);
      });

      // WHEN
      const resultPromise = speakWord(word, lang);

      // THEN
      await expect(resultPromise).rejects.toThrow();
    });
  });

  describe('getAvailableVoices', () => {
    it('should return list of available voices', () => {
      // GIVEN
      const mockVoices = [
        { lang: 'en-US', name: 'English Voice', default: true },
        { lang: 'es-ES', name: 'Spanish Voice', default: false },
      ];
      mockGetVoices.mockReturnValue(mockVoices);

      // WHEN
      const voices = getAvailableVoices();

      // THEN
      expect(voices).toEqual(mockVoices);
      expect(mockGetVoices).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when speech synthesis not available', () => {
      // GIVEN
      delete (global as any).speechSynthesis;

      // WHEN
      const voices = getAvailableVoices();

      // THEN
      expect(voices).toEqual([]);
    });
  });

  describe('cancelSpeech', () => {
    it('should cancel current speech', () => {
      // WHEN
      cancelSpeech();

      // THEN
      expect(mockCancel).toHaveBeenCalledTimes(1);
    });

    it('should handle speech synthesis not available', () => {
      // GIVEN
      delete (global as any).speechSynthesis;

      // WHEN
      expect(() => cancelSpeech()).not.toThrow();
    });
  });

  describe('voice filtering', () => {
    it('should prefer exact language match over prefix match', async () => {
      // GIVEN
      const word = 'hello';
      const lang = 'en-GB';
      const exactVoice = { lang: 'en-GB', name: 'British Voice', default: false };
      const prefixVoice = { lang: 'en-US', name: 'American Voice', default: true };
      mockGetVoices.mockReturnValue([prefixVoice, exactVoice]);

      // WHEN
      await speakWord(word, lang);

      // THEN
      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.voice).toBe(exactVoice);
    });

    it('should fallback to prefix match if exact not available', async () => {
      // GIVEN
      const word = 'hello';
      const lang = 'en-GB';
      const prefixVoice = { lang: 'en-US', name: 'American Voice', default: true };
      mockGetVoices.mockReturnValue([prefixVoice]);

      // WHEN
      await speakWord(word, lang);

      // THEN
      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.voice).toBe(prefixVoice);
    });

    it('should be case-insensitive when matching languages', async () => {
      // GIVEN
      const word = 'hello';
      const lang = 'EN-us';
      const mockVoice = { lang: 'en-US', name: 'English Voice', default: true };
      mockGetVoices.mockReturnValue([mockVoice]);

      // WHEN
      await speakWord(word, lang);

      // THEN
      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.voice).toBe(mockVoice);
    });
  });
});
