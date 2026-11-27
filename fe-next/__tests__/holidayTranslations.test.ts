import { describe, expect, it } from 'vitest';
import { HOLIDAY_ALL_PART_KEYS } from '../lib/holidayEvent/rewards';

const LANGS = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;


const PART_IDS = HOLIDAY_ALL_PART_KEYS.map((k) => k.slice(k.indexOf(':') + 1));

type Tree = { [k: string]: string | Tree };

function leaves(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[path] = v;
    else Object.assign(out, leaves(v, path));
  }
  return out;
}

async function holidayOf(lang: string): Promise<Tree> {
  const mod: Record<string, Record<string, unknown>> = await import(`../translations/${lang}.js`);
  return mod[lang].holiday as Tree;
}

describe('holiday translations', () => {
  it('en names both events, both titles and every holiday avatar part', async () => {
    const en = leaves(await holidayOf('en'));
    expect(en['event.hanukkah.title']).toBe('Festival of Lights');
    expect(en['event.christmas.title']).toBe('Snow Clash');
    expect(en['title.keeperOfTheLight']).toBe('Keeper of the Light');
    expect(en['title.snowChampion']).toBe('Snow Champion');
    for (const id of PART_IDS) expect(en[`part.${id}`], id).toBeTruthy();
  });

  it.each(LANGS.filter((l) => l !== 'en'))('%s has every en key, translated, with the same placeholders', async (lang) => {
    const en = leaves(await holidayOf('en'));
    const other = leaves(await holidayOf(lang));
    for (const [key, value] of Object.entries(en)) {
      expect(other[key], `${lang} missing holiday.${key}`).toBeTruthy();
      const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).filter((p) => !(key.endsWith('_one') && p === '{count}')).sort();
      expect(placeholders(other[key]), `${lang} holiday.${key}`).toEqual(placeholders(value));
    }
    expect(other['event.hanukkah.title']).not.toBe(en['event.hanukkah.title']);
  });
});
