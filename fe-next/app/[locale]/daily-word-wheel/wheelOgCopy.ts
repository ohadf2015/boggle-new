export type WheelOgLocale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

export interface WheelOgCopy {
  kicker: string;
  title: string;
  line: string;
  cta: string;
  center: string;
  outer: string[];
  word: string[];
}

export const WHEEL_OG: Record<WheelOgLocale, WheelOgCopy> = {
  en: {
    kicker: 'Daily puzzle',
    title: 'Daily Word Wheel',
    line: "How many words can you spin out of today's wheel?",
    cta: 'Play free',
    center: 'A',
    outer: ['P', 'L', 'N', 'E', 'T', 'S'],
    word: ['P', 'L', 'A', 'N', 'E', 'T'],
  },
  he: {
    kicker: 'פאזל יומי',
    title: 'גלגל מילים יומי',
    line: 'כמה מילים תצליחו להוציא מהגלגל של היום?',
    cta: 'שחקו בחינם',
    center: 'ל',
    outer: ['ש', 'ו', 'ם', 'מ', 'י', 'ג'],
    word: ['ש', 'ל', 'ו', 'ם'],
  },
  sv: {
    kicker: 'Dagens pussel',
    title: 'Dagligt Ordhjul',
    line: 'Hur många ord hittar du i dagens hjul?',
    cta: 'Spela gratis',
    center: 'E',
    outer: ['S', 'P', 'L', 'A', 'R', 'Ö'],
    word: ['S', 'P', 'E', 'L', 'A'],
  },
  ja: {
    kicker: '毎日のパズル',
    title: 'デイリーワードホイール',
    line: '今日のホイールで、単語をいくつ作れる？',
    cta: '無料でプレイ',
    center: 'か',
    outer: ['さ', 'な', 'ま', 'た', 'い', 'ら'],
    word: ['さ', 'か', 'な'],
  },
  es: {
    kicker: 'Puzzle diario',
    title: 'Rueda de Palabras Diaria',
    line: '¿Cuántas palabras sacas de la rueda de hoy?',
    cta: 'Juega gratis',
    center: 'E',
    outer: ['R', 'U', 'D', 'A', 'S', 'L'],
    word: ['R', 'U', 'E', 'D', 'A'],
  },
  ru: {
    kicker: 'Головоломка дня',
    title: 'Ежедневное колесо слов',
    line: 'Сколько слов вы соберёте из сегодняшнего колеса?',
    cta: 'Играть бесплатно',
    center: 'О',
    outer: ['С', 'Л', 'В', 'А', 'Р', 'Е'],
    word: ['С', 'Л', 'О', 'В', 'А'],
  },
};

export function wheelOgLocale(locale: string): WheelOgLocale {
  return locale in WHEEL_OG ? (locale as WheelOgLocale) : 'en';
}
