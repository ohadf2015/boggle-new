/**
 * Word Collection: track found words across quick rounds.
 * For guests: localStorage-backed persistence.
 * For signed-in users: exported API for the results screen to query server.
 */

const GUEST_WORDS_KEY = 'quick_play_guest_words';

/**
 * Get words collected by a player. For guests (userId=null), reads from
 * localStorage. For signed-in users, this is a client-side cache of server
 * state — actual persistence is server-side.
 */
export function getPlayerCollectedWords(userId: string | null): string[] {
  if (userId) {
    // Server tracks words; this is a placeholder for the read API.
    // QuickPlayResults.tsx will call a different API endpoint.
    return [];
  }
  // Guest: read from localStorage
  try {
    const stored = localStorage.getItem(GUEST_WORDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save guest's collected words to localStorage. Deduplicates on write.
 * ponytail: for guests only; signed-in users call server API.
 */
export function saveGuestWords(words: string[]): void {
  try {
    const deduplicated = Array.from(new Set(words.map(w => w.toLowerCase())));
    localStorage.setItem(GUEST_WORDS_KEY, JSON.stringify(deduplicated));
  } catch {
    // localStorage may be unavailable; silently fail rather than crashing.
  }
}

/**
 * Merge new words into guest collection, deduplicating.
 * Returns the merged collection.
 */
export function mergeGuestWords(newWords: string[]): string[] {
  const existing = getPlayerCollectedWords(null);
  const allWords = [...existing, ...newWords];
  const deduplicated = Array.from(new Set(allWords.map(w => w.toLowerCase())));
  saveGuestWords(deduplicated);
  return deduplicated;
}

/**
 * Identify words from this round that are new to the player's collection.
 * Case-insensitive comparison.
 */
export function getNewWordsFromRound(
  roundWords: string[],
  allCollectedWords: string[]
): string[] {
  const collectedLower = new Set(allCollectedWords.map(w => w.toLowerCase()));
  return roundWords.filter(word => !collectedLower.has(word.toLowerCase()));
}

/**
 * Check collection progress. Returns { collected, new }.
 * For signed-in users, fetches from server; for guests, uses localStorage.
 * Async to support server fetch for auth users.
 */
export async function getCollectionProgress(
  roundWords: string[],
  userId: string | null
): Promise<{ collected: string[]; new: string[] }> {
  let allCollected: string[] = [];

  if (userId) {
    // Fetch from server
    try {
      const res = await fetch('/api/quick-play/word-collection');
      if (res.ok) {
        const data = await res.json();
        allCollected = data.collected ?? [];
      }
    } catch (err) {
      // Silently fall back to empty collection
      console.error('Failed to fetch word collection:', err);
    }
  } else {
    // Guest: use localStorage
    allCollected = getPlayerCollectedWords(null);
  }

  const newWords = getNewWordsFromRound(roundWords, allCollected);
  return {
    collected: allCollected,
    new: newWords,
  };
}

/**
 * Exported API for QuickPlayResults.tsx to show word collection progress.
 * For guests: merges round words into localStorage, returns progress.
 * For signed-in users: server persists via quick-play/submit; this fetches collection state.
 *
 * Usage in QuickPlayResults:
 *   const progress = await getQuickPlayWordProgress(result.words ?? [], userId);
 *   // progress.new contains newly discovered words (original casing from round)
 *   // progress.collected contains full collection (lowercased for storage)
 */
export async function getQuickPlayWordProgress(
  roundWords: Array<{ word: string; score: number }>,
  userId: string | null
): Promise<{
  collected: string[];
  new: string[];
  total: number;
}> {
  // Map to lowercase for comparison + storage, but keep original casing mapping
  const originalCasing = new Map<string, string>();
  const wordsLower = roundWords.map(w => {
    const lower = w.word.toLowerCase();
    originalCasing.set(lower, w.word);
    return lower;
  });

  if (!userId) {
    // Guest: CRITICAL ORDER — get collection BEFORE merge to detect new words
    const collectionBefore = getPlayerCollectedWords(null);
    const newWordsLower = getNewWordsFromRound(wordsLower, collectionBefore);
    const newWords = newWordsLower.map(w => originalCasing.get(w) || w);

    // NOW merge (after detecting new)
    const collectionAfter = mergeGuestWords(wordsLower);

    return {
      collected: collectionAfter,
      new: newWords,
      total: collectionAfter.length,
    };
  }

  // Signed-in: fetch current collection from server and detect new words
  const progress = await getCollectionProgress(wordsLower, userId);
  const newWords = progress.new.map(w => originalCasing.get(w) || w);

  return {
    collected: progress.collected,
    new: newWords,
    total: progress.collected.length,
  };
}
