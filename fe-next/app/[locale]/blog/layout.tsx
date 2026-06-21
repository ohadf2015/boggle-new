import { loadTranslation, type TranslationData } from '@/translations/loadTranslation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface LayoutParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (['en','he','sv','ja','es'].includes(locale) ? locale : 'en') as Locale;
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const enT = await loadTranslation('en') as Record<string, any>;
  const seo = t?.seo?.blog || enT.seo.blog;
  const baseSeo = t?.seo || enT.seo;

  const localePath = `/${locale}`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/blog`,
      title: seo.ogTitle,
      description: seo.ogDescription,
      siteName: 'LexiClash',
      images: [
        {
          url: 'https://www.lexiclash.live/lexiclash.jpg',
          width: 1200,
          height: 630,
          alt: 'LexiClash - Multiplayer Word Game',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: ['https://www.lexiclash.live/lexiclash.jpg'],
    },
    alternates: {
      canonical: `https://www.lexiclash.live${localePath}/blog`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/blog',
        he: 'https://www.lexiclash.live/he/blog',
        en: 'https://www.lexiclash.live/en/blog',
        sv: 'https://www.lexiclash.live/sv/blog',
        ja: 'https://www.lexiclash.live/ja/blog',
        es: 'https://www.lexiclash.live/es/blog',
        'en-IL': 'https://www.lexiclash.live/en/blog',
        'he-IL': 'https://www.lexiclash.live/he/blog',
        'en-US': 'https://www.lexiclash.live/en/blog',
        'es-US': 'https://www.lexiclash.live/es/blog',
        'en-GB': 'https://www.lexiclash.live/en/blog',
        'en-SE': 'https://www.lexiclash.live/en/blog',
        'sv-SE': 'https://www.lexiclash.live/sv/blog',
        'en-JP': 'https://www.lexiclash.live/en/blog',
        'ja-JP': 'https://www.lexiclash.live/ja/blog',
        'en-ES': 'https://www.lexiclash.live/en/blog',
        'es-ES': 'https://www.lexiclash.live/es/blog',
        'en-MX': 'https://www.lexiclash.live/en/blog',
        'es-MX': 'https://www.lexiclash.live/es/blog',
        'en-AU': 'https://www.lexiclash.live/en/blog',
        'es-AR': 'https://www.lexiclash.live/es/blog',
        'es-CO': 'https://www.lexiclash.live/es/blog',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface BlogLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function BlogLayout({ children, params }: BlogLayoutProps): Promise<ReactNode> {
  const { locale } = await params;
  const localePath = `/${locale}`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `https://www.lexiclash.live${localePath}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `https://www.lexiclash.live${localePath}/blog`,
      },
    ],
  };

  const blogArticles = [
    { slug: '10-surprising-benefits-word-games', name: '10 Surprising Benefits of Playing Word Games Daily' },
    { slug: 'science-behind-word-games', name: 'The Science Behind Word Games and Brain Health' },
    { slug: 'daily-challenge-strategies', name: 'Daily Challenge Strategies' },
    { slug: 'multilingual-word-learning', name: 'Multilingual Word Learning' },
    { slug: 'top-player-secrets', name: 'Top Player Secrets' },
    { slug: 'improve-word-game-skills', name: 'How to Improve Your Word Game Skills' },
    { slug: 'why-word-games-are-addictive', name: 'Why Word Games Are Addictive - The Psychology Explained' },
    { slug: 'best-boggle-alternatives-2026', name: 'Best Boggle Alternatives in 2026' },
    { slug: 'word-games-for-brain-training', name: 'Word Games for Brain Training - The Research' },
    { slug: 'boggle-vs-wordle', name: 'Boggle vs Wordle - Which Word Game Is Better?' },
    { slug: 'boggle-vs-scrabble', name: 'Boggle vs Scrabble - Speed vs Strategy' },
    { slug: 'boggle-vs-words-with-friends', name: 'Boggle vs Words With Friends - Real-Time vs Async' },
    { slug: 'free-word-games-online', name: 'Free Word Games Online: The Honest Guide (No Pay-to-Win)' },
    { slug: 'hebrew-word-games-guide', name: 'Playing Word Games in Hebrew: The Beautiful Chaos of Right-to-Left' },
    { slug: 'most-popular-word-games-2026', name: 'The Most Popular Online Word Games of 2026 — and Why They Exploded' },
    { slug: 'multiplayer-word-games-social', name: 'Why Playing Word Games With Friends Hits Different (The Science of Social Gaming)' },
    { slug: 'netflix-word-game-2026-rise', name: 'Netflix Just Dropped a Word Game — And It' },
    { slug: 'vocabulary-building-strategies', name: 'I Learned 500 New Words in 30 Days. The Method Is Embarrassingly Simple.' },
    { slug: 'word-game-history', name: 'From Ancient Tiles to Digital Grids: The Wild History of Word Games' },
    { slug: 'word-games-and-mental-health', name: 'How Word Games Became My Anxiety Hack (And What Therapists Think About That)' },
    { slug: 'word-games-for-kids-education', name: 'Why Every Teacher Should Have a Word Game in Their Toolkit' },
    { slug: 'alternativas-a-scrabble', name: 'Alternativas a Scrabble: 4 Juegos de Palabras que Realmente Valen la Pena (2026)' },
    { slug: 'juegos-palabras-gratis', name: 'Juegos de Palabras Gratis 2026: Cómo Detectar las Trampas en 30 Segundos' },
    { slug: 'milat-hayom-habit', name: 'מילת היום: איך משחק קטן של שלוש דקות הופך להרגל של שנה שלמה' },
    { slug: 'mishachke-milim-chinuch', name: 'משחקי מילים בכיתה: מה קורה כשמורה לעברית מחליפה דף עבודה במשחק' },
    { slug: 'ordspel-familjer', name: 'Ordspel för Familjer: Hur Vi Hittade Något Att Göra Tillsammans Som Faktiskt Funkar' },
  ];

  // Safe: all content is from static article metadata, not user input
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'LexiClash Blog',
    description: 'Tips, strategies, and insights for word game enthusiasts',
    numberOfItems: blogArticles.length,
    itemListElement: blogArticles.map((article, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: article.name,
      url: `https://www.lexiclash.live${localePath}/blog/${article.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      {children}
    </>
  );
}
