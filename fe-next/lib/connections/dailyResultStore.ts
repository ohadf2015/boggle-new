/**
 * Today's terminal Word Bridge daily result (5-riddle chain or pyramid).
 *
 * Without it a finished daily restarted from scratch on revisit — and on a
 * pyramid day the solved-pyramid filter even served a DIFFERENT pyramid after
 * a win. One key per UTC day: switching language must not reopen the day as a
 * fresh run. Every storage access is guarded (private mode / blocked storage →
 * behave as "nothing stored").
 */
export function dailyResultKey(dateISO: string): string {
  return `connections-daily-result-${dateISO}`;
}

/** Results written before the key dropped the language. */
export function legacyDailyResultKey(dateISO: string, language: string): string {
  return `connections-daily-result-${dateISO}-${language}`;
}

export function saveDailyResult(dateISO: string, language: string, result: object): void {
  try {
    window.localStorage.setItem(dailyResultKey(dateISO), JSON.stringify({ ...result, language }));
  } catch {
    /* storage disabled — the run simply isn't restorable */
  }
}

/** The stored result, carrying the `language` it was played in. */
export function loadDailyResult<T>(dateISO: string, language: string): (T & { language: string }) | null {
  try {
    const raw = window.localStorage.getItem(dailyResultKey(dateISO));
    if (raw) return JSON.parse(raw);
    const legacy = window.localStorage.getItem(legacyDailyResultKey(dateISO, language));
    return legacy ? { ...JSON.parse(legacy), language } : null;
  } catch {
    return null;
  }
}

export function patchDailyResult(dateISO: string, patch: object): void {
  try {
    const raw = window.localStorage.getItem(dailyResultKey(dateISO));
    if (!raw) return;
    window.localStorage.setItem(dailyResultKey(dateISO), JSON.stringify({ ...JSON.parse(raw), ...patch }));
  } catch {
    /* storage disabled */
  }
}
