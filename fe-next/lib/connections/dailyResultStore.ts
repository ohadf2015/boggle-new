/**
 * Today's terminal Word Bridge daily result (5-riddle chain or pyramid).
 *
 * Without it a finished daily restarted from scratch on revisit — and on a
 * pyramid day the solved-pyramid filter even served a DIFFERENT pyramid after
 * a win. One key per UTC day + language; every storage access is guarded
 * (private mode / blocked storage → behave as "nothing stored").
 */
export function dailyResultKey(dateISO: string, language: string): string {
  return `connections-daily-result-${dateISO}-${language}`;
}

export function saveDailyResult(dateISO: string, language: string, result: unknown): void {
  try {
    window.localStorage.setItem(dailyResultKey(dateISO, language), JSON.stringify(result));
  } catch {
    /* storage disabled — the run simply isn't restorable */
  }
}

export function loadDailyResult<T>(dateISO: string, language: string): T | null {
  try {
    const raw = window.localStorage.getItem(dailyResultKey(dateISO, language));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
