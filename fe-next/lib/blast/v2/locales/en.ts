import type { LocaleConfig, ThemeDef } from '../locale-config';
import type { ThemeKey } from '../types';
import { bonusDictLoaders } from '../bonus-dict-loaders';

const TILE_POOL_EN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Norvig corpus letter frequencies
const LETTER_FREQ_EN: Record<string, number> = {
  'E': 0.127, 'T': 0.091, 'A': 0.082, 'O': 0.075, 'I': 0.070,
  'N': 0.067, 'S': 0.063, 'H': 0.061, 'R': 0.060, 'D': 0.043,
  'L': 0.040, 'U': 0.028, 'C': 0.028, 'M': 0.024, 'W': 0.024,
  'F': 0.022, 'G': 0.020, 'Y': 0.020, 'P': 0.019, 'B': 0.015,
  'V': 0.010, 'K': 0.008, 'J': 0.002, 'X': 0.002, 'Q': 0.001, 'Z': 0.001,
};

const T = (key: ThemeKey, words: string[]): ThemeDef => ({
  key, displayKey: `blast.themes.${key}`, wordPool: words,
});

const THEMES_EN: Record<ThemeKey, ThemeDef> = {
  onboarding: T('onboarding', ['CAT', 'SUN', 'EGG']),
  fruits: T('fruits', ['APPLE', 'BANANA', 'ORANGE', 'GRAPE']),
  animals: T('animals', ['LION', 'BEAR', 'WOLF', 'HORSE']),
  food: T('food', ['BREAD', 'RICE', 'SOUP', 'CAKE']),
  ocean: T('ocean', ['WAVE', 'FISH', 'SHELL', 'SHARK']),
  space: T('space', ['STAR', 'MOON', 'SUN', 'PLANET']),
  nature: T('nature', ['TREE', 'LEAF', 'RIVER', 'STONE']),
  sports: T('sports', ['BALL', 'RUN', 'SCORE']),
  colors: T('colors', ['RED', 'BLUE', 'GREEN']),
  transport: T('transport', ['CAR', 'BIKE', 'PLANE']),
  body: T('body', ['HAND', 'LEG', 'EYE']),
  home: T('home', ['HOUSE', 'DOOR', 'CHAIR']),
  school: T('school', ['BOOK', 'PEN', 'CLASS']),
  tools: T('tools', ['HAMMER', 'SAW']),
  weather: T('weather', ['RAIN', 'SNOW', 'WIND']),
  music: T('music', ['DRUM', 'SONG']),
  jobs: T('jobs', ['COOK', 'NURSE']),
  family: T('family', ['MOM', 'DAD']),
  numbers: T('numbers', ['ONE', 'TWO', 'TWELVE']),
  feelings: T('feelings', ['HAPPY', 'SAD']),
  mythology: T('mythology', ['DRAGON', 'GIANT']),
  science: T('science', ['ATOM', 'CELL']),
  travel: T('travel', ['MAP', 'TENT']),
  art: T('art', ['PAINT', 'ART']),
  time: T('time', ['DAY', 'WEEK']),
};

export const EN_CONFIG: LocaleConfig = {
  locale: 'en',
  rtl: false,
  normalize: (s) => s.toUpperCase(),
  displayChar: (c) => c,
  letterFrequency: LETTER_FREQ_EN,
  tilePool: TILE_POOL_EN,
  wordLengthRange: { min: 3, max: 7 },
  themes: THEMES_EN,
  bonusDictionary: bonusDictLoaders.en,
  fontStack: 'Fredoka, Rubik, system-ui',
};
