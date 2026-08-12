import { useRef, useCallback } from 'react';

/**
 * Hook that guards against duplicate share-prompt opens within a single game session.
 *
 * **Why this is needed:**
 * Game results can arrive in two sequences:
 * 1. Empty fallback ("Calculating results...") — placeholder shown after game ends
 * 2. Real validated scores — backend-confirmed results that supersede the empty fallback
 *
 * Both trigger results display, and if share-auto-open fires for both, the user sees
 * duplicate share prompts / native-share dialogs. This guard ensures auto-open fires
 * **exactly once** per game session, even across multiple result renders and remounts.
 *
 * **Persistence:** Uses sessionStorage to survive component remounts within a single session.
 *
 * **Usage in ResultsPage or result components:**
 * ```tsx
 * const { shouldFireShareOpen } = useShareOpenGuard();
 *
 * useEffect(() => {
 *   if (resultsData && shouldFireShareOpen(resultsData.gameSessionId)) {
 *     // Auto-open share prompt here (modal, bottom sheet, native share API, etc.)
 *     openShareSheet();
 *   }
 * }, [resultsData, shouldFireShareOpen]);
 * ```
 *
 * @returns Object with `shouldFireShareOpen(sessionId)` — returns true only once per sessionId
 */
const SHARE_GUARD_KEY = 'lexiclash_share_open_guard';

export function useShareOpenGuard() {
  const sessionIdsThatFiredRef = useRef(new Set<string>());

  const shouldFireShareOpen = useCallback((sessionId: string | undefined | null): boolean => {
    if (!sessionId) return false;

    // Try to load from sessionStorage first (survives remounts)
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(SHARE_GUARD_KEY);
        const firedSessions = stored ? JSON.parse(stored) : [];

        if (firedSessions.includes(sessionId)) {
          return false; // Already fired before
        }

        // Record this session as fired
        firedSessions.push(sessionId);
        sessionStorage.setItem(SHARE_GUARD_KEY, JSON.stringify(firedSessions));
        return true;
      } catch (e) {
        // Fall back to ref-based tracking if sessionStorage fails
      }
    }

    const hasFired = sessionIdsThatFiredRef.current.has(sessionId);
    if (!hasFired) {
      sessionIdsThatFiredRef.current.add(sessionId);
      return true; // First time for this session — fire it
    }
    return false; // Already fired — suppress
  }, []);

  return { shouldFireShareOpen };
}
