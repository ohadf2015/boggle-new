import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

import sitemap from '@/app/sitemap';
import { generateMetadata as rootMeta } from '../page';
import { generateMetadata as langMeta } from '../[lang]/page';
import { generateMetadata as itemMeta } from '../[lang]/[item]/page';
import { generateMetadata as topicMeta } from '../topic/[topic]/page';
import { topicLabel } from '@/lib/seo/wordLists/i18n';
import { getCatalog } from '@/lib/seo/wordLists/catalog';
import { LANG_SEGMENT, absoluteUrl, gradeHubPath, langHubPath, listPath, topicHubPath } from '@/lib/seo/wordLists/paths';
import type { Metadata } from 'next';
import type { WordList } from '@/lib/seo/wordLists/model';

const catalog = getCatalog();
const p = <T,>(v: T) => Promise.resolve(v);
const ALL = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;
const titleOf = (m: Metadata) => (m.title as { absolute: string }).absolute;
const bareTitle = (t: string) => t.replace(/ \| LexiClash$/, '');
const colons = (t: string) => (t.match(/[:：]/g) ?? []).length;
const share = (l: WordList, re: RegExp) => l.words.filter((w) => re.test(w.definition)).length / l.words.length;
const hebrewGlosses = (l: WordList) => share(l, /[֐-׿]/) >= 0.5;
const latinGlosses = (l: WordList) => share(l, /[A-Za-z]/) >= 0.5;

const listMeta = (l: WordList, locale: string) =>
  itemMeta({ params: p({ locale, lang: LANG_SEGMENT[l.lang], item: l.slug }) });

describe('list page titles', () => {
  it('has at most one colon, in every locale a list renders in', async () => {
    for (const l of catalog.lists)
      for (const locale of l.locales) {
        const t = bareTitle(titleOf(await listMeta(l, locale)));
        expect(colons(t), `${locale} ${l.slug}: ${t}`).toBeLessThanOrEqual(1);
      }
  });

  it('writes "Grade 5 Everyday Words: English Word List and Class Game" without repeating the topic', async () => {
    const l = catalog.lists.find((x) => x.slug.startsWith('everyday-words-grade-5') && x.lang === 'en')!;
    expect(titleOf(await listMeta(l, 'en'))).toBe('Grade 5 Everyday Words: English Word List and Class Game');
  });

  it('keeps a named list to one name, one language, one colon', async () => {
    const l = catalog.lists.find((x) => x.slug.startsWith('basic-clothes-grade-1') && x.lang === 'en')!;
    expect(titleOf(await listMeta(l, 'en'))).toBe('Grade 1 Basic Clothes: English Word List and Class Game');
  });

  it('names a foreign-language list in Hebrew by its topic, not by a teacher\'s "English with Hebrew definitions" label', async () => {
    const l = catalog.lists.find((x) => x.lang === 'en' && !x.name.latin && x.locales.includes('he'))!;
    const t = titleOf(await listMeta(l, 'he'));
    expect(t).toContain(topicLabel('he', l.topic));
    expect(t).not.toContain(l.name.hebrew);
  });

  it('stays short enough to survive a results page', async () => {
    const over: string[] = [];
    for (const l of catalog.lists)
      for (const locale of l.locales) {
        const t = bareTitle(titleOf(await listMeta(l, locale)));
        if (t.length > 65) over.push(`${locale} ${l.slug} (${t.length}): ${t}`);
      }
    expect(over).toEqual([]);
  });
});

describe('hub titles', () => {
  async function hubTitles(): Promise<Array<[string, string]>> {
    const out: Array<[string, string]> = [];
    for (const locale of ALL) out.push([`root ${locale}`, titleOf(await rootMeta({ params: p({ locale }) }))]);
    for (const h of catalog.langHubs)
      for (const locale of h.locales)
        out.push([`lang ${h.lang} ${locale}`, titleOf(await langMeta({ params: p({ locale, lang: LANG_SEGMENT[h.lang] }) }))]);
    for (const h of catalog.gradeHubs)
      for (const locale of h.locales)
        out.push([
          `grade ${h.lang}-${h.grade} ${locale}`,
          titleOf(await itemMeta({ params: p({ locale, lang: LANG_SEGMENT[h.lang], item: `grade-${h.grade}` }) })),
        ]);
    for (const h of catalog.topicHubs)
      for (const locale of h.locales)
        out.push([`topic ${h.topic} ${locale}`, titleOf(await topicMeta({ params: p({ locale, topic: h.topic }) }))]);
    return out;
  }

  it('has one colon at most, no doubled word, and fits a results page', async () => {
    for (const [label, full] of await hubTitles()) {
      const t = bareTitle(full);
      expect(colons(t), `${label}: ${t}`).toBeLessThanOrEqual(1);
      expect(t, `${label}: ${t}`).not.toMatch(/(^|\s)(\S{3,})\s+\2(\s|$)/i);
      expect(t.length, `${label}: ${t}`).toBeLessThanOrEqual(65);
    }
  });

  it('does not repeat the topic inside a topic hub title', async () => {
    const t = titleOf(await topicMeta({ params: p({ locale: 'en', topic: 'everyday-words' }) }));
    expect(bareTitle(t)).toBe('Word Lists: Everyday Words');
  });
});

describe('meta descriptions only say "definitions" when the glosses are in the page language', () => {
  const desc = async (l: WordList, locale: string) => String((await listMeta(l, locale)).description);

  it('says definitions on an English page whose glosses are English', async () => {
    const l = catalog.lists.find((x) => x.lang === 'en' && latinGlosses(x) && !hebrewGlosses(x))!;
    expect(await desc(l, 'en')).toContain('with definitions');
  });

  it('says Hebrew translations, not definitions, when an English page shows only Hebrew glosses', async () => {
    const l = catalog.lists.find((x) => x.lang === 'en' && hebrewGlosses(x) && !latinGlosses(x) && x.locales.includes('en'))!;
    const d = await desc(l, 'en');
    expect(d).toContain('Hebrew translations');
    expect(d).not.toMatch(/with definitions/);
  });

  it('names the gloss language on a Spanish list seen from the English page', async () => {
    const l = catalog.lists.find((x) => x.lang === 'es' && x.locales.includes('en'))!;
    const d = await desc(l, 'en');
    expect(d).toContain('Spanish definitions');
    expect(d).not.toMatch(/with definitions/);
  });

  it('says definitions in Hebrew only when the glosses are Hebrew', async () => {
    const heLatinOnly = catalog.lists.find((x) => x.lang === 'he' && !hebrewGlosses(x) && latinGlosses(x));
    if (heLatinOnly) expect(await desc(heLatinOnly, 'he')).not.toContain('עם הגדרות:');
    const heHebrew = catalog.lists.find((x) => x.lang === 'he' && hebrewGlosses(x))!;
    expect(await desc(heHebrew, 'he')).toContain('עם הגדרות');
  });

  it('never claims definitions on a hub, whose lists carry glosses in mixed languages', async () => {
    const claim = /definitions|définitions|הגדרות|definiciones|definición|förklaring|意味|определени/i;
    const out: string[] = [];
    for (const locale of ALL) out.push(String((await rootMeta({ params: p({ locale }) })).description));
    for (const h of catalog.langHubs)
      for (const locale of h.locales) out.push(String((await langMeta({ params: p({ locale, lang: LANG_SEGMENT[h.lang] }) })).description));
    for (const h of catalog.gradeHubs)
      for (const locale of h.locales)
        out.push(String((await itemMeta({ params: p({ locale, lang: LANG_SEGMENT[h.lang], item: `grade-${h.grade}` }) })).description));
    for (const h of catalog.topicHubs)
      for (const locale of h.locales) out.push(String((await topicMeta({ params: p({ locale, topic: h.topic }) })).description));
    expect(out.filter((d) => claim.test(d)).slice(0, 3)).toEqual([]);
  });
});

describe('hreflang is exactly the set of locales a page renders in, and the sitemap agrees', () => {
  const sm = new Map(sitemap().map((r) => [r.url, r.alternates?.languages as Record<string, string> | undefined]));

  async function renders(fn: () => Promise<Metadata>): Promise<Metadata | null> {
    try {
      return await fn();
    } catch (e) {
      if ((e as Error).message === 'NEXT_NOT_FOUND') return null;
      throw e;
    }
  }

  async function checkPage(label: string, path: string, meta: (locale: string) => Promise<Metadata>) {
    const live: string[] = [];
    const langsByLocale = new Map<string, Record<string, string>>();
    for (const locale of ALL) {
      const m = await renders(() => meta(locale));
      if (!m) {
        expect(sm.has(absoluteUrl(locale, path)), `${label}: ${locale} 404s but is in the sitemap`).toBe(false);
        continue;
      }
      live.push(locale);
      langsByLocale.set(locale, m.alternates!.languages as Record<string, string>);
    }
    expect(live.length, label).toBeGreaterThan(0);
    for (const locale of live) {
      const langs = langsByLocale.get(locale)!;
      expect(langs['x-default'], `${label} ${locale}`).toBeTruthy();
      const targets = Object.entries(langs).map(([k, v]) => [k, v.split('/')[3]] as const);
      for (const [code, target] of targets) {
        expect(live, `${label} ${locale}: alternate ${code} points at ${target}, which 404s`).toContain(target);
      }
      expect(new Set(targets.map(([, t]) => t)), `${label} ${locale}`).toEqual(new Set(live));
      expect(langs, `${label} ${locale} head differs from the cluster of ${live[0]}`).toEqual(langsByLocale.get(live[0]));
      const smLangs = sm.get(absoluteUrl(locale, path));
      expect(smLangs, `${label} ${locale} sitemap`).toBeTruthy();
      expect(smLangs, `${label} ${locale} sitemap alternates`).toEqual(langs);
    }
  }

  it('holds for every list page', async () => {
    for (const l of catalog.lists) await checkPage(l.slug, listPath(l), (locale) => listMeta(l, locale));
  });

  it('holds for the library hub and every language, grade and topic hub', async () => {
    await checkPage('root', '/education/lists', (locale) => rootMeta({ params: p({ locale }) }));
    for (const h of catalog.langHubs)
      await checkPage(`lang ${h.lang}`, langHubPath(h.lang), (locale) => langMeta({ params: p({ locale, lang: LANG_SEGMENT[h.lang] }) }));
    for (const h of catalog.gradeHubs)
      await checkPage(`grade ${h.lang}-${h.grade}`, gradeHubPath(h.lang, h.grade), (locale) =>
        itemMeta({ params: p({ locale, lang: LANG_SEGMENT[h.lang], item: `grade-${h.grade}` }) }),
      );
    for (const h of catalog.topicHubs)
      await checkPage(`topic ${h.topic}`, topicHubPath(h.topic), (locale) => topicMeta({ params: p({ locale, topic: h.topic }) }));
  });
});
