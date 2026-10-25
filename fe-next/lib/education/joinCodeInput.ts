/** Hebrew-layout character → the Latin key under it, so a phone left on Hebrew still types the code. */
const HEBREW_LETTERS: Record<string, string> = {
  'ק': 'E', 'ר': 'R', 'א': 'T', 'ט': 'Y', 'ו': 'U', 'ן': 'I', 'ם': 'O', 'פ': 'P',
  'ש': 'A', 'ד': 'S', 'ג': 'D', 'כ': 'F', 'ע': 'G', 'י': 'H', 'ח': 'J', 'ל': 'K', 'ך': 'L',
  'ז': 'Z', 'ס': 'X', 'ב': 'C', 'ה': 'V', 'נ': 'B', 'מ': 'N', 'צ': 'M',
};
/** The Q and W keys type punctuation on Hebrew; only read them as letters when the rest was typed on Hebrew too. */
const HEBREW_PUNCTUATION: Record<string, string> = { '/': 'Q', "'": 'W', '׳': 'W' };

/** Full-width → ASCII, Hebrew layout → Latin, trimmed and uppercased. Invalid characters are left for the caller. */
export function foldJoinCode(raw: string): string {
  const chars = Array.from(raw.normalize('NFKC'));
  const hebrewLayout = chars.some((ch) => ch in HEBREW_LETTERS);
  return chars
    .map((ch) => HEBREW_LETTERS[ch] ?? (hebrewLayout ? HEBREW_PUNCTUATION[ch] : undefined) ?? ch)
    .join('')
    .trim()
    .toUpperCase();
}
