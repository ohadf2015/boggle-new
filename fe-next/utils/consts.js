export const hebrewLetters = [
    "א",
    "ב",
    "ג",
    "ד",
    "ה",
    "ו",
    "ז",
    "ח",
    "ט",
    "י",
    "כ",
    "ל",
    "מ",
    "נ",
    "ס",
    "ע",
    "פ",
    "צ",
    "ק",
    "ר",
    "ש",
    "ת",
  ];

export const englishLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const swedishLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ'.split('');

export const japaneseLetters = [
  "あ", "い", "う", "え", "お",
  "か", "き", "く", "け", "こ",
  "さ", "し", "す", "せ", "そ",
  "た", "ち", "つ", "て", "と",
  "な", "に", "ぬ", "ね", "の",
  "は", "ひ", "ふ", "へ", "ほ",
  "ま", "み", "む", "め", "も",
  "や", "ゆ", "よ",
  "ら", "り", "る", "れ", "ろ",
  "わ", "を", "ん",
];

export const DIFFICULTIES = {
  EASY: { nameKey: 'difficulty.easy', rows: 4, cols: 4 },
  MEDIUM: { nameKey: 'difficulty.medium', rows: 5, cols: 5 },
  HARD: { nameKey: 'difficulty.hard', rows: 7, cols: 7 },
  EXPERT: { nameKey: 'difficulty.expert', rows: 9, cols: 9 },
  MASTER: { nameKey: 'difficulty.master', rows: 11, cols: 11 },
};

export const DEFAULT_DIFFICULTY = 'HARD';
  