/** Tiny how-to wheels (center + 4). Word lists are every dictionary word these letters spell (3-5 letters, through the center). */
export interface HowToPuzzle { center: string; outer: string[]; hint: string; words: string[] }

export const HOW_TO_PUZZLES: Record<string, HowToPuzzle> = {
  en: {
    center: 'a',
    outer: ['c', 't', 'r', 'e'],
    hint: 'cat',
    words: ['ace', 'acer', 'acre', 'act', 'arc', 'are', 'aret', 'art', 'ate', 'car', 'care', 'caret', 'cart', 'carte', 'cat', 'cate', 'cater', 'crate', 'ear', 'eat', 'era', 'eta', 'race', 'rat', 'rate', 'react', 'recta', 'tace', 'tae', 'tar', 'tare', 'tea', 'tear', 'trace'],
  },
  he: {
    center: 'ל',
    outer: ['כ', 'ב', 'ש', 'א'],
    hint: 'כלב',
    words: ['אבל', 'אבלכ', 'אבשל', 'אכבל', 'אכל', 'אכשל', 'אלבש', 'אלכ', 'אשכל', 'אשל', 'אשלב', 'אשלכ', 'בלש', 'בלשכ', 'בשל', 'בשלכ', 'כבל', 'כלא', 'כלב', 'כשל', 'לאשכב', 'לבכ', 'לבש', 'לבשכ', 'שאל', 'שאלכ', 'שכל', 'שלב', 'שלבכ', 'שלכ'],
  },
  sv: {
    center: 'a',
    outer: ['t', 'k', 'l', 's'],
    hint: 'tak',
    words: ['akt', 'als', 'ask', 'kal', 'kat', 'las', 'lat', 'sak', 'sal', 'ska', 'tak', 'tal', 'tas', 'akts', 'kalt', 'kast', 'kats', 'last', 'salt', 'skal', 'slak', 'stal', 'taks', 'tals', 'slakt'],
  },
  ja: {
    center: 'か',
    outer: ['さ', 'た', 'な', 'い'],
    hint: 'さかな',
    words: ['いなか', 'かいな', 'かさい', 'かたい', 'かたな', 'かない', 'かなた', 'さかい', 'さかな', 'さなか', 'たいか', 'たかい', 'ないか', 'いかな', 'いたか', 'かいさ', 'かたさ', 'さいか', 'たかさ', 'たかな', 'なかい', 'かいた', 'かさない', 'かたさない', 'かたない', 'さかない', 'たかない'],
  },
  es: {
    center: 'a',
    outer: ['s', 'o', 'l', 'r'],
    hint: 'sal',
    words: ['arlo', 'arlos', 'aro', 'aros', 'aso', 'lar', 'las', 'laso', 'loa', 'loar', 'loas', 'lora', 'loras', 'losa', 'losar', 'oas', 'ola', 'olas', 'ora', 'oral', 'oras', 'orla', 'orlas', 'osa', 'osar', 'ralo', 'ralos', 'ras', 'raso', 'roa', 'roas', 'rola', 'rolas', 'rosa', 'rosal', 'sal', 'salo', 'sao', 'sola', 'solar', 'sora'],
  },
  ru: {
    center: 'о',
    outer: ['к', 'т', 'р', 'с'],
    hint: 'кот',
    words: ['кор', 'корс', 'корт', 'кос', 'кост', 'кот', 'кро', 'крот', 'кто', 'окр', 'орк', 'орск', 'орт', 'оск', 'ост', 'остр', 'отк', 'откр', 'отр', 'отс', 'рок', 'рос', 'роск', 'рост', 'рот', 'ско', 'скор', 'скот', 'скро', 'сок', 'сокр', 'сор', 'сорт', 'сот', 'сотр', 'срок', 'сто', 'сток', 'стор', 'стро', 'строк', 'тко', 'ток', 'тор', 'торк', 'торс', 'тос', 'тоск', 'тро', 'трок', 'трос'],
  },
};

export function howToPuzzle(language: string): HowToPuzzle {
  return HOW_TO_PUZZLES[language] ?? HOW_TO_PUZZLES.en;
}
