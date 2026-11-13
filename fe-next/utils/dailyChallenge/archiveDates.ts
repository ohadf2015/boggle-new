import { safeToLocaleDateString } from '@/utils/bcp47Locale';
import { DAILY_CHALLENGE_EPOCH } from './constants';

export interface ArchiveEntry {
  date: string;
  puzzleNumber: number;
}

/** Every puzzle from the epoch to yesterday (UTC), newest first. */
export function getArchiveDates(now: Date = new Date()): ArchiveEntry[] {
  const dates: ArchiveEntry[] = [];
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const current = new Date(DAILY_CHALLENGE_EPOCH);
  for (let puzzleNumber = 1; current <= yesterday; puzzleNumber++) {
    dates.push({ date: current.toISOString().split('T')[0], puzzleNumber });
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates.reverse();
}

export function groupArchiveByMonth(entries: ArchiveEntry[]): Record<string, ArchiveEntry[]> {
  const groups: Record<string, ArchiveEntry[]> = {};
  for (const entry of entries) (groups[entry.date.slice(0, 7)] ??= []).push(entry);
  return groups;
}

export function formatArchiveMonth(monthKey: string, language: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return safeToLocaleDateString(new Date(Date.UTC(year, month - 1, 1)), language, { month: 'long', year: 'numeric' });
}
