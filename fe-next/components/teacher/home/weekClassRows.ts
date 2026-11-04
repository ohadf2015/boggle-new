export type WeekClassTone = 'today' | 'week' | 'idle';

export interface WeekClassRow {
  id: string;
  name: string;
  tone: WeekClassTone;
  /** null when the class has no game in the last 7 days. */
  playedAt: string | null;
}

const DAY_MS = 86_400_000;

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function toneFor(iso: string | undefined, nowMs: number): WeekClassTone {
  const ms = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(ms)) return 'idle';
  const days = Math.round((startOfDay(nowMs) - startOfDay(ms)) / DAY_MS);
  if (days <= 0) return 'today';
  return days < 7 ? 'week' : 'idle';
}

/** One row per class for the "This week" rail: freshest first, capped, never hiding the class on the desk. */
export function weekClassRows(
  classrooms: readonly { id: string; name: string }[],
  lastPlayedAt: Readonly<Record<string, string>>,
  nowMs: number,
  max: number,
  selectedId?: string,
): { rows: WeekClassRow[]; hidden: number } {
  const all = classrooms.map((c, i) => {
    const tone = toneFor(lastPlayedAt[c.id], nowMs);
    return { row: { id: c.id, name: c.name, tone, playedAt: tone === 'idle' ? null : lastPlayedAt[c.id] }, i };
  });
  all.sort((a, b) => {
    const pa = a.row.playedAt ?? '';
    const pb = b.row.playedAt ?? '';
    if (pa !== pb) return pa > pb ? -1 : 1;
    return a.i - b.i;
  });
  const sorted = all.map((x) => x.row);
  const cap = Math.max(0, Math.floor(max));
  const rows = sorted.slice(0, cap);
  const selected = selectedId ? sorted.find((r) => r.id === selectedId) : undefined;
  if (selected && cap > 0 && !rows.includes(selected)) rows[cap - 1] = selected;
  return { rows, hidden: sorted.length - rows.length };
}
