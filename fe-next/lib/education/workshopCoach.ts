/**
 * Word Workshop one-time coach: the 1-2-3 placement guide shows on the
 * student's first match only. The marker is written when the guide is SHOWN
 * (not dismissed), so a reload mid-match never re-pops it.
 */

export const WORKSHOP_GUIDE_KEY = 'academy-workshop-guide-seen-v1';

/** true = show the guide now (and remember that it was shown). */
export function claimWorkshopGuide(storage: Storage | null | undefined): boolean {
  if (!storage) return true;
  try {
    if (storage.getItem(WORKSHOP_GUIDE_KEY) !== null) return false;
    storage.setItem(WORKSHOP_GUIDE_KEY, String(Date.now()));
  } catch {
    // storage unavailable: showing the guide again is the safe side
  }
  return true;
}
