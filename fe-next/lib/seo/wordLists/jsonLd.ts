import { HREFLANG_BASE_URL } from '@/lib/seo/hreflang';
import type { WordList } from './model';
import { absoluteUrl, listPath } from './paths';

type Node = Record<string, unknown>;

export interface Crumb {
  name: string;
  /** Locale-less path, e.g. `/education/lists`. */
  path: string;
}

const PUBLISHER = { '@type': 'Organization', name: 'LexiClash', url: HREFLANG_BASE_URL };

/** List rows come from the database: `<` must never close the script tag early. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export function breadcrumbNode(locale: string, crumbs: Crumb[]): Node {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(locale, c.path),
    })),
  };
}

export function listGraph(opts: {
  list: WordList;
  locale: string;
  title: string;
  description: string;
  topic: string;
  gradeName: string | null;
  crumbs: Crumb[];
}): Node {
  const { list, locale, title, description, topic, gradeName, crumbs } = opts;
  const url = absoluteUrl(locale, listPath(list));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LearningResource',
        '@id': `${url}#resource`,
        name: title,
        description,
        url,
        inLanguage: list.lang,
        learningResourceType: 'Vocabulary list',
        educationalUse: ['Vocabulary practice', 'Classroom game'],
        ...(gradeName ? { educationalLevel: gradeName } : {}),
        teaches: topic,
        isAccessibleForFree: true,
        audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
        publisher: PUBLISHER,
        hasPart: { '@id': `${url}#terms` },
      },
      {
        '@type': 'DefinedTermSet',
        '@id': `${url}#terms`,
        name: title,
        inLanguage: list.lang,
        hasDefinedTerm: list.words.map((w) => ({
          '@type': 'DefinedTerm',
          name: w.word,
          ...(w.definition ? { description: w.definition } : {}),
        })),
      },
      breadcrumbNode(locale, crumbs),
    ],
  };
}

export function collectionGraph(opts: {
  locale: string;
  path: string;
  name: string;
  description: string;
  /** Locale-prefixed hrefs: a hub may point at a list that lives in another locale. */
  items: Array<{ name: string; href: string }>;
  crumbs: Crumb[];
}): Node {
  const url = absoluteUrl(opts.locale, opts.path);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${url}#page`,
        name: opts.name,
        description: opts.description,
        url,
        inLanguage: opts.locale,
        isAccessibleForFree: true,
        publisher: PUBLISHER,
        mainEntity: { '@id': `${url}#items` },
      },
      {
        '@type': 'ItemList',
        '@id': `${url}#items`,
        numberOfItems: opts.items.length,
        itemListElement: opts.items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          url: `${HREFLANG_BASE_URL}${item.href}`,
        })),
      },
      breadcrumbNode(opts.locale, opts.crumbs),
    ],
  };
}
