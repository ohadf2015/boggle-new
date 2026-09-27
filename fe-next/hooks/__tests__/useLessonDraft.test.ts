/**
 * useLessonDraft Hook Tests
 *
 * Tests for lesson draft auto-save to localStorage
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLessonDraft, type LessonDraft } from '../useLessonDraft';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useLessonDraft', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should return null draft when no saved draft exists', () => {
      const { result } = renderHook(() => useLessonDraft());

      expect(result.current.draft).toBeNull();
      expect(result.current.hasDraft).toBe(false);
    });

    it('should load saved draft from localStorage', () => {
      const savedDraft: LessonDraft = {
        name: 'Test Lesson',
        description: 'Test description',
        language: 'en',
        classroomId: '',
        words: [{ word: 'test', canIntegrate: true, definition: '' }],
        savedAt: Date.now(),
      };
      mockLocalStorage.setItem('lexiclash_lesson_draft', JSON.stringify(savedDraft));

      const { result } = renderHook(() => useLessonDraft());

      expect(result.current.draft).toEqual(savedDraft);
      expect(result.current.hasDraft).toBe(true);
    });

    it('should discard expired drafts (older than 24 hours)', () => {
      const oldDraft: LessonDraft = {
        name: 'Old Lesson',
        description: '',
        language: 'en',
        classroomId: '',
        words: [],
        savedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };
      mockLocalStorage.setItem('lexiclash_lesson_draft', JSON.stringify(oldDraft));

      const { result } = renderHook(() => useLessonDraft());

      expect(result.current.draft).toBeNull();
      expect(result.current.hasDraft).toBe(false);
    });
  });

  describe('saveDraft', () => {
    it('should save draft to localStorage', () => {
      const { result } = renderHook(() => useLessonDraft());

      act(() => {
        result.current.saveDraft({
          name: 'New Lesson',
          description: 'Description',
          language: 'he',
          classroomId: 'classroom-1',
          words: [{ word: 'hello', canIntegrate: true, definition: 'greeting' }],
        });
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      expect(result.current.draft?.name).toBe('New Lesson');
      expect(result.current.hasDraft).toBe(true);
    });

    it('should include savedAt timestamp', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { result } = renderHook(() => useLessonDraft());

      act(() => {
        result.current.saveDraft({
          name: 'Test',
          description: '',
          language: 'en',
          classroomId: '',
          words: [],
        });
      });

      expect(result.current.draft?.savedAt).toBe(now);
    });
  });

  describe('clearDraft', () => {
    it('should remove draft from state and localStorage', () => {
      const savedDraft: LessonDraft = {
        name: 'Test',
        description: '',
        language: 'en',
        classroomId: '',
        words: [],
        savedAt: Date.now(),
      };
      mockLocalStorage.setItem('lexiclash_lesson_draft', JSON.stringify(savedDraft));

      const { result } = renderHook(() => useLessonDraft());

      expect(result.current.hasDraft).toBe(true);

      act(() => {
        result.current.clearDraft();
      });

      expect(result.current.draft).toBeNull();
      expect(result.current.hasDraft).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('restoreDraft', () => {
    it('should return draft data when restoring', () => {
      const savedDraft: LessonDraft = {
        name: 'Restored Lesson',
        description: 'Restored description',
        language: 'sv',
        classroomId: 'class-123',
        words: [{ word: 'word1', canIntegrate: true, definition: '' }],
        savedAt: Date.now(),
      };
      mockLocalStorage.setItem('lexiclash_lesson_draft', JSON.stringify(savedDraft));

      const { result } = renderHook(() => useLessonDraft());

      let restored: LessonDraft | null = null;
      act(() => {
        restored = result.current.restoreDraft();
      });

      expect(restored).toEqual(savedDraft);
    });

    it('should clear draft after restoration', () => {
      const savedDraft: LessonDraft = {
        name: 'Test',
        description: '',
        language: 'en',
        classroomId: '',
        words: [],
        savedAt: Date.now(),
      };
      mockLocalStorage.setItem('lexiclash_lesson_draft', JSON.stringify(savedDraft));

      const { result } = renderHook(() => useLessonDraft());

      act(() => {
        result.current.restoreDraft();
      });

      expect(result.current.draft).toBeNull();
      expect(result.current.hasDraft).toBe(false);
    });
  });

  describe('draftAge', () => {
    it('should return time since draft was saved', () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const savedDraft: LessonDraft = {
        name: 'Test',
        description: '',
        language: 'en',
        classroomId: '',
        words: [],
        savedAt: fiveMinutesAgo,
      };
      mockLocalStorage.setItem('lexiclash_lesson_draft', JSON.stringify(savedDraft));

      const { result } = renderHook(() => useLessonDraft());

      // draftAge should be approximately 5 minutes (300000ms)
      expect(result.current.draftAge).toBeGreaterThanOrEqual(300000);
      expect(result.current.draftAge).toBeLessThan(310000);
    });

    it('should return null when no draft exists', () => {
      const { result } = renderHook(() => useLessonDraft());

      expect(result.current.draftAge).toBeNull();
    });
  });
});
