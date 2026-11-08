import type { ActiveRoom, Language } from '@/shared/types/game';
import { LANGUAGE_CONFIG } from '@/lib/languageConfig';

/** Board languages a room can be created in (CREATE's flag row, and the list filter's base). */
export const BOARD_LANGUAGES: Language[] = ['en', 'he', 'sv', 'ja', 'es'];

export function roomsInLanguage<R extends ActiveRoom>(rooms: R[], language: Language): R[] {
  return rooms.filter((r) => r.language === language);
}

export function countByLanguage(rooms: ActiveRoom[]): Partial<Record<Language, number>> {
  const counts: Partial<Record<Language, number>> = {};
  for (const r of rooms) counts[r.language] = (counts[r.language] ?? 0) + 1;
  return counts;
}

/** Filter choices: the viewer's language first, then the board languages, then any other language a live room uses. */
export function arenaLanguages(rooms: ActiveRoom[], viewer: Language): Language[] {
  const out: Language[] = [viewer];
  for (const lang of [...BOARD_LANGUAGES, ...rooms.map((r) => r.language)]) {
    if (!out.includes(lang)) out.push(lang);
  }
  return out;
}

export function languageDisplayName(language: Language, uiLocale: string): string {
  try {
    const name = new Intl.DisplayNames([uiLocale], { type: 'language' }).of(language);
    if (name && name !== language) return name;
  } catch {
    // Intl.DisplayNames missing (old WebView) or a bad locale tag: fall through to the English name.
  }
  return LANGUAGE_CONFIG[language]?.name ?? language;
}
