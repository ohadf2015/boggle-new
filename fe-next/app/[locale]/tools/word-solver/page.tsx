import type { Metadata } from 'next';
import Link from 'next/link';
import { loadTranslation, type TranslationData } from '@/translations/loadTranslation';
import WordSolverPageClient from './PageClient';
import { getContent, type Locale } from './content';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';

const POPULAR_ANAGRAM_SEEDS = ['listen', 'stared', 'heart', 'stone', 'rates', 'learn', 'smart', 'great', 'earth', 'words'];

export const dynamic = 'force-dynamic';

type ValidLocale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface PageParams {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

function getHreflangAlternates(path: string) {
  const languages: Record<string, string> = {
    'x-default': `${BASE_URL}/en${path}`,
  };
  for (const loc of LOCALES) {
    languages[loc] = `${BASE_URL}/${loc}${path}`;
  }
  languages['en-IL'] = `${BASE_URL}/en${path}`;
  languages['he-IL'] = `${BASE_URL}/he${path}`;
  languages['en-US'] = `${BASE_URL}/en${path}`;
  languages['es-US'] = `${BASE_URL}/es${path}`;
  languages['en-GB'] = `${BASE_URL}/en${path}`;
  languages['en-SE'] = `${BASE_URL}/en${path}`;
  languages['sv-SE'] = `${BASE_URL}/sv${path}`;
  languages['en-JP'] = `${BASE_URL}/en${path}`;
  languages['ja-JP'] = `${BASE_URL}/ja${path}`;
  languages['en-ES'] = `${BASE_URL}/en${path}`;
  languages['es-ES'] = `${BASE_URL}/es${path}`;
  languages['en-MX'] = `${BASE_URL}/en${path}`;
  languages['es-MX'] = `${BASE_URL}/es${path}`;
  languages['en-AU'] = `${BASE_URL}/en${path}`;
  languages['es-AR'] = `${BASE_URL}/es${path}`;
  languages['es-CO'] = `${BASE_URL}/es${path}`;
  return languages;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (['en','he','sv','ja','es','ru'].includes(locale) ? locale : 'en') as ValidLocale;
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const enT = await loadTranslation('en') as Record<string, any>;
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
  const validLocale = (['en','he','sv','ja','es','ru'].includes(locale) ? locale : 'en') as ValidLocale;
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
      {jsonLd.map((schema) => (
        <script
          key={schema['@type']}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <WordSolverPageClient />
      <GamePageSeoContent
        title={content.title}
        description={content.metaDescription}
        features={content.howToSteps}
        faq={content.faqs}
      />
      <section className="mx-auto max-w-4xl px-4 pb-12">
        <h2 className="text-xl font-neo-display font-bold text-neo-pink uppercase tracking-wider mb-3">
          Popular Anagram Lookups
        </h2>
        <p className="text-slate-400 text-sm mb-4">
          Shareable URLs for every anagram search — perfect for sending to friends or bookmarking.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {POPULAR_ANAGRAM_SEEDS.map((letters) => (
            <Link
              key={letters}
              href={`/${locale}/anagram/${letters}`}
              className="bg-neo-navy border-2 border-neo-black rounded-neo px-3 py-2 shadow-hard-sm hover:shadow-hard hover:border-neo-pink transition-all text-center"
            >
              <span className="text-sm font-neo-display font-bold text-neo-white uppercase">
                {letters}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
