/** Hebrew-layout character → the Latin key under it, so a phone left on Hebrew still types the code. */
const HEBREW_LETTERS: Record<string, string> = {
  'ק': 'E', 'ר': 'R', 'א': 'T', 'ט': 'Y', 'ו': 'U', 'ן': 'I', 'ם': 'O', 'פ': 'P',
  'ש': 'A', 'ד': 'S', 'ג': 'D', 'כ': 'F', 'ע': 'G', 'י': 'H', 'ח': 'J', 'ל': 'K', 'ך': 'L',
  'ז': 'Z', 'ס': 'X', 'ב': 'C', 'ה': 'V', 'נ': 'B', 'מ': 'N', 'צ': 'M',
};
/** Russian ЙЦУКЕН character → the Latin key under it; letters on punctuation keys (Х Ъ Ж Э Б Ю Ё) have no code letter. */
const CYRILLIC_LETTERS: Record<string, string> = {
  'Й': 'Q', 'Ц': 'W', 'У': 'E', 'К': 'R', 'Е': 'T', 'Н': 'Y', 'Г': 'U', 'Ш': 'I', 'Щ': 'O', 'З': 'P',
  'Ф': 'A', 'Ы': 'S', 'В': 'D', 'А': 'F', 'П': 'G', 'Р': 'H', 'О': 'J', 'Л': 'K', 'Д': 'L',
  'Я': 'Z', 'Ч': 'X', 'С': 'C', 'М': 'V', 'И': 'B', 'Т': 'N', 'Ь': 'M',
};
/** The Q and W keys type punctuation on Hebrew; only read them as letters when the rest was typed on Hebrew too. */
const HEBREW_PUNCTUATION: Record<string, string> = { '/': 'Q', "'": 'W', '׳': 'W' };

export function foldJoinCode(raw: string): string {
  const chars = Array.from(raw.normalize('NFKC'));
  const hebrewLayout = chars.some((ch) => ch in HEBREW_LETTERS);
  return chars
    .map((ch) => HEBREW_LETTERS[ch] ?? CYRILLIC_LETTERS[ch.toUpperCase()] ?? (hebrewLayout ? HEBREW_PUNCTUATION[ch] : undefined) ?? ch)
    .join('')
    .trim()
    .toUpperCase();
}

/** True when typing lost characters no layout maps, so the field can say why it stayed empty. */
export function joinCodeStripped(raw: string): boolean {
  return /[^A-Z0-9\s-]/.test(foldJoinCode(raw));
}
