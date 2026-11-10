export const freezeToastKey = (playerId: string, date: string) => `lc:streak-freeze-toast:${playerId}:${date}`;

/** Marks a key as announced; true only the first time. Written at show time so a reload never re-toasts. */
export function claimOnce(key: string): boolean {
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}
