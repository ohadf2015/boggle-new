const STORAGE_KEY = 'lexiclash:captionHall';
const MAX_ENTRIES = 20;

export interface CaptionHallEntry {
  text: string;
  username: string;
  imageId: string;
  savedAt: number;
}

function loadEntries(): CaptionHallEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function persistEntries(entries: CaptionHallEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
}

export function saveWinner(entry: Omit<CaptionHallEntry, 'savedAt'>): void {
  const entries = loadEntries();
  entries.push({ ...entry, savedAt: Date.now() });
  persistEntries(entries);
}

export function getRandomPast(excludeImageId?: string): CaptionHallEntry | null {
  const entries = loadEntries();
  const eligible = excludeImageId
    ? entries.filter(e => e.imageId !== excludeImageId)
    : entries;
  if (!eligible.length) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}
