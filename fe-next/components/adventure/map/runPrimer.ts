/** First map visit opens the legend sheet, which leads with "how a run works". */
export const RUN_PRIMER_KEY = 'adv-run-primer-v1';

/** True once per browser; the marker is written at show time, not on close. */
export function takeRunPrimer(): boolean {
  try {
    if (window.localStorage.getItem(RUN_PRIMER_KEY) !== null) return false;
    window.localStorage.setItem(RUN_PRIMER_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}
