/**
 * Resolve the SERVER's points for a word the local client just submitted:
 * the matching `wordAccepted` (mpFeedback lastWord, recorded by both the host
 * and joiner word-event hooks) at or after `sinceTs`. `null` on timeout — the
 * caller then shows no number rather than a client-computed one (pitfall 3).
 */
import { useMpFeedbackStore, type MpLastWord } from '@/lib/multiplayer/mpFeedback';

export const SERVER_POINTS_TIMEOUT_MS = 2500;

export function awaitServerPoints(word: string, sinceTs: number, timeoutMs = SERVER_POINTS_TIMEOUT_MS): Promise<number | null> {
  const want = word.toLowerCase();
  const match = (w: MpLastWord | null): number | null =>
    w && w.ts >= sinceTs && w.word.toLowerCase() === want ? w.points : null;

  const already = match(useMpFeedbackStore.getState().lastWord);
  if (already != null) return Promise.resolve(already);

  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useMpFeedbackStore.subscribe((state) => {
      const points = match(state.lastWord);
      if (points == null) return;
      if (timer) clearTimeout(timer);
      unsubscribe();
      resolve(points);
    });
    timer = setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, timeoutMs);
  });
}
