// Hebrew tile bag — regular forms only. Final (sofit) forms ך ם ן ף ץ are
// NOT drawable tiles: hebrewDisplay.ts renders the final glyph at word-end
// from the regular tile, and dictionary.ts normalizes sofit→regular on
// lookup. Keeping sofit tiles in the bag let them be placed mid-word, and
// the normalized dictionary then accepted the result as a real word — which
// is how WORDBOT ended up playing impossible words.
export const values: Record<string, number> = {
  א: 1,
  ב: 3,
  ג: 4,
  ד: 3,
  ה: 2,
  ו: 1,
  ז: 6,
  ח: 4,
  ט: 6,
  י: 1,
  כ: 4,
  ל: 2,
  מ: 2,
  נ: 3,
  ס: 5,
  ע: 2,
  פ: 5,
  צ: 6,
  ק: 6,
  ר: 2,
  ש: 2,
  ת: 2,
  _: 0,
};

// Sofit counts folded into their regular forms (total stays 100):
// ך(2)→כ, ם(2)→מ, ן(2)→נ, ף(1)→פ, ץ(1)→צ.
export const distribution: Record<string, number> = {
  א: 6,
  ב: 4,
  ג: 2,
  ד: 3,
  ה: 6,
  ו: 12,
  ז: 2,
  ח: 2,
  ט: 1,
  י: 12,
  כ: 4,
  ל: 6,
  מ: 5,
  נ: 5,
  ס: 2,
  ע: 4,
  פ: 3,
  צ: 3,
  ק: 2,
  ר: 6,
  ש: 3,
  ת: 5,
  _: 2,
};
