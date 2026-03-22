'use client';

import { useState, useCallback } from 'react';
import {
  createWordReviewData,
  calculateNextReview,
  isWordDueForReview,
  type WordReviewData,
} from '@/lib/utils/spacedRepetition';
import logger from '@/utils/logger';

const STORAGE_KEY = 'lexiclash_word_collection';
const MASTERY_THRESHOLD = 5; // repetitions >= 5 = mastered

export interface WordCollectionContext {
  foundInMode: string;
  date: string;
}

export interface CollectedWord {
  word: string;
  context: WordCollectionContext;
  reviewData: WordReviewData;
}

export interface UseWordCollectionReturn {
  words: CollectedWord[];
  dueForReview: string[];
  totalCollected: number;
  masteredCount: number;
  collectWord: (word: string, context: WordCollectionContext) => void;
  reviewWord: (word: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => void;
}

function loadCollection(): CollectedWord[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CollectedWord[];
  } catch (err) {
    logger.error('useWordCollection: failed to load from localStorage', err);
    return [];
  }
}

function saveCollection(words: CollectedWord[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  } catch (err) {
    logger.error('useWordCollection: failed to save to localStorage', err);
  }
}

function computeDueForReview(words: CollectedWord[]): string[] {
  return words
    .filter(w => isWordDueForReview(w.reviewData))
    .map(w => w.word);
}

function computeMasteredCount(words: CollectedWord[]): number {
  return words.filter(w => w.reviewData.repetitions >= MASTERY_THRESHOLD).length;
}

/**
 * Hook for managing a personal word collection with spaced repetition.
 * Words are collected during gameplay and reviewed using SM-2 scheduling.
 * Persists to localStorage.
 */
export function useWordCollection(): UseWordCollectionReturn {
  const [words, setWords] = useState<CollectedWord[]>(() => loadCollection());

  const collectWord = useCallback((word: string, context: WordCollectionContext) => {
    setWords(prev => {
      // Skip duplicates
      if (prev.some(w => w.word === word)) return prev;

      const newWord: CollectedWord = {
        word,
        context,
        reviewData: createWordReviewData(word),
      };
      const updated = [...prev, newWord];
      saveCollection(updated);
      return updated;
    });
  }, []);

  const reviewWord = useCallback((word: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    setWords(prev => {
      const idx = prev.findIndex(w => w.word === word);
      if (idx === -1) return prev;

      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        reviewData: calculateNextReview(updated[idx].reviewData, { quality }),
      };
      saveCollection(updated);
      return updated;
    });
  }, []);

  return {
    words,
    dueForReview: computeDueForReview(words),
    totalCollected: words.length,
    masteredCount: computeMasteredCount(words),
    collectWord,
    reviewWord,
  };
}
