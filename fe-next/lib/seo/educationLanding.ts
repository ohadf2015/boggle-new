import type { Metadata } from 'next';
import { hreflangAlternates } from './hreflang';

/**
 * Shared SEO/GEO plumbing for every education landing page.
 *
 * The per-page copies this replaces each carried the same three defects:
 *   - `inLanguage: 'en'` on the LearningResource node of *every* locale
 *   - BreadcrumbList item names hardcoded in English on *every* locale
 *   - a single hardcoded English `keywords` string served to all six locales
 *
 * Those are fixed once, here, instead of eleven times at the call sites.
 */

export const EDUCATION_BASE_URL = 'https://www.lexiclash.live';

export const EDUCATION_LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;
export type EducationLocale = (typeof EDUCATION_LOCALES)[number];

export function isEducationLocale(locale: string): locale is EducationLocale {
  return (EDUCATION_LOCALES as readonly string[]).includes(locale);
}

const OG_LOCALE: Record<EducationLocale, string> = {
  en: 'en_US',
  he: 'he_IL',
  es: 'es_ES',
  sv: 'sv_SE',
  ja: 'ja_JP',
  ru: 'ru_RU',
};

/** Locales with a bespoke hero asset on disk. `ru` intentionally reuses `en`. */
const HERO_ASSET_LOCALES: readonly string[] = ['en', 'he', 'sv', 'ja', 'es'];

export type EducationAccent = 'lime' | 'pink' | 'cyan' | 'purple';

export type EducationCta = {
  label: string;
  sublabel?: string;
  /** Locale-less path, e.g. `/education/classroom-game`. */
  href: string;
};

export type EducationFaq = { q: string; a: string };

/**
 * Section kinds are deliberately information-bearing (word lists, timed plans,
 * comparison tables) rather than interchangeable text blocks — a landing page
 * built only from swappable prose is the thin-content pattern search engines
 * penalise.
 */
export type EducationSection =
  | { kind: 'cards'; title: string; intro?: string; items: Array<{ tag?: string; title: string; desc: string }> }
  | { kind: 'features'; title: string; intro?: string; items: Array<{ icon: string; text: string }> }
  | { kind: 'steps'; title: string; intro?: string; items: Array<{ step: string; focus: string; activity: string }> }
  | { kind: 'wordlist'; title: string; intro?: string; groups: Array<{ label: string; words: string[] }> }
  | { kind: 'table'; title: string; intro?: string; columns: string[]; rows: string[][] }
  | { kind: 'prose'; title: string; paragraphs: string[] };

export type EducationLandingContent = {
  accent: EducationAccent;
  meta: {
    title: string;
    description: string;
    ogTitle?: string;
    ogDescription?: string;
    twitterDescription?: string;
    /** Per-locale. Never share one English list across locales. */
    keywords: string[];
  };
  hero: {
    /**
     * Short factual claims rendered as chips under the CTAs — "Free forever",
     * "No student email", "60-second setup". Deliberately not an eyebrow label
     * above the heading; the heading carries its own weight.
     */
    facts: string[];
    h1: { part1: string; highlight: string; part2: string };
    subtitle: string;
    primaryCta: EducationCta;
    secondaryCta?: EducationCta;
  };
  /**
   * Answer-first block. Rendered high on the page and marked `speakable` so AI
   * answer engines have a self-contained passage to quote instead of stitching
   * one together from the marketing copy.
   */
  answer: { question: string; answer: string };
  sections: EducationSection[];
  faqs: EducationFaq[];
  /** Localized section labels the template needs but that carry no SEO payload. */
  labels: { faqTitle: string; relatedTitle: string };
  related: Array<{ href: string; label: string; accent: EducationAccent }>;
  /** Localized breadcrumb labels — these end up in BreadcrumbList JSON-LD. */
  breadcrumb: { home: string; hub: string; current: string };
  learning: {
    educationalUse: string[];
    educationalLevel: string[];
    typicalAgeRange: string;
    teaches: string;
    /** ISO 8601 duration, e.g. `PT5M`. */
    timeRequired?: string;
  };
};

type BuildArgs = { locale: string; path: string; content: EducationLandingContent };

function localeUrl(locale: string, path: string): string {
  return `${EDUCATION_BASE_URL}/${locale}${path}`;
}

function heroImage(locale: string): string {
  const asset = HERO_ASSET_LOCALES.includes(locale) ? locale : 'en';
  return `${EDUCATION_BASE_URL}/images/education-hero-${asset}.webp`;
}

export function buildEducationLandingMetadata({ locale, path, content }: BuildArgs): Metadata {
  const supported = isEducationLocale(locale);
  const url = localeUrl(locale, path);
  const image = heroImage(locale);
  const { meta } = content;

  // Same map the sitemap emits — see lib/seo/hreflang.ts for why that matters.
  const languages = hreflangAlternates(path);

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    openGraph: {
      title: meta.ogTitle ?? meta.title,
      description: meta.ogDescription ?? meta.description,
      locale: supported ? OG_LOCALE[locale as EducationLocale] : OG_LOCALE.en,
      type: 'website',
      url,
      siteName: 'LexiClash',
      images: [{ url: image, width: 1200, height: 675, alt: meta.ogTitle ?? meta.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.ogTitle ?? meta.title,
      description: meta.twitterDescription ?? meta.description,
      images: [image],
    },
    alternates: { canonical: url, languages },
    robots: supported ? { index: true, follow: true } : { index: false, follow: true },
  };
}

type JsonLdNode = Record<string, unknown> & { '@type': string; '@id': string };

export function buildEducationLandingJsonLd({ locale, path, content }: BuildArgs): JsonLdNode[] {
  const url = localeUrl(locale, path);
  const lang = isEducationLocale(locale) ? locale : 'en';
  const { breadcrumb, learning, answer, faqs, meta } = content;

  const nodes: JsonLdNode[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${url}#page`,
      name: meta.title,
      description: meta.description,
      url,
      inLanguage: lang,
      isPartOf: { '@id': `${EDUCATION_BASE_URL}/${lang}/education#org` },
      primaryImageOfPage: heroImage(locale),
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['[data-answer]'],
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: breadcrumb.home, item: `${EDUCATION_BASE_URL}/${locale}` },
        { '@type': 'ListItem', position: 2, name: breadcrumb.hub, item: `${EDUCATION_BASE_URL}/${locale}/education` },
        { '@type': 'ListItem', position: 3, name: breadcrumb.current, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      '@id': `${url}#resource`,
      name: meta.title,
      description: answer.answer,
      url,
      inLanguage: lang,
      learningResourceType: 'Activity',
      educationalUse: learning.educationalUse,
      educationalLevel: learning.educationalLevel,
      typicalAgeRange: learning.typicalAgeRange,
      teaches: learning.teaches,
      isAccessibleForFree: true,
      ...(learning.timeRequired ? { timeRequired: learning.timeRequired } : {}),
      audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
      provider: {
        '@type': 'EducationalOrganization',
        '@id': `${EDUCATION_BASE_URL}/${lang}/education#org`,
        name: 'LexiClash Education',
        url: `${EDUCATION_BASE_URL}/${lang}/education`,
      },
    },
  ];

  if (faqs.length > 0) {
    nodes.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      inLanguage: lang,
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  return nodes;
}
