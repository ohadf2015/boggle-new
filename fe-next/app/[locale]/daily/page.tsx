import React from 'react';
import dynamicImport from 'next/dynamic';
import type { Metadata } from 'next';
import { translations } from '@/translations';

type Locale = 'en' | 'he' | 'sv' | 'ja';

interface PageParams {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ share?: string }>;
}

// Dynamic import for code splitting (client component)
const DailyChallenge = dynamicImport(() => import('@/components/daily/DailyChallenge'), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
      <div className="text-center">
        <div className="relative w-12 h-12 mx-auto mb-3">
          <div className="absolute inset-0 border-4 border-neo-yellow/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-neo-yellow rounded-full animate-spin" />
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm">Loading Daily Challenge...</p>
      </div>
    </div>
  ),
});

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Generate metadata - supports dynamic OG images for shared leaderboard positions
 */
export async function generateMetadata({ params, searchParams }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const { share } = await searchParams;
  const validLocale = (locale as Locale) || 'en';
  const seo = translations[validLocale]?.seo?.daily || translations.en.seo.daily;

  const localePath = `/${locale}`;
  const baseUrl = 'https://www.lexiclash.live';

  // Check if this is a shared leaderboard position
  if (share) {
    try {
      const shareParams = new URLSearchParams(share);
      const rank = shareParams.get('rank');
      const displayName = shareParams.get('displayName');
      const score = shareParams.get('score');
      const wordCount = shareParams.get('wordCount');
      const puzzleNumber = shareParams.get('puzzleNumber');

      if (rank && displayName && score && wordCount && puzzleNumber) {
        const ogImageUrl = `${baseUrl}/api/og/daily-rank?${share}`;
        const getRankEmoji = (r: string) => {
          if (r === '1') return '🥇';
          if (r === '2') return '🥈';
          if (r === '3') return '🥉';
          return `#${r}`;
        };

        const title = `${displayName} ranked ${getRankEmoji(rank)} on LexiClash Daily #${puzzleNumber}!`;
        const description = `${score} points | ${wordCount} words`;

        return {
          title,
          description,
          openGraph: {
            type: 'website',
            url: `${baseUrl}${localePath}/daily`,
            title,
            description,
            siteName: 'LexiClash',
            images: [
              {
                url: ogImageUrl,
                width: 1200,
                height: 630,
                alt: `${displayName} - LexiClash Daily #${puzzleNumber}`,
              },
            ],
          },
          twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImageUrl],
          },
        };
      }
    } catch (error) {
      console.error('Error parsing share params:', error);
      // Fall through to default metadata
    }
  }

  // Default metadata (no share parameter)
  const ogImage = locale === 'he'
    ? `${baseUrl}/og-image-he.jpg`
    : `${baseUrl}/og-image-en.jpg`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      url: `${baseUrl}${localePath}/daily`,
      title: seo.ogTitle,
      description: seo.ogDescription,
      siteName: 'LexiClash',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Daily Word Challenge',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [ogImage],
    },
  };
}

/**
 * Daily Challenge page route
 * Same puzzle for everyone worldwide each day
 * Shareable emoji results like Wordle
 */
export default function DailyChallengePage(): React.JSX.Element {
  return <DailyChallenge />;
}
