import { utcDateKey } from '@/lib/wordTower/dailySeed';

export interface RunSnapshot {
  daily: boolean;
  date: string;
  words: string[];
  peakM: number;
  floors: number;
}

export function snapshotKey(daily: boolean, date: Date = new Date()): string {
  return daily ? `wt2-session-daily-${utcDateKey(date)}` : 'wt2-session';
}

export function shouldConfirmLeave(phase: string, floors: number): boolean {
  return phase !== 'over' && floors > 0;
}

export function saveRunSnapshot(
  snap: RunSnapshot,
  storage: { setItem(key: string, value: string): void } | null,
): void {
  if (!storage) return;
  try {
    storage.setItem(snapshotKey(snap.daily), JSON.stringify(snap));
  } catch {
    /* quota / private mode */
  }
}

export function loadRunSnapshot(
  daily: boolean,
  storage: { getItem(key: string): string | null } | null,
  date: Date = new Date(),
): RunSnapshot | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(snapshotKey(daily, date));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RunSnapshot;
    if (!parsed || !Array.isArray(parsed.words)) return null;
    if (daily && parsed.date !== utcDateKey(date)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRunSnapshot(
  daily: boolean,
  storage: { removeItem(key: string): void } | null,
): void {
  if (!storage) return;
  try {
    storage.removeItem(snapshotKey(daily));
  } catch {
    /* ignore */
  }
}
