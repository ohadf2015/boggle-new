/**
 * useLessonDraft Hook
 *
 * Manages lesson draft auto-save to localStorage.
 * Allows teachers to resume creating a lesson if they navigate away.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Language, VocabularyWord } from '@/lib/supabase/education';

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'lexiclash_lesson_draft';
/** Draft expires after 24 hours */
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Identifies THIS page load. Created once when the module is first evaluated,
 * so every component that mounts and remounts within the same page shares it,
 * while a reload or a new tab gets a fresh one.
 *
 * A remount must not re-ask "resume draft?" for work the same page just saved;
 * a genuine reload should. The teacher dashboard is known to remount its tree
 * mid-action, which makes this the difference between a prompt that appears
 * once and one that ambushes the teacher repeatedly.
 */
const PAGE_LOAD_ID =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `page-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ============================================
// TYPES
// ============================================

export interface LessonDraft {
  /** Lesson name */
  name: string;
  /** Lesson description */
  description: string;
  /** Lesson language */
  language: Language;
  /** Assigned classroom ID (empty string if none) */
  classroomId: string;
  /** Words in the lesson */
  words: VocabularyWord[];
  /** Timestamp when draft was saved */
  savedAt: number;
  /**
   * Which page load wrote this draft. Lets a later mount tell "work from an
   * earlier visit" from "the draft this very page just autosaved", which a
   * timestamp cannot: a component remount re-reads storage moments after a save.
   */
  pageLoadId?: string;
}

export interface LessonDraftInput {
  name: string;
  description: string;
  language: Language;
  classroomId: string;
  words: VocabularyWord[];
}

export interface UseLessonDraftReturn {
  /** Current saved draft (null if none) */
  draft: LessonDraft | null;
  /** Whether a draft exists */
  hasDraft: boolean;
  /**
   * Whether there is work from an EARLIER session worth offering back — the
   * only correct trigger for a "Resume draft?" prompt.
   *
   * True only for a draft read from storage at mount; false the moment this
   * session saves, restores, or discards. `hasDraft` cannot serve this role:
   * autosave flips it true, so a prompt keyed on it re-fires every 30 seconds
   * and blocks the form mid-edit.
   */
  hasRestorableDraft: boolean;
  /** Time in ms since draft was saved (null if no draft) */
  draftAge: number | null;
  /** Save current form state as draft */
  saveDraft: (data: LessonDraftInput) => void;
  /** Clear the saved draft */
  clearDraft: () => void;
  /** Restore draft and return its data (clears draft after restoration) */
  restoreDraft: () => LessonDraft | null;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Lesson draft hook
 *
 * @returns Draft state and actions
 *
 * @example
 * const { draft, hasDraft, saveDraft, restoreDraft, clearDraft } = useLessonDraft();
 *
 * // Auto-save periodically
 * useEffect(() => {
 *   const interval = setInterval(() => {
 *     if (formData.name || words.length > 0) {
 *       saveDraft({ ...formData, words });
 *     }
 *   }, 30000); // Every 30 seconds
 *   return () => clearInterval(interval);
 * }, [formData, words, saveDraft]);
 *
 * // Prompt to restore on open
 * if (hasDraft) {
 *   // Show "Resume Draft?" dialog
 * }
 */
export function useLessonDraft(): UseLessonDraftReturn {
  const [draft, setDraft] = useState<LessonDraft | null>(null);
  // Store the age at load time to avoid calling Date.now() during render
  const [draftAge, setDraftAge] = useState<number | null>(null);
  // Set once, by the mount effect, for a draft this session did not write.
  const [hasRestorableDraft, setHasRestorableDraft] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LessonDraft;

        // Check if draft is expired
        const now = Date.now();
        const age = now - parsed.savedAt;
        if (age > DRAFT_EXPIRY_MS) {
          // Draft expired, remove it
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        setDraft(parsed);
        setDraftAge(age);
        // Only offer back work from a DIFFERENT page load. A remount re-runs
        // this effect moments after an autosave; that is not something to
        // interrupt the teacher for.
        setHasRestorableDraft(parsed.pageLoadId !== PAGE_LOAD_ID);
      }
    } catch (error) {
      console.error('Failed to load lesson draft:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Save draft to localStorage
  const saveDraft = useCallback((data: LessonDraftInput) => {
    const draftData: LessonDraft = {
      ...data,
      savedAt: Date.now(),
      pageLoadId: PAGE_LOAD_ID,
    };

    setDraft(draftData);
    setDraftAge(0); // Just saved, age is 0
    // This session's own work is never something to offer back to it.
    setHasRestorableDraft(false);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
      } catch (error) {
        console.error('Failed to save lesson draft:', error);
      }
    }
  }, []);

  // Clear draft from state and localStorage
  const clearDraft = useCallback(() => {
    setDraft(null);
    setDraftAge(null);
    setHasRestorableDraft(false);

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('Failed to clear lesson draft:', error);
      }
    }
  }, []);

  // Restore draft (returns data and clears draft)
  const restoreDraft = useCallback((): LessonDraft | null => {
    const currentDraft = draft;
    clearDraft();
    return currentDraft;
  }, [draft, clearDraft]);

  // Check if draft exists
  const hasDraft = draft !== null;

  return {
    draft,
    hasDraft,
    hasRestorableDraft,
    draftAge,
    saveDraft,
    clearDraft,
    restoreDraft,
  };
}

export default useLessonDraft;
