import { describe, it, expect } from 'vitest';
import * as en from '@/translations/en';
import * as es from '@/translations/es';
import * as he from '@/translations/he';
import * as ja from '@/translations/ja';
import * as ru from '@/translations/ru';
import * as sv from '@/translations/sv';
import { WHEEL_RANKS } from '@/lib/wordWheel/rankLadder';

const bundles = { en: en.en, es: es.es, he: he.he, ja: ja.ja, ru: ru.ru, sv: sv.sv } as Record<string, any>;

const required = {
  climb: ['showBoard', 'hideBoard'],
  rank: ['title', 'open', 'toNext', 'top', 'reached', ...WHEEL_RANKS],
  praise: ['nice', 'great', 'superb', 'brilliant', 'fullWheel'],
  strip: ['empty', 'label', 'all', 'close', 'longest'],
};

const sharedKeys = [
  'practice.endRun', 'common.quit', 'common.you', 'wordWheel.timeLeft', 'wordWheel.pointsToPass',
  'wordWheel.tapLetters', 'wordWheel.tapToRemove', 'wordWheel.submit',
  'wordHunt.desktop.liveRanks', 'wordHunt.desktop.beFirst',
];

const lookup = (bundle: any, path: string) => path.split('.').reduce((o, p) => o?.[p], bundle);

describe('word wheel ladder copy', () => {
  it.each(Object.keys(bundles))('%s has every shared string the play screen reads', (locale) => {
    for (const key of sharedKeys) expect(lookup(bundles[locale], key), `${locale}.${key}`).toEqual(expect.any(String));
  });

  it.each(Object.keys(bundles))('%s has every ladder, praise and strip string', (locale) => {
    const ww = bundles[locale].wordWheel;
    for (const [group, keys] of Object.entries(required)) {
      for (const key of keys) expect(ww?.[group]?.[key], `${locale}.${group}.${key}`).toEqual(expect.any(String));
    }
  });

  it.each(Object.keys(bundles))('%s rank names are all different', (locale) => {
    const names = WHEEL_RANKS.map(k => bundles[locale].wordWheel.rank[k]);
    expect(new Set(names).size).toBe(names.length);
  });
});
