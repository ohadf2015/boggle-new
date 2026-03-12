import type { ReactNode } from 'react';

// Safe: all JSON-LD content is static FAQ data, not user input
// Metadata is defined in page.tsx — layout only adds structured data schemas
function buildFAQSchemas(localePath: string): string {
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
        name: 'FAQ',
        item: `https://www.lexiclash.live${localePath}/faq`,
      },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `https://www.lexiclash.live${localePath}/faq#faqpage`,
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is LexiClash?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'LexiClash is a free online multiplayer word game similar to Boggle. Players compete in real-time to find words on a shared letter grid. Available in 5 languages with multiplayer, single player, and daily challenge modes.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need to create an account?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No account is required to play! You can jump into multiplayer or single player games as a guest. Creating an optional account lets you save progress, track achievements, and appear on leaderboards.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is LexiClash free to play?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, LexiClash is completely free to play. No subscription, no in-app purchases required. Just visit lexiclash.live and start playing.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does scoring work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Longer words earn more points: 3-4 letters score 1-2 points, 5-6 letters score 2-3 points, and 7+ letters score 5+ points. Build combos by finding words quickly for multipliers up to 1.75x.',
        },
      },
      {
        '@type': 'Question',
        name: 'What game modes are available?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'LexiClash offers multiplayer (2-20+ players), single player vs AI bots, daily challenges (Word Hunt Survival), blast mode, and adventure mode with boss battles.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the Daily Challenge?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Word Hunt Survival is a Wordle-style daily puzzle with 10 attempts to find a hidden word. Same board worldwide, shareable emoji results.',
        },
      },
      {
        '@type': 'Question',
        name: 'What languages does LexiClash support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'LexiClash supports 5 languages: English, Hebrew (with full RTL support), Swedish, Japanese, and Spanish. Each language has its own dictionary for word validation.',
        },
      },
      {
        '@type': 'Question',
        name: 'What devices can play LexiClash?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'LexiClash works on any device with a modern web browser — desktop, laptop, tablet, or smartphone. No app download needed. Optimized for touch screens, supports portrait and landscape.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need an internet connection?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, LexiClash requires an internet connection for multiplayer and daily challenges. The Progressive Web App features allow the game to load with spotty connection once cached.',
        },
      },
    ],
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `https://www.lexiclash.live${localePath}/faq#webpage`,
    url: `https://www.lexiclash.live${localePath}/faq`,
    name: 'FAQ - LexiClash',
    description: 'Frequently asked questions about LexiClash, the free online multiplayer word game.',
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
  const localePath = `/${locale}`;

  // Safe: content is static FAQ data from buildFAQSchemas, not user input
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildFAQSchemas(localePath) }}
      />
      {children}
    </>
  );
}
