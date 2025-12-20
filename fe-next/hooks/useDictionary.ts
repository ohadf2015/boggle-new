'use client';

import { useState, useEffect } from 'react';

// Client-side dictionary for instant validation
let englishDictionaryCache: Set<string> | null = null;
let loadingPromise: Promise<Set<string>> | null = null;

async function loadEnglishDictionary(): Promise<Set<string>> {
  if (englishDictionaryCache) return englishDictionaryCache;

  if (loadingPromise) return loadingPromise;

  loadingPromise = import('an-array-of-english-words').then(module => {
    englishDictionaryCache = new Set(module.default.map((w: string) => w.toLowerCase()));
    return englishDictionaryCache;
  });

  return loadingPromise;
}

export function useDictionary(language: string) {
  const [dictionary, setDictionary] = useState<Set<string> | null>(englishDictionaryCache);
  const [isLoading, setIsLoading] = useState(!englishDictionaryCache);

  useEffect(() => {
    if (language === 'en' && !dictionary) {
      loadEnglishDictionary().then(dict => {
        setDictionary(dict);
        setIsLoading(false);
      });
    }
  }, [language, dictionary]);

  const isWordInDictionary = (word: string): boolean => {
    if (!dictionary) return false;
    return dictionary.has(word.toLowerCase());
  };

  return { dictionary, isLoading, isWordInDictionary };
}
