/**
 * mpUi.results resolves through the IMPORTED bundle in all six locales (never
 * grep — sv.js carries a duplicate top-level key, and only the last one wins).
 */
import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

type Bundle = { mpUi?: { results?: Record<string, string> } };
const LOCALES: Record<string, Bundle> = { en, he, sv, ja, es, ru } as unknown as Record<string, Bundle>;
const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

/** Every key the results screens call t() with. */
const USED = [
  'time', 'finalTitle', 'roundDone', 'details', 'detailsTitle', 'skipHint', 'you', 'pts', 'winner', 'placeOf',
  'behind', 'ahead', 'tiedWith', 'tiedWithMore', 'bestWord', 'xp', 'coins', 'seriesTotal', 'moreHidden', 'nextUp', 'hostPicking',
  'tapToChange', 'chooseMode', 'startNext', 'ready', 'youreReady', 'readyCount', 'waitingHost', 'autoIn',
  'cancelAuto', 'autoOff', 'rematch', 'newSeries', 'leave', 'share', 'seriesChampion', 'teacherPaced',
  'roundPoints', 'yourRank', 'lessonRecap',
];

describe('mpUi.results translations', () => {
  const base = LOCALES.en.mpUi?.results ?? {};

  it('en defines every key the screens use', () => {
    for (const k of USED) expect(typeof base[k], k).toBe('string');
  });

  for (const [lang, bundle] of Object.entries(LOCALES)) {
    it(`${lang}: same keys as en, non-empty, same {placeholders}`, () => {
      const block = bundle.mpUi?.results ?? {};
      expect(Object.keys(block).sort()).toEqual(Object.keys(base).sort());
      for (const [k, v] of Object.entries(block)) {
        expect(v.trim().length, `${lang}.${k}`).toBeGreaterThan(0);
        expect(vars(v), `${lang}.${k}`).toEqual(vars(base[k]));
      }
    });
  }

  it('non-English locales are actually translated (not copies of en)', () => {
    for (const lang of ['he', 'ja', 'ru']) {
      const block = LOCALES[lang].mpUi?.results ?? {};
      expect(block.finalTitle).not.toBe(base.finalTitle);
      expect(block.startNext).not.toBe(base.startNext);
    }
  });
});
