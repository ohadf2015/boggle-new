import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { es } from '@/translations/es.js';
import { ru } from '@/translations/ru.js';
import {
  HELP_ARTICLES,
  HELP_POPULAR,
  HELP_SLUGS,
  HELP_TUTORIALS,
} from '../helpRegistry';
import { HELP_CATEGORY_IDS, HELP_LOCALES, type HelpBlock } from '../helpTypes';
import { getHelpContent, getRawHelpContent } from '../content';
import { HELP_SHOTS } from '../shots';
import { HELP_FACT_KEYS } from '../helpFacts';
import { parseHelpText } from '../helpText';

const DICTS: Record<string, Record<string, unknown>> = { en, he, sv, ja, es };

function walk(dict: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    dict,
  );
}

function leafKeys(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix];
  if (!node || typeof node !== 'object') return [];
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
    leafKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

function blockStrings(b: HelpBlock): string[] {
  switch (b.t) {
    case 'steps':
      return b.items.flatMap((s) => [s.title, s.body ?? '']);
    case 'list':
      return b.items;
    case 'shot':
      return [b.caption];
    default:
      return [b.text];
  }
}

function allStrings(locale: string): string[] {
  const c = getRawHelpContent(locale);
  return [
    ...Object.values(c.articles).flatMap((a) => [a.title, a.summary, a.keywords, ...a.blocks.flatMap(blockStrings)]),
    ...c.quick.flatMap((q) => [q.q, q.a]),
  ];
}

describe('help registry', () => {
  it('has unique slugs, 12-20 articles and 3-5 tutorials', () => {
    expect(new Set(HELP_SLUGS).size).toBe(HELP_SLUGS.length);
    const articles = HELP_ARTICLES.filter((a) => a.kind === 'article');
    expect(articles.length).toBeGreaterThanOrEqual(12);
    expect(articles.length).toBeLessThanOrEqual(20);
    expect(HELP_TUTORIALS.length).toBeGreaterThanOrEqual(3);
    expect(HELP_TUTORIALS.length).toBeLessThanOrEqual(5);
  });

  it('covers every category and links only to real articles', () => {
    for (const cat of HELP_CATEGORY_IDS) {
      expect(HELP_ARTICLES.some((a) => a.category === cat && a.kind === 'article'), cat).toBe(true);
    }
    for (const a of HELP_ARTICLES) {
      expect(a.related.length, a.slug).toBeGreaterThan(0);
      for (const r of a.related) {
        expect(HELP_SLUGS, `${a.slug} -> ${r}`).toContain(r);
        expect(r).not.toBe(a.slug);
      }
    }
    for (const p of HELP_POPULAR) expect(HELP_SLUGS).toContain(p);
  });
});

describe.each(HELP_LOCALES)('help content (%s)', (locale) => {
  const content = getHelpContent(locale);

  it('has a complete article for every slug, with steps where it promises HowTo', () => {
    for (const meta of HELP_ARTICLES) {
      const a = content.articles[meta.slug];
      expect(a, meta.slug).toBeDefined();
      expect(a.title.length, meta.slug).toBeGreaterThan(5);
      expect(a.summary.length, meta.slug).toBeGreaterThan(20);
      expect(a.blocks.length, meta.slug).toBeGreaterThan(1);
      const steps = a.blocks.filter((b) => b.t === 'steps');
      if (meta.howTo) expect(steps.length, meta.slug).toBe(1);
      if (meta.kind === 'tutorial') {
        const items = steps.flatMap((b) => (b.t === 'steps' ? b.items : []));
        expect(items.every((s) => s.time), meta.slug).toBe(true);
      }
    }
    expect(Object.keys(content.articles).sort()).toEqual([...HELP_SLUGS].sort());
  });

  it('only uses real screenshots, facts, label keys and links', () => {
    const shotIds = Object.keys(HELP_SHOTS);
    for (const a of Object.values(content.articles)) {
      for (const b of a.blocks) {
        if (b.t === 'shot') expect(shotIds).toContain(b.id);
        if (b.t === 'steps') for (const s of b.items) if (s.shot) expect(shotIds).toContain(s.shot);
      }
    }
    for (const s of allStrings(locale)) {
      for (const m of s.matchAll(/\{(\w+)\}/g)) expect(HELP_FACT_KEYS, s).toContain(m[1]);
      for (const seg of parseHelpText(s)) {
        if (seg.type === 'label') {
          const value = walk(DICTS[locale], seg.key);
          expect(typeof value, `${locale}: ${seg.key}`).toBe('string');
          expect(String(value), seg.key).not.toMatch(/\{\{?\w+\}?\}/);
        }
        if (seg.type === 'bold') expect(seg.value, s).not.toContain('[[');
        if (seg.type === 'link') {
          const [kind, target] = seg.target.split(':');
          expect(['help', 'app'], seg.target).toContain(kind);
          if (kind === 'help') expect(HELP_SLUGS, seg.target).toContain(target);
          if (kind === 'app') expect(target.startsWith('/'), seg.target).toBe(true);
        }
      }
    }
  });

  it('has at least five quick answers pointing at real articles', () => {
    expect(content.quick.length).toBeGreaterThanOrEqual(5);
    for (const q of content.quick) expect(HELP_SLUGS).toContain(q.slug);
  });

  it('is written natively, not copied from English', () => {
    if (locale === 'en') return;
    const english = getHelpContent('en');
    for (const slug of HELP_SLUGS) {
      const title = content.articles[slug].title;
      expect(title, slug).not.toBe(english.articles[slug].title);
      if (locale === 'he') expect(title, slug).toMatch(/[֐-׿]/);
      if (locale === 'ja') expect(title, slug).toMatch(/[぀-ヿ一-鿿]/);
    }
  });
});

describe('eg2Help translations', () => {
  it('exist with the same keys in all five help locales and ru (landing links render there)', () => {
    const base = leafKeys(walk(en, 'eg2Help')).sort();
    expect(base.length).toBeGreaterThan(30);
    for (const locale of [...HELP_LOCALES, 'ru']) {
      const dict = locale === 'ru' ? ru : DICTS[locale];
      expect(leafKeys(walk(dict, 'eg2Help')).sort(), locale).toEqual(base);
    }
  });

  it('are translated, not English placeholders', () => {
    for (const locale of ['he', 'ja'] as const) {
      const sample = walk(DICTS[locale], 'eg2Help.home.title');
      expect(sample).not.toBe(walk(en, 'eg2Help.home.title'));
    }
  });
});
