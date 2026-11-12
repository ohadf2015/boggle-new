const EVENT = 'lexi:quest-check';

// The server credits daily quests fire-and-forget after it answers, so one read can land before the write.
export const QUEST_CHECK_DELAYS_MS = [0, 1500, 4000];

/** A game just ended: quests may have completed, re-read them now. */
export function requestQuestCheck(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

export function onQuestCheck(refetch: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  let timers: ReturnType<typeof setTimeout>[] = [];
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const handler = () => {
    clear();
    timers = QUEST_CHECK_DELAYS_MS.map((d) => setTimeout(refetch, d));
  };
  window.addEventListener(EVENT, handler);
  return () => { window.removeEventListener(EVENT, handler); clear(); };
}
