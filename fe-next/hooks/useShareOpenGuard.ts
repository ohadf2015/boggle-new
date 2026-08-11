import { useRef } from 'react';

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
 * **exactly once** per game session, even across multiple result renders.
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
export function useShareOpenGuard() {
  const sessionIdsThatFiredRef = useRef(new Set<string>());

  const shouldFireShareOpen = (sessionId: string | undefined | null): boolean => {
    if (!sessionId) return false;

    const hasFired = sessionIdsThatFiredRef.current.has(sessionId);
    if (!hasFired) {
      sessionIdsThatFiredRef.current.add(sessionId);
      return true; // First time for this session — fire it
    }
    return false; // Already fired — suppress
  };

  return { shouldFireShareOpen };
}
