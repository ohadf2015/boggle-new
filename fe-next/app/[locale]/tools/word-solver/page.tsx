import type { Metadata } from 'next';
import { translations } from '@/translations';
import WordSolverPageClient from './PageClient';
import { getContent, type Locale } from './content';

type ValidLocale = keyof typeof translations;

interface PageParams {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

function getHreflangAlternates(path: string) {
  const languages: Record<string, string> = {
    'x-default': `${BASE_URL}/en${path}`,
  };
  for (const loc of LOCALES) {
    languages[loc] = `${BASE_URL}/${loc}${path}`;
  }
  return languages;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (locale in translations ? locale : 'en') as ValidLocale;
  const content = getContent(validLocale);
  const localePath = `/${locale}`;
  const pageUrl = `${BASE_URL}${localePath}/tools/word-solver`;

  return {
    title: `${content.title} | LexiClash`,
    description: content.metaDescription,
    keywords: [
      'anagram solver', 'word finder', 'word unscrambler', 'unscramble letters',
      'word solver', 'find words from letters', 'scrabble helper', 'boggle solver',
      'word game tool', 'LexiClash',
    ],
    openGraph: {
      type: 'website',
      locale: validLocale,
      url: pageUrl,
      title: content.title,
      description: content.metaDescription,
      siteName: 'LexiClash',
      images: [{
        url: `${BASE_URL}/lexiclash.jpg`,
        width: 1200,
        height: 630,
        alt: 'LexiClash Word Solver - Find words from any letters',
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.metaDescription,
      images: [`${BASE_URL}/lexiclash.jpg`],
    },
    alternates: {
      canonical: pageUrl,
      languages: getHreflangAlternates('/tools/word-solver'),
    },
  };
}

export default async function WordSolverPage({ params }: PageParams) {
  const { locale } = await params;
  const validLocale = (locale in translations ? locale : 'en') as ValidLocale;
  const content = getContent(validLocale);
  const pageUrl = `${BASE_URL}/${locale}/tools/word-solver`;

  // All JSON-LD data is from our own static content.ts — no user input, safe from XSS
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: content.title,
      description: content.metaDescription,
      url: pageUrl,
      applicationCategory: 'UtilityApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: content.howToTitle,
      description: content.description,
      step: content.howToSteps.map((text, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        text,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'LexiClash', item: `${BASE_URL}/${locale}` },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: `${BASE_URL}/${locale}/tools` },
        { '@type': 'ListItem', position: 3, name: content.title, item: pageUrl },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
  ];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <WordSolverPageClient />
    </>
  );
}
