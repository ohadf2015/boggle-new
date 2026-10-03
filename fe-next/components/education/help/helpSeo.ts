import type { Metadata } from 'next';
import { translateKey } from '@/lib/i18n/serverTranslate';
import { educationBreadcrumbLabels, educationProviderNode } from '@/lib/seo/educationLanding';
import type { HelpArticleText, HelpQuickAnswer } from './helpTypes';
import { HELP_BASE_URL, helpAlternates, helpUrl } from './helpUrls';
import { HELP_PATH, HELP_UPDATED } from './helpRegistry';
import { helpShot, type HelpShotId } from './shots';
import { helpPlainText } from './helpText';

type JsonLdNode = Record<string, unknown>;

const OG_LOCALE: Record<string, string> = { en: 'en_US', he: 'he_IL', sv: 'sv_SE', ja: 'ja_JP', es: 'es_ES' };

export { HELP_BASE_URL, helpAlternates, helpUrl };

export function helpLabel(locale: string): (key: string) => string {
  return (key) => translateKey(key, locale);
}

export function buildHelpMetadata(args: {
  locale: string;
  path: string;
  title: string;
  description: string;
}): Metadata {
  const { locale, path, title, description } = args;
  const url = helpUrl(locale, path);
  const image = `${HELP_BASE_URL}/og-image-en.webp`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: helpAlternates(path) },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      locale: OG_LOCALE[locale] ?? 'en_US',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    robots: { index: true, follow: true },
  };
}

export function helpBreadcrumbJsonLd(args: {
  locale: string;
  trail: { name: string; path: string }[];
}): JsonLdNode {
  const { locale, trail } = args;
  const { home, hub } = educationBreadcrumbLabels(locale);
  const items = [
    { name: home, item: `${HELP_BASE_URL}/${locale}` },
    { name: hub, item: helpUrl(locale, '/education') },
    ...trail.map((t) => ({ name: t.name, item: helpUrl(locale, t.path) })),
  ];
  const last = items[items.length - 1].item;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${last}#breadcrumb`,
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, ...it })),
  };
}

function shotUrl(id: HelpShotId, locale: string): string {
  const src = helpShot(id, locale).src;
  const path = typeof src === 'string' ? src : src.src;
  return path.startsWith('http') ? path : `${HELP_BASE_URL}${path}`;
}

export function helpHowToJsonLd(args: {
  locale: string;
  slug: string;
  article: HelpArticleText;
  minutes: number;
}): JsonLdNode {
  const { locale, slug, article, minutes } = args;
  const plain = (s: string) => helpPlainText(s, helpLabel(locale));
  const url = helpUrl(locale, `${HELP_PATH}/${slug}`);
  const steps = article.blocks.flatMap((b) => (b.t === 'steps' ? b.items : []));
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${url}#howto`,
    name: plain(article.title),
    description: plain(article.summary),
    inLanguage: locale,
    totalTime: `PT${minutes}M`,
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: plain(s.title),
      text: plain(s.body ?? s.title),
      url: `${url}#step-${i + 1}`,
      ...(s.shot ? { image: shotUrl(s.shot, locale) } : {}),
    })),
  };
}

export function helpArticleJsonLd(args: {
  locale: string;
  slug: string;
  article: HelpArticleText;
}): JsonLdNode {
  const { locale, slug, article } = args;
  const plain = (s: string) => helpPlainText(s, helpLabel(locale));
  const url = helpUrl(locale, `${HELP_PATH}/${slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    '@id': `${url}#article`,
    headline: plain(article.title),
    description: plain(article.summary),
    inLanguage: locale,
    dateModified: HELP_UPDATED,
    mainEntityOfPage: url,
    audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
    publisher: educationProviderNode(locale),
  };
}

export function helpFaqJsonLd(args: { locale: string; quick: HelpQuickAnswer[] }): JsonLdNode {
  const { locale, quick } = args;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${helpUrl(locale, HELP_PATH)}#faq`,
    inLanguage: locale,
    mainEntity: quick.map((q) => ({
      '@type': 'Question',
      name: q.q,
      acceptedAnswer: { '@type': 'Answer', text: q.a },
    })),
  };
}
