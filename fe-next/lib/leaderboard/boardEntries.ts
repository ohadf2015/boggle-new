import { isPlaceholderName } from '@/lib/displayName';
import { resolveDisplayTitle } from '@/lib/titles/playerTitles';
import { isGeneratedName } from '@/utils/defaultPlayerNames';

interface BoardRow {
  display_name?: string | null;
  username?: string | null;
  chosen_title?: string | null;
  player_level?: number | null;
}

const shownName = (name: string | null | undefined): boolean => !isPlaceholderName(name) && !isGeneratedName(name);

/** Global board rows as players see them: chosen names only, with the title each player shows. */
export function toBoardEntries<T extends BoardRow>(rows: T[] | null | undefined): Array<Omit<T, 'display_name'> & { display_name?: string; title: string | null }> {
  const out: Array<Omit<T, 'display_name'> & { display_name?: string; title: string | null }> = [];
  for (const row of rows ?? []) {
    const displayOk = shownName(row.display_name);
    if (!displayOk && !shownName(row.username)) continue;
    out.push({
      ...row,
      display_name: displayOk ? (row.display_name as string) : undefined,
      title: resolveDisplayTitle({ chosenTitle: row.chosen_title, level: row.player_level }),
    });
  }
  return out;
}
