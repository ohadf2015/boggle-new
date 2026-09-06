/**
 * The "Resume Draft?" interstitial must be a mount-time question, not a
 * running state.
 *
 * A live smoke run hit it three times during one continuous editing session,
 * once mid-typing, each time blocking the form. Cause: the 30-second autosave
 * calls `saveDraft`, which sets `draft` and so flips `hasDraft` from false to
 * true; the prompt effect keys on `hasDraft`, so the editor kept re-detecting
 * its OWN save as a draft worth offering to restore.
 *
 * `hasRestorableDraft` answers the question the prompt actually needs: is
 * there work from an EARLIER session to offer back? It is true only for a
 * draft read from storage at mount, and false the moment this session saves,
 * restores, or discards.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLessonDraft, type LessonDraft } from '../useLessonDraft';

const STORAGE_KEY = 'lexiclash_lesson_draft';

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
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

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

const storedDraft = (overrides: Partial<LessonDraft> = {}): LessonDraft => ({
  name: 'Week 3 Vocabulary',
  description: '',
  language: 'en',
  classroomId: '',
  words: [{ word: 'hesitant', canIntegrate: true }],
  savedAt: Date.now() - 60_000,
  ...overrides,
});

const input = (name = 'Week 3 Vocabulary') => ({
  name,
  description: '',
  language: 'en' as const,
  classroomId: '',
  words: [{ word: 'hesitant', canIntegrate: true }],
});

describe('useLessonDraft — hasRestorableDraft', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('is false when storage holds no draft', () => {
    const { result } = renderHook(() => useLessonDraft());
    expect(result.current.hasRestorableDraft).toBe(false);
  });

  it('is true on mount when an earlier session left a draft', () => {
    mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(storedDraft()));
    const { result } = renderHook(() => useLessonDraft());
    expect(result.current.hasRestorableDraft).toBe(true);
    expect(result.current.hasDraft).toBe(true);
  });

  it('does NOT turn true when this session autosaves — the bug', () => {
    const { result } = renderHook(() => useLessonDraft());
    expect(result.current.hasRestorableDraft).toBe(false);

    act(() => result.current.saveDraft(input()));

    // The draft is saved and recoverable on a later mount...
    expect(result.current.hasDraft).toBe(true);
    // ...but this session must never be asked to resume its own work.
    expect(result.current.hasRestorableDraft).toBe(false);
  });

  it('stays false across many autosaves', () => {
    const { result } = renderHook(() => useLessonDraft());
    for (let i = 0; i < 5; i++) {
      act(() => result.current.saveDraft(input(`draft ${i}`)));
      expect(result.current.hasRestorableDraft).toBe(false);
    }
  });

  it('goes false once the earlier draft is restored, and never returns', () => {
    mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(storedDraft()));
    const { result } = renderHook(() => useLessonDraft());
    expect(result.current.hasRestorableDraft).toBe(true);

    act(() => {
      result.current.restoreDraft();
    });
    expect(result.current.hasRestorableDraft).toBe(false);

    // The teacher keeps editing; autosave must not re-ask.
    act(() => result.current.saveDraft(input('edited')));
    expect(result.current.hasRestorableDraft).toBe(false);
  });

  it('goes false once the earlier draft is discarded', () => {
    mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(storedDraft()));
    const { result } = renderHook(() => useLessonDraft());
    expect(result.current.hasRestorableDraft).toBe(true);

    act(() => result.current.clearDraft());
    expect(result.current.hasRestorableDraft).toBe(false);
  });

  it('does not re-ask after a remount of the same page — the real trigger', () => {
    // The teacher dashboard is known to reset its tree mid-action. A remount
    // re-runs the mount effect and re-reads the draft this same page autosaved
    // seconds ago; that must not reopen the interstitial.
    const first = renderHook(() => useLessonDraft());
    act(() => first.result.current.saveDraft(input()));
    first.unmount();

    const second = renderHook(() => useLessonDraft());
    expect(second.result.current.hasDraft).toBe(true);
    expect(second.result.current.hasRestorableDraft).toBe(false);
  });

  it('still offers a draft left by an earlier page load', () => {
    // A reload or a new tab: the stored draft carries a different page id.
    mockLocalStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(storedDraft({ pageLoadId: 'a-previous-page-load' }))
    );
    const { result } = renderHook(() => useLessonDraft());
    expect(result.current.hasRestorableDraft).toBe(true);
  });

  it('is false for an expired draft, like hasDraft', () => {
    mockLocalStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(storedDraft({ savedAt: Date.now() - 25 * 60 * 60 * 1000 }))
    );
    const { result } = renderHook(() => useLessonDraft());
    expect(result.current.hasRestorableDraft).toBe(false);
    expect(result.current.hasDraft).toBe(false);
  });
});
