import type { ReactNode } from 'react';
import { loadTranslation } from '@/translations/loadTranslation';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

// FAQ keys used in the schema — maps to faq.q.* and faq.a.* translation keys
const FAQ_KEYS = [
  'whatIs', 'createAccount', 'isFree', 'scoring', 'gameModes',
  'dailyChallenge', 'multipleLanguages', 'devices', 'internet',
] as const;

// Safe: all JSON-LD content is from translation files, not user input
function buildFAQSchemas(localePath: string, faqT: Record<string, any>): string {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'LexiClash',
        item: `https://www.lexiclash.live${localePath}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: faqT?.title || 'FAQ',
        item: `https://www.lexiclash.live${localePath}/faq`,
      },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `https://www.lexiclash.live${localePath}/faq#faqpage`,
    mainEntity: FAQ_KEYS.map((key) => ({
      '@type': 'Question',
      name: faqT?.q?.[key] || key,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faqT?.a?.[key] || '',
      },
    })).filter((q) => q.name && q.acceptedAnswer.text),
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `https://www.lexiclash.live${localePath}/faq#webpage`,
    url: `https://www.lexiclash.live${localePath}/faq`,
    name: `${faqT?.title || 'FAQ'} - LexiClash`,
    description: faqT?.subtitle || 'Frequently asked questions about LexiClash.',
    isPartOf: {
      '@id': 'https://www.lexiclash.live/#website',
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['[data-speakable="true"]', 'h1', 'h2'],
    },
  };

  return JSON.stringify([breadcrumbSchema, faqSchema, webPageSchema]);
}

interface FAQLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function FAQLayout({ children, params }: FAQLayoutProps): Promise<ReactNode> {
  const { locale } = await params;
  const validLocale = (['en', 'he', 'sv', 'ja', 'es', 'ru'].includes(locale) ? locale : 'en') as Locale;
  const localePath = `/${validLocale}`;
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const faqT = t?.faq;

  // Safe: content is from translation files (static build data), not user input
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildFAQSchemas(localePath, faqT) }}
      />
      {children}
    </>
  );
}
