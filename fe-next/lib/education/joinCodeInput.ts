/** Hebrew-layout character → the Latin key under it, so a phone left on Hebrew still types the code. */
const HEBREW_LAYOUT: Record<string, string> = {
  '/': 'Q', "'": 'W', '׳': 'W', 'ק': 'E', 'ר': 'R', 'א': 'T', 'ט': 'Y', 'ו': 'U', 'ן': 'I', 'ם': 'O', 'פ': 'P',
  'ש': 'A', 'ד': 'S', 'ג': 'D', 'כ': 'F', 'ע': 'G', 'י': 'H', 'ח': 'J', 'ל': 'K', 'ך': 'L',
  'ז': 'Z', 'ס': 'X', 'ב': 'C', 'ה': 'V', 'נ': 'B', 'מ': 'N', 'צ': 'M',
};

/** Full-width → ASCII, Hebrew layout → Latin, trimmed and uppercased. Invalid characters are left for the caller. */
export function foldJoinCode(raw: string): string {
  return Array.from(raw.normalize('NFKC'), (ch) => HEBREW_LAYOUT[ch] ?? ch)
    .join('')
    .trim()
    .toUpperCase();
}
