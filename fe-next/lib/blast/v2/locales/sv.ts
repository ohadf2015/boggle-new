import type { LocaleConfig, ThemeDef } from '../locale-config';
import type { ThemeKey } from '../types';
import { bonusDictLoaders } from '../bonus-dict-loaders';

const TILE_POOL_SV = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ'.split('');

// Swedish corpus letter frequencies
const LETTER_FREQ_SV: Record<string, number> = {
  'E': 0.120, 'A': 0.099, 'R': 0.086, 'T': 0.084, 'N': 0.080,
  'S': 0.076, 'I': 0.064, 'O': 0.059, 'D': 0.055, 'L': 0.052,
  'U': 0.038, 'G': 0.033, 'M': 0.031, 'K': 0.027, 'V': 0.026,
  'H': 0.021, 'Ö': 0.017, 'B': 0.016, 'P': 0.015, 'Å': 0.014,
  'F': 0.013, 'C': 0.012, 'Y': 0.011, 'Ä': 0.010, 'J': 0.007,
  'W': 0.002, 'X': 0.001, 'Z': 0.001, 'Q': 0.001,
};

const T = (key: ThemeKey, words: string[]): ThemeDef => ({
  key, displayKey: `blast.themes.${key}`, wordPool: words,
});

const THEMES_SV: Record<ThemeKey, ThemeDef> = {
  onboarding: T('onboarding', ['KATT', 'SOL', 'ÄGG', 'BIL', 'HUS']),
  fruits: T('fruits', ['ÄPPLE', 'BANAN', 'DRUVA', 'PÄRON', 'KIWI', 'CITRON', 'MELON', 'BÄR']),
  animals: T('animals', ['LEJON', 'BJÖRN', 'VARG', 'HÄST', 'HUND', 'RÄV', 'GRIS', 'ANKA', 'ORM', 'KO']),
  food: T('food', ['BRÖD', 'RIS', 'SOPPA', 'KAKA', 'OST', 'KÖTT', 'MJÖLK', 'SMÖR', 'SOCKER']),
  ocean: T('ocean', ['VÅG', 'FISK', 'SNÄCKA', 'HAJ', 'HAV', 'KORALL', 'SÄL', 'VAL', 'ALG', 'BÅT']),
  space: T('space', ['MÅNE', 'SOL', 'PLANET', 'KOMET', 'RYMD', 'RAKET', 'MARS', 'GALAX', 'STJÄRNA']),
  nature: T('nature', ['TRÄD', 'LÖV', 'ÄLV', 'STEN', 'BLOMMA', 'BERG', 'SKOG', 'SJÖ', 'GRÄS', 'GREN']),
  sports: T('sports', ['BOLL', 'SPRINGA']),
  colors: T('colors', ['RÖD', 'BLÅ', 'GRÖN', 'GUL', 'SVART', 'VIT']),
  transport: T('transport', ['BIL', 'CYKEL', 'PLAN', 'TÅG', 'BÅT', 'BUSS', 'MOPED', 'TAXI']),
  body: T('body', ['HAND', 'BENET', 'ÖGA']),
  home: T('home', ['HUS', 'DÖRR', 'STOL', 'BORD', 'SÄNG', 'LAMPA', 'KÖK', 'SOFFA']),
  school: T('school', ['BOK', 'PENNA', 'KLASS', 'KRITA', 'REGEL', 'PAPPER', 'SUDD', 'VÄSKA', 'RAST']),
  tools: T('tools', ['HAMMARE', 'SAG']),
  weather: T('weather', ['REGN', 'SNÖ', 'VIND', 'MOLN', 'ÅSKA', 'DIMMA', 'STORM', 'IS']),
  music: T('music', ['TRUMMA', 'LÅT', 'GITARR', 'PIANO', 'FLÖJT', 'NOT', 'TON', 'FIOL', 'KÖR']),
  jobs: T('jobs', ['KÖK', 'SJUKSKÖTERSKA']),
  family: T('family', ['MAMMA', 'PAPPA']),
  numbers: T('numbers', ['EN', 'TVÅ', 'TOLV']),
  feelings: T('feelings', ['GLAD', 'LEDSEN']),
  mythology: T('mythology', ['DRAKE', 'JÄTTE', 'HJÄLTE', 'GUD', 'ODEN', 'TOR', 'NÄCKEN', 'SAGA']),
  science: T('science', ['ATOM', 'CELL', 'ENERGI', 'MAGNET', 'GAS', 'SYRA', 'LASER', 'ROBOT', 'FOSSIL']),
  travel: T('travel', ['KARTA', 'TÄLT']),
  art: T('art', ['FÄRG', 'KONST']),
  time: T('time', ['DAG', 'VECKA']),
  joy: T('joy', ['GLAD', 'SKRATT', 'LEENDE', 'LYCKA', 'KUL', 'KRAM', 'DANS', 'FEST']),
  cozy: T('cozy', ['VARM', 'MJUK', 'MYSIG', 'LUGN', 'SOVA', 'HEM', 'FILT', 'TE']),
  spooky: T('spooky', ['SPÖKE', 'HÄXA', 'MASK', 'NATT', 'MÖRK', 'GAST', 'SPINDEL', 'BEN', 'GRAV']),
  magic: T('magic', ['MAGI', 'TROLL', 'STAV', 'DRÖM', 'DRAKE', 'TRYLLA', 'ÄLVA', 'FE']),
  adventure: T('adventure', ['KARTA', 'TÄLT', 'RESA', 'BERG', 'FLOD', 'KOMPASS', 'STIG', 'GROTTA', 'SKOG']),
};

export const SV_CONFIG: LocaleConfig = {
  locale: 'sv',
  rtl: false,
  normalize: (s) => s.toUpperCase(),
  displayChar: (c) => c,
  letterFrequency: LETTER_FREQ_SV,
  tilePool: TILE_POOL_SV,
  wordLengthRange: { min: 3, max: 7 },
  themes: THEMES_SV,
  bonusDictionary: bonusDictLoaders.sv,
  fontStack: 'Fredoka, Rubik, system-ui',
};
