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

/* ────────────────────────────────────────────────────────────────────────────
 * Locale-correct JSON-LD fields for the SIX pages that predate this module.
 *
 * Those pages carry bespoke content shapes — a Quizlet/Wordwall/Kahoot
 * comparison table, a four-week training plan, a district pricing block — that
 * `EducationLandingContent` cannot express, so they are not ported onto the
 * template. What moves here is only the part that was WRONG in all of them:
 * `inLanguage: 'en'`, a provider `@id` pinned to `/en/education#org`, and
 * English breadcrumb names, all served on the he/es/sv/ja/ru builds.
 *
 * Keeping these as small field builders rather than a whole-page template means
 * a page can adopt them one node at a time, and — the reason it matters — the
 * fields become reachable from a unit test. Built inline inside a page's default
 * export, they were not.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The language a locale's build is actually written in. Anything without an
 * education build reads as English, which is what those routes serve.
 */
export function educationContentLang(locale: string): EducationLocale {
  return isEducationLocale(locale) ? locale : 'en';
}

/**
 * Breadcrumb labels, in the six languages. These end up as `BreadcrumbList`
 * item names, which Google renders in the SERP — an English "Home > Education"
 * above a Japanese title is both wrong and visibly wrong. Values match the ones
 * the newer teacher-moment pages already carry in their own content files.
 */
const BREADCRUMB_LABELS: Record<EducationLocale, { home: string; hub: string }> = {
  en: { home: 'Home', hub: 'Education' },
  he: { home: 'בית', hub: 'חינוך' },
  es: { home: 'Inicio', hub: 'Educación' },
  sv: { home: 'Hem', hub: 'Utbildning' },
  ja: { home: 'ホーム', hub: '教育' },
  ru: { home: 'Главная', hub: 'Образование' },
};

export function educationBreadcrumbLabels(locale: string): { home: string; hub: string } {
  return BREADCRUMB_LABELS[educationContentLang(locale)];
}

export type EducationProviderNode = {
  '@type': 'EducationalOrganization';
  '@id': string;
  name: string;
  url: string;
};

/** The publisher entity for a locale build. Never pin this to `/en`. */
export function educationProviderNode(locale: string): EducationProviderNode {
  const lang = educationContentLang(locale);
  return {
    '@type': 'EducationalOrganization',
    '@id': `${EDUCATION_BASE_URL}/${lang}/education#org`,
    name: 'LexiClash Education',
    url: `${EDUCATION_BASE_URL}/${lang}/education`,
  };
}

export function educationBreadcrumbJsonLd(args: {
  locale: string;
  path: string;
  current: string;
}): JsonLdNode {
  const { locale, path, current } = args;
  const url = localeUrl(locale, path);
  const { home, hub } = educationBreadcrumbLabels(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: home, item: `${EDUCATION_BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: hub, item: `${EDUCATION_BASE_URL}/${locale}/education` },
      { '@type': 'ListItem', position: 3, name: current, item: url },
    ],
  };
}

export function educationLearningResourceJsonLd(args: {
  locale: string;
  path: string;
  name: string;
  description: string;
  teaches: string;
  /** Defaults to `Game` — these pages are all playable activities. */
  learningResourceType?: string;
  educationalUse?: string[];
  educationalLevel?: string[];
  typicalAgeRange?: string;
  educationalRole?: string;
  /**
   * Language of the page BODY. Defaults to the locale, which is right for every
   * page whose `content.ts` has per-locale blocks. `sight-words-practice` passes
   * `'en'` explicitly because its body is English in every build.
   */
  contentLanguage?: string;
}): JsonLdNode {
  const url = localeUrl(args.locale, args.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${url}#resource`,
    name: args.name,
    description: args.description,
    url,
    inLanguage: args.contentLanguage ?? educationContentLang(args.locale),
    learningResourceType: args.learningResourceType ?? 'Game',
    ...(args.educationalUse ? { educationalUse: args.educationalUse } : {}),
    ...(args.educationalLevel ? { educationalLevel: args.educationalLevel } : {}),
    ...(args.typicalAgeRange ? { typicalAgeRange: args.typicalAgeRange } : {}),
    teaches: args.teaches,
    isAccessibleForFree: true,
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: args.educationalRole ?? 'student',
    },
    provider: educationProviderNode(args.locale),
  };
}

export function educationFaqJsonLd(args: {
  locale: string;
  path: string;
  faqs: ReadonlyArray<EducationFaq>;
}): JsonLdNode {
  const url = localeUrl(args.locale, args.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    inLanguage: educationContentLang(args.locale),
    mainEntity: args.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}
