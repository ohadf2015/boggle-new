import type { HolidayKey } from './calendar';

type WordList = Record<string, readonly string[]>;

const SECRETS: Record<HolidayKey, Record<string, WordList>> = {
  hanukkah: {
    en: { maccabee: ['maccabee'], miracle: ['miracle'], latke: ['latke'], sufganiyah: ['sufganiyah'], dreidel: ['dreidel'] },
    he: { maccabee: ['מכבי'], miracle: ['נס'], latke: ['לביבה'], sufganiyah: ['סופגניה'], dreidel: ['סביבון'] },
    es: { maccabee: ['macabeo'], miracle: ['milagro'], latke: ['latke'], sufganiyah: ['sufganiya'], dreidel: ['perinola'] },
    sv: { miracle: ['mirakel'], latke: ['latke'], sufganiyah: ['munk'], dreidel: ['dreidel'] },
    ru: { maccabee: ['маккавей'], miracle: ['чудо'], latke: ['латке'], sufganiyah: ['пончик'], dreidel: ['волчок'] },
  },
  christmas: {
    en: { santa: ['santa'], rudolph: ['rudolph'], mistletoe: ['mistletoe'], elf: ['elf'], sleigh: ['sleigh'] },
    he: { santa: ['סנטה'], rudolph: ['רודולף'], mistletoe: ['דבקון'], elf: ['שדון'], sleigh: ['מזחלת'] },
    es: { santa: ['papanoel'], rudolph: ['rodolfo'], mistletoe: ['muérdago'], elf: ['elfo'], sleigh: ['trineo'], reyes: ['reyes'] },
    sv: { santa: ['tomte'], rudolph: ['rudolf'], mistletoe: ['mistel'], elf: ['nisse'], sleigh: ['släde'], lucia: ['lucia'] },
    ru: { santa: ['санта'], rudolph: ['рудольф'], mistletoe: ['омела'], elf: ['эльф'], sleigh: ['сани'], yolka: ['ёлка'] },
  },
};

const HE_FINALS: Record<string, string> = { 'ם': 'מ', 'ן': 'נ', 'ץ': 'צ', 'ף': 'פ', 'ך': 'כ' };

export const OTHER_EGGS = [
  'mascot_spin', 'mascot_snowball', 'snowglobe', 'bells108', 'chimes', 'inocente', 'roscon',
  'lost_latke', 'snowman', 'gingerbread', 'lucia', 'sleigh', 'dreidel_pe', 'boxing_day',
] as const;

export const EGG_IDS: readonly string[] = [
  ...new Set([
    ...Object.values(SECRETS).flatMap((byLang) => Object.values(byLang).flatMap((l) => Object.keys(l).map((k) => `word_${k}`))),
    ...OTHER_EGGS,
  ]),
];

export function isEggId(v: unknown): v is string {
  return typeof v === 'string' && EGG_IDS.includes(v);
}

function lang(locale: string): string {
  return locale.slice(0, 2).toLowerCase();
}

export function normalizeSecret(word: string, locale: string): string {
  let w = word.trim().toLowerCase();
  const l = lang(locale);
  if (l === 'he') w = w.replace(/[םןץףך]/g, (c) => HE_FINALS[c]);
  if (l === 'ru') w = w.replace(/ё/g, 'е');
  if (l === 'es') w = w.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return w;
}

export function secretWordIds(locale: string, holiday: HolidayKey): string[] {
  return Object.keys(SECRETS[holiday][lang(locale)] ?? {}).map((k) => `word_${k}`);
}

export function matchSecretWord(word: string, locale: string, holiday: HolidayKey): string | null {
  const list = SECRETS[holiday][lang(locale)];
  if (!list || !word) return null;
  const w = normalizeSecret(word, locale);
  for (const [id, words] of Object.entries(list)) {
    if (words.some((s) => normalizeSecret(s, locale) === w)) return `word_${id}`;
  }
  return null;
}
