import type { LocaleConfig, ThemeDef } from '../locale-config';
import type { ThemeKey } from '../types';
import { bonusDictLoaders } from '../bonus-dict-loaders';

// Basic hiragana set (46 characters)
const TILE_POOL_JA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split('');

// Japanese letter frequencies (approximate from common usage)
const LETTER_FREQ_JA: Record<string, number> = {
  'の': 0.040, 'い': 0.038, 'う': 0.037, 'た': 0.036, 'し': 0.034,
  'て': 0.033, 'ん': 0.031, 'で': 0.030, 'あ': 0.029, 'る': 0.028,
  'と': 0.026, 'か': 0.024, 'り': 0.022, 'ほ': 0.020, 'も': 0.019,
  'ま': 0.018, 'ね': 0.017, 'を': 0.016, 'す': 0.015, 'ら': 0.014,
  'こ': 0.013, 'さ': 0.012, 'ち': 0.011, 'ゃ': 0.010, 'け': 0.009,
  'に': 0.008, 'ぎ': 0.007, 'ざ': 0.006, 'つ': 0.005, 'や': 0.004,
  'わ': 0.003, 'ぞ': 0.002, 'み': 0.002, 'ぬ': 0.002, 'そ': 0.002,
  'な': 0.002, 'ぜ': 0.001, 'ぱ': 0.001, 'え': 0.001, 'お': 0.001,
  'ぴ': 0.001, 'ぷ': 0.001, 'ぺ': 0.001, 'ぽ': 0.001, 'ぶ': 0.001,
  'ふ': 0.001,
};

const T = (key: ThemeKey, words: string[]): ThemeDef => ({
  key, displayKey: `blast.themes.${key}`, wordPool: words,
});

const THEMES_JA: Record<ThemeKey, ThemeDef> = {
  onboarding: T('onboarding', ['ねこ', 'ひ', 'たまご']),
  fruits: T('fruits', ['りんご', 'ばなな', 'みかん', 'ぶどう']),
  animals: T('animals', ['ライオン', 'くま', 'おおかみ', 'うま']),
  food: T('food', ['パン', 'こめ', 'スープ', 'ケーキ']),
  ocean: T('ocean', ['なみ', 'さかな', 'かい', 'さめ']),
  space: T('space', ['ほし', 'つき', 'たいよう']),
  nature: T('nature', ['き', 'は', 'かわ', 'いし']),
  sports: T('sports', ['ボール', 'はしる']),
  colors: T('colors', ['あか', 'あお', 'みどり']),
  transport: T('transport', ['くるま', 'じてんしゃ', 'ひこうき']),
  body: T('body', ['て', 'あし', 'め']),
  home: T('home', ['いえ', 'ドア', 'いす']),
  school: T('school', ['ほん', 'ペン', 'がっこう']),
  tools: T('tools', ['ハンマー', 'のこぎり']),
  weather: T('weather', ['あめ', 'ゆき', 'かぜ']),
  music: T('music', ['たいこ', 'うた']),
  jobs: T('jobs', ['コック', 'かんごふ']),
  family: T('family', ['おかあさん', 'おとうさん']),
  numbers: T('numbers', ['いち', 'に', 'じゅう']),
  feelings: T('feelings', ['うれしい', 'かなしい']),
  mythology: T('mythology', ['ドラゴン', 'きょじん']),
  science: T('science', ['げんし', 'さいぼう']),
  travel: T('travel', ['ちず', 'テント']),
  art: T('art', ['いろ', 'げいじゅつ']),
  time: T('time', ['ひ', 'しゅうかん']),
  joy: T('joy', ['うれしい', 'えがお', 'わらい', 'たのしい']),
  cozy: T('cozy', ['あたたかい', 'やわらかい', 'しずか', 'ねむい']),
  spooky: T('spooky', ['こわい', 'おばけ', 'くらい', 'まじょ']),
  magic: T('magic', ['まほう', 'ようせい', 'ねがい', 'ゆめ']),
  adventure: T('adventure', ['ちず', 'たび', 'やま', 'かわ']),
};

export const JA_CONFIG: LocaleConfig = {
  locale: 'ja',
  rtl: false,
  normalize: (s) => s.normalize('NFC'),
  displayChar: (c) => c,
  letterFrequency: LETTER_FREQ_JA,
  tilePool: TILE_POOL_JA,
  wordLengthRange: { min: 2, max: 4 },
  themes: THEMES_JA,
  bonusDictionary: bonusDictLoaders.ja,
  fontStack: 'Noto Sans JP, system-ui',
  tileExtraPadding: 2,
};
