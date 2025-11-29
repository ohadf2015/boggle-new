import { translations } from '@/translations';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const seo = translations[locale]?.seo?.leaderboard || translations.en.seo.leaderboard;
  const baseSeo = translations[locale]?.seo || translations.en.seo;

  const localePath = locale === 'he' ? '' : `/${locale}`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/leaderboard`,
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
      canonical: `https://www.lexiclash.live${localePath}/leaderboard`,
      languages: {
        'x-default': 'https://www.lexiclash.live/leaderboard',
        he: 'https://www.lexiclash.live/he/leaderboard',
        en: 'https://www.lexiclash.live/en/leaderboard',
        sv: 'https://www.lexiclash.live/sv/leaderboard',
        ja: 'https://www.lexiclash.live/ja/leaderboard',
      },
    },
  };
}

export default function LeaderboardLayout({ children }) {
  return children;
}
