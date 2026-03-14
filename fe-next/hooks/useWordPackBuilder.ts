'use client';

import { useState, useCallback, useMemo } from 'react';

export interface WordValidation {
  word: string;
  valid: boolean;
  duplicate: boolean;
}

export interface UseWordPackBuilderReturn {
  // Pack metadata
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  themeEmoji: string;
  setThemeEmoji: (emoji: string) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  // Words
  words: string[];
  addWord: (word: string) => Promise<WordValidation>;
  removeWord: (word: string) => void;
  bulkAddWords: (text: string) => Promise<WordValidation[]>;
  // Publishing
  canPublish: boolean;
  isPublishing: boolean;
  publishError: string | null;
  publishedPackId: string | null;
  publishPack: () => Promise<void>;
}

async function validateWordApi(word: string): Promise<boolean> {
  try {
    const res = await fetch('/api/ugc/packs/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.valid;
  } catch {
    return false;
  }
}

export function useWordPackBuilder(): UseWordPackBuilderReturn {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [themeEmoji, setThemeEmoji] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [words, setWords] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedPackId, setPublishedPackId] = useState<string | null>(null);

  const canPublish = useMemo(
    () => name.trim().length > 0 && words.length >= 10,
    [name, words.length]
  );

  const addWord = useCallback(
    async (rawWord: string): Promise<WordValidation> => {
      const word = rawWord.trim().toUpperCase();

      // Check for duplicate before hitting the API
      if (words.includes(word)) {
        return { word, valid: true, duplicate: true };
      }

      const valid = await validateWordApi(word);

      if (valid) {
        setWords((prev) => [...prev, word]);
      }

      return { word, valid, duplicate: false };
    },
    [words]
  );

  const removeWord = useCallback((word: string) => {
    setWords((prev) => prev.filter((w) => w !== word));
  }, []);

  const bulkAddWords = useCallback(
    async (text: string): Promise<WordValidation[]> => {
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const results: WordValidation[] = [];
      for (const line of lines) {
        // Use the latest words state via functional updates — read current words from closure
        // We do sequential awaits to keep state consistent
        const result = await addWord(line);
        results.push(result);
      }
      return results;
    },
    [addWord]
  );

  const publishPack = useCallback(async () => {
    if (!canPublish) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      const res = await fetch('/api/ugc/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          language,
          theme_emoji: themeEmoji || null,
          tags: tags.length > 0 ? tags : null,
          words,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPublishError(data.message ?? 'Failed to publish pack');
      } else {
        setPublishedPackId(data.id);
      }
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsPublishing(false);
    }
  }, [canPublish, name, description, language, themeEmoji, tags, words]);

  return {
    name,
    setName,
    description,
    setDescription,
    language,
    setLanguage,
    themeEmoji,
    setThemeEmoji,
    tags,
    setTags,
    words,
    addWord,
    removeWord,
    bulkAddWords,
    canPublish,
    isPublishing,
    publishError,
    publishedPackId,
    publishPack,
  };
}
