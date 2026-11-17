import { normalizeTypedChar } from './keyboard';

// Standard Hebrew (SI-1452) positions, sofit keys folded to their base letter.
const HEBREW_BY_CODE: Record<string, string> = {
  KeyE: 'ק', KeyR: 'ר', KeyT: 'א', KeyY: 'ט', KeyU: 'ו', KeyI: 'נ', KeyO: 'מ', KeyP: 'פ',
  KeyA: 'ש', KeyS: 'ד', KeyD: 'ג', KeyF: 'כ', KeyG: 'ע', KeyH: 'י', KeyJ: 'ח', KeyK: 'ל', KeyL: 'כ', Semicolon: 'פ',
  KeyZ: 'ז', KeyX: 'ס', KeyC: 'ב', KeyV: 'ה', KeyB: 'נ', KeyN: 'מ', KeyM: 'צ', Comma: 'ת', Period: 'צ',
};

// ЙЦУКЕН positions; Ё (Backquote) folds to Е like a typed Ё does.
const RUSSIAN_BY_CODE: Record<string, string> = {
  KeyQ: 'Й', KeyW: 'Ц', KeyE: 'У', KeyR: 'К', KeyT: 'Е', KeyY: 'Н', KeyU: 'Г', KeyI: 'Ш', KeyO: 'Щ', KeyP: 'З',
  BracketLeft: 'Х', BracketRight: 'Ъ',
  KeyA: 'Ф', KeyS: 'Ы', KeyD: 'В', KeyF: 'А', KeyG: 'П', KeyH: 'Р', KeyJ: 'О', KeyK: 'Л', KeyL: 'Д',
  Semicolon: 'Ж', Quote: 'Э',
  KeyZ: 'Я', KeyX: 'Ч', KeyC: 'С', KeyV: 'М', KeyB: 'И', KeyN: 'Т', KeyM: 'Ь', Comma: 'Б', Period: 'Ю',
  Backquote: 'Е',
};

function letterFromCode(code: string, locale: string): string | null {
  if (locale === 'he') return HEBREW_BY_CODE[code] ?? null;
  if (locale === 'ru') return RUSSIAN_BY_CODE[code] ?? null;
  const m = /^Key([A-Z])$/.exec(code);
  return m ? m[1] : null;
}

/**
 * The board letter a physical keypress means. The typed character wins (so
 * AZERTY/Dvorak stay right); the key position is the fallback for a player
 * whose OS layout is another script than the board, e.g. English keys on the
 * Hebrew daily.
 */
export function letterFromKeyEvent(key: string, code: string, locale: string): string | null {
  return normalizeTypedChar(key, locale) ?? letterFromCode(code, locale);
}
