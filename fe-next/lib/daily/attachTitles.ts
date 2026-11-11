import { resolveDisplayTitle } from '@/lib/titles/playerTitles';

export interface TitleMeta {
  chosen_title: string | null;
  current_level: number | null;
}

/** Signed-in rows (`u:<id>`) get the title their owner shows; guest rows stay untitled. */
export function attachTitles<T extends { identity: string; title?: string | null }>(rows: T[], meta: ReadonlyMap<string, TitleMeta>): void {
  for (const row of rows) {
    if (!row.identity.startsWith('u:')) continue;
    const m = meta.get(row.identity.slice(2));
    if (m) row.title = resolveDisplayTitle({ chosenTitle: m.chosen_title, level: m.current_level });
  }
}
