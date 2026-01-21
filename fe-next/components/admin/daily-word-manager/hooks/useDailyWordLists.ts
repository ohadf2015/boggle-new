'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Language } from '@/types';
import { INITIAL_WORD_LISTS, WORD_LISTS_STORAGE_KEY, MIN_WORD_LENGTH } from '../constants';
import type { WordListStats } from '../types';

// Load word lists from localStorage, falling back to initial lists
function loadWordLists(): Record<Language, string[]> {
  if (typeof window === 'undefined') return INITIAL_WORD_LISTS;

  try {
    const stored = localStorage.getItem(WORD_LISTS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with initial lists to ensure all languages are present
      return {
        ...INITIAL_WORD_LISTS,
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Failed to load word lists from localStorage:', e);
  }
  return INITIAL_WORD_LISTS;
}

// Save word lists to localStorage
function saveWordLists(lists: Record<Language, string[]>) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(WORD_LISTS_STORAGE_KEY, JSON.stringify(lists));
  } catch (e) {
    console.error('Failed to save word lists to localStorage:', e);
  }
}

interface UseDailyWordListsReturn {
  wordLists: Record<Language, string[]>;
  currentWords: string[];
  filteredWords: string[];
  stats: WordListStats;
  isLoaded: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  addWord: (word: string, language: Language) => { success: boolean; error?: string };
  removeWord: (word: string, language: Language) => void;
  resetToDefaults: () => void;
}

export function useDailyWordLists(selectedLang: Language): UseDailyWordListsReturn {
  const [wordLists, setWordLists] = useState<Record<Language, string[]>>(INITIAL_WORD_LISTS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load word lists from localStorage on mount
  useEffect(() => {
    const loaded = loadWordLists();
    setWordLists(loaded);
    setIsLoaded(true);
  }, []);

  // Save word lists to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (isLoaded) {
      saveWordLists(wordLists);
    }
  }, [wordLists, isLoaded]);

  const currentWords = wordLists[selectedLang];

  const filteredWords = useMemo(() => {
    if (!searchQuery) return currentWords;
    const query = searchQuery.toLowerCase();
    return currentWords.filter(word => word.toLowerCase().includes(query));
  }, [currentWords, searchQuery]);

  const stats = useMemo((): WordListStats => {
    const lengths = currentWords.reduce((acc, word) => {
      const len = word.length;
      acc[len] = (acc[len] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      total: currentWords.length,
      byLength: lengths,
      shortest: Math.min(...currentWords.map(w => w.length)),
      longest: Math.max(...currentWords.map(w => w.length)),
    };
  }, [currentWords]);

  const addWord = useCallback((word: string, language: Language): { success: boolean; error?: string } => {
    const formattedWord = word.trim().toUpperCase();
    if (!formattedWord) {
      return { success: false, error: 'Word cannot be empty' };
    }

    const minLength = MIN_WORD_LENGTH[language] || 3;
    if (formattedWord.length < minLength) {
      return { success: false, error: `Words for ${language.toUpperCase()} must be at least ${minLength} letters!` };
    }

    if (wordLists[language].includes(formattedWord)) {
      return { success: false, error: 'Word already exists!' };
    }

    setWordLists(prev => ({
      ...prev,
      [language]: [...prev[language], formattedWord].sort()
    }));
    return { success: true };
  }, [wordLists]);

  const removeWord = useCallback((word: string, language: Language) => {
    setWordLists(prev => ({
      ...prev,
      [language]: prev[language].filter(w => w !== word)
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setWordLists(INITIAL_WORD_LISTS);
    localStorage.removeItem(WORD_LISTS_STORAGE_KEY);
  }, []);

  return {
    wordLists,
    currentWords,
    filteredWords,
    stats,
    isLoaded,
    searchQuery,
    setSearchQuery,
    addWord,
    removeWord,
    resetToDefaults,
  };
}
