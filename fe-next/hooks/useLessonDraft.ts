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
    };

    setDraft(draftData);
    setDraftAge(0); // Just saved, age is 0

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
    draftAge,
    saveDraft,
    clearDraft,
    restoreDraft,
  };
}

export default useLessonDraft;
