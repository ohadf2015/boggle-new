import type { LocaleConfig, ThemeDef } from '../locale-config';
import type { ThemeKey } from '../types';

const TILE_POOL_HE = 'אבגדהוזחטיכלמנסעפצקרשת'.split(''); // 22 base, no finals
const FINAL_FOLD: Record<string, string> = { 'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ' };
const NON_FINAL_TO_FINAL: Record<string, string> = { 'כ':'ך','מ':'ם','נ':'ן','פ':'ף','צ':'ץ' };
const LETTER_FREQ_HE: Record<string, number> = {
  'י': 0.103, 'ו': 0.097, 'ה': 0.092, 'מ': 0.071, 'ל': 0.070,
  'ר': 0.068, 'נ': 0.067, 'א': 0.066, 'ת': 0.058, 'ב': 0.050,
  'ש': 0.048, 'ע': 0.034, 'ד': 0.032, 'ק': 0.030, 'ח': 0.029,
  'ס': 0.022, 'פ': 0.022, 'כ': 0.020, 'ג': 0.018, 'צ': 0.014,
  'ז': 0.005, 'ט': 0.004,
};

const T = (key: ThemeKey, words: string[]): ThemeDef => ({
  key, displayKey: `blast.themes.${key}`, wordPool: words,
});

const THEMES_HE: Record<ThemeKey, ThemeDef> = {
  onboarding: T('onboarding', ['חתול','שמש','ביצה']),
  fruits: T('fruits', ['תפוח','אגס','בננה','תות']),
  animals: T('animals', ['אריה','דב','זאב','סוס']),
  food: T('food', ['לחם','אורז','מרק','עוגה']),
  ocean: T('ocean', ['גל','דג','צדף','כריש']),
  space: T('space', ['כוכב','ירח','שמש']),
  nature: T('nature', ['עץ','עלה','נהר','אבן']),
  sports: T('sports', ['כדור','רץ']),
  colors: T('colors', ['אדום','כחול','ירוק']),
  transport: T('transport', ['רכב','אופניים','מטוס']),
  body: T('body', ['יד','רגל','עין']),
  home: T('home', ['בית','דלת','כסא']),
  school: T('school', ['ספר','עט','כיתה']),
  tools: T('tools', ['פטיש','מסור']),
  weather: T('weather', ['גשם','שלג','רוח']),
  music: T('music', ['תוף','שיר']),
  jobs: T('jobs', ['טבח','אחות']),
  family: T('family', ['אמא','אבא']),
  numbers: T('numbers', ['אחד','שתים','עשר']),
  feelings: T('feelings', ['שמח','עצוב']),
  mythology: T('mythology', ['דרקון','ענק']),
  science: T('science', ['אטום','תא']),
  travel: T('travel', ['מפה','אוהל']),
  art: T('art', ['צבע','אומנות']),
  time: T('time', ['יום','שבוע']),
};

export const HE_AMBIGUOUS_BLOCKLIST = new Set<string>([]); // Plan 6 native review fills

export const HE_CONFIG: LocaleConfig = {
  locale: 'he',
  rtl: true,
  normalize: (s) => {
    let out = '';
    for (const ch of s) out += FINAL_FOLD[ch] ?? ch;
    return out.normalize('NFC');
  },
  displayChar: (c, pos, len) => {
    if (pos === len - 1 && NON_FINAL_TO_FINAL[c]) return NON_FINAL_TO_FINAL[c]!;
    return c;
  },
  letterFrequency: LETTER_FREQ_HE,
  tilePool: TILE_POOL_HE,
  wordLengthRange: { min: 3, max: 5 },
  themes: THEMES_HE,
  bonusDictionary: async () => new Set<string>(),
  fontStack: 'Rubik, system-ui',
};
