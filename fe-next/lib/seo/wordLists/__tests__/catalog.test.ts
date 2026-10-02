import { describe, it, expect } from 'vitest';
import {
  getCatalog,
  findList,
  findGradeHub,
  findTopicHub,
  findLangHub,
  relatedLists,
  MIN_GRADE_HUB_LISTS,
  MIN_TOPIC_HUB_LISTS,
} from '../catalog';
import { MIN_WORDS } from '../model';
import { LISTS_PATH, listPath, gradeHubPath, clusterAlternates, pickLocale, hubLocales } from '../paths';
import { HREFLANG_BASE_URL } from '@/lib/seo/hreflang';

const catalog = getCatalog();

describe('catalog from the shipped snapshot', () => {
  it('publishes only lists with at least MIN_WORDS real words', () => {
    expect(catalog.lists.length).toBeGreaterThan(50);
    for (const l of catalog.lists) expect(l.words.length, l.slug).toBeGreaterThanOrEqual(MIN_WORDS);
  });

  it('gives every list a unique URL', () => {
    const paths = catalog.lists.map(listPath);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('never offers a list detail page in a locale that cannot read it', () => {
    for (const l of catalog.lists) {
      expect(l.locales[0]).toBe(l.lang);
      expect(l.locales).not.toContain('ru');
      if (l.lang === 'en' && !l.locales.includes('he')) expect(l.locales).toEqual(['en']);
    }
  });

  it('only builds grade and topic hubs that are not thin', () => {
    expect(catalog.gradeHubs.length).toBeGreaterThan(5);
    for (const h of catalog.gradeHubs) expect(h.lists.length).toBeGreaterThanOrEqual(MIN_GRADE_HUB_LISTS);
    expect(catalog.topicHubs.length).toBeGreaterThan(5);
    for (const h of catalog.topicHubs) expect(h.lists.length).toBeGreaterThanOrEqual(MIN_TOPIC_HUB_LISTS);
  });

  it('resolves every list, grade hub and topic hub back from its URL parts', () => {
    for (const l of catalog.lists) {
      const [, , , seg, slug] = listPath(l).split('/');
      expect(findList(seg, slug)?.id).toBe(l.id);
    }
    for (const h of catalog.gradeHubs) {
      const [, , , seg, item] = gradeHubPath(h.lang, h.grade).split('/');
      expect(findGradeHub(seg, item)?.lists.length).toBe(h.lists.length);
    }
    for (const h of catalog.topicHubs) expect(findTopicHub(h.topic)).toBeTruthy();
    expect(findLangHub('english')?.locales).toEqual(['en', 'he', 'es', 'sv', 'ja']);
    expect(findList('english', 'nope-000000')).toBeNull();
    expect(findGradeHub('english', 'grade-99')).toBeNull();
  });

  it('finds six related lists for every list, never itself', () => {
    for (const l of catalog.lists) {
      const related = relatedLists(l);
      expect(related.length, l.slug).toBeGreaterThanOrEqual(6);
      expect(related.map((r) => r.id)).not.toContain(l.id);
      expect(new Set(related.map((r) => r.id)).size).toBe(related.length);
    }
  });

  it('prefers same-grade, same-language siblings first', () => {
    const l = catalog.lists.find((x) => x.lang === 'en' && x.grade === 3)!;
    expect(relatedLists(l)[0].grade).toBe(3);
    expect(relatedLists(l)[0].lang).toBe('en');
  });
});

describe('paths and hreflang clusters', () => {
  it('builds a reciprocal cluster: every alternate names every other', () => {
    const l = catalog.lists.find((x) => x.locales.length > 1)!;
    const alts = clusterAlternates(listPath(l), l.locales);
    expect(Object.keys(alts).sort()).toEqual([...l.locales, 'x-default'].sort());
    expect(alts['x-default']).toBe(`${HREFLANG_BASE_URL}/${l.locales[0]}${listPath(l)}`);
  });

  it('falls back to the primary locale when the current one has no page', () => {
    expect(pickLocale(['he', 'en'], 'ja')).toBe('he');
    expect(pickLocale(['he', 'en'], 'en')).toBe('en');
  });

  it('serves the library hub in all six locales', () => {
    expect(hubLocales()).toEqual(['en', 'he', 'es', 'sv', 'ja', 'ru']);
    expect(LISTS_PATH).toBe('/education/lists');
  });
});
