import React from 'react';
import dynamicImport from 'next/dynamic';
import type { Metadata } from 'next';
import { translations } from '@/translations';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface PageParams {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ share?: string; wh?: string }>;
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
// Localized performance messages for Word Hunt OG titles
const WH_MESSAGES: Record<string, { perfect: string; great: string; good: string; close: string; barely: string; failed: string }> = {
  en: { perfect: 'Word Wizard!', great: 'Crushed it!', good: 'I survived!', close: 'That was close!', barely: 'Phew! Made it!', failed: 'This one got me...' },
  he: { perfect: 'אלוף המילים!', great: 'מחצתי את זה!', good: 'שרדתי!', close: 'זה היה צמוד!', barely: 'פיו! הצלחתי!', failed: 'הפעם נכשלתי...' },
  sv: { perfect: 'Ordmästare!', great: 'Krossade det!', good: 'Jag överlevde!', close: 'Det var nära!', barely: 'Puh! Klarade det!', failed: 'Den fick mig...' },
  ja: { perfect: '言葉の達人!', great: '完璧!', good: '生き残った!', close: 'ギリギリ!', barely: 'ふぅ!セーフ!', failed: 'やられた...' },
  es: { perfect: 'Mago de palabras!', great: 'Lo aplasté!', good: 'Sobreviví!', close: 'Estuvo cerca!', barely: 'Uf! Lo logré!', failed: 'Esta me ganó...' },
};

function getWhPerformanceMessage(solved: boolean, attempts: number, locale: string): string {
  const msgs = WH_MESSAGES[locale] || WH_MESSAGES.en;
  if (!solved) return msgs.failed;
  if (attempts <= 2) return msgs.perfect;
  if (attempts <= 4) return msgs.great;
  if (attempts <= 6) return msgs.good;
  if (attempts <= 8) return msgs.close;
  return msgs.barely;
}

export async function generateMetadata({ params, searchParams }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const { share, wh } = await searchParams;
  const validLocale = (locale as Locale) || 'en';
  const seo = translations[validLocale]?.seo?.daily || translations.en.seo.daily;

  const localePath = `/${locale}`;
  const baseUrl = 'https://www.lexiclash.live';

  // Check if this is a Word Hunt share
  if (wh) {
    try {
      // Try to decode in case the value wasn't URL-decoded by the server/crawler
      // If already decoded or invalid encoding, use original value
      let decodedWh = wh;
      try {
        decodedWh = decodeURIComponent(wh);
      } catch {
        // Already decoded or invalid encoding, use as-is
      }
      const whParams = new URLSearchParams(decodedWh);
      const solved = whParams.get('solved') === 'true';
      const attempts = parseInt(whParams.get('attempts') || '0');
      const streak = parseInt(whParams.get('streak') || '0');
      const puzzleNumber = whParams.get('puzzleNumber');
      const displayName = whParams.get('displayName') || 'Player';
      const avatarEmoji = whParams.get('avatarEmoji') || '🎯';
      const emojiGrid = whParams.get('emojiGrid') || '';

      if (puzzleNumber) {
        // Build OG image URL with all params
        const ogParams = new URLSearchParams({
          solved: String(solved),
          attempts: String(attempts),
          streak: String(streak),
          puzzleNumber,
          displayName,
          avatarEmoji,
          locale: validLocale,
          ...(emojiGrid && { emojiGrid }),
        });
        const ogImageUrl = `${baseUrl}/api/og/word-hunt?${ogParams.toString()}`;

        const performanceMsg = getWhPerformanceMessage(solved, attempts, validLocale);
        const attemptText = solved ? `${attempts}/10` : 'X/10';
        const streakText = streak > 1 ? ` | 🔥 ${streak} day streak` : '';

        const title = `${displayName}: ${performanceMsg} Word Hunt #${puzzleNumber}`;
        const description = `${attemptText}${streakText} - Can you beat this?`;

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
                alt: `${displayName} - Word Hunt #${puzzleNumber}`,
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
      console.error('Error parsing Word Hunt share params:', error);
      // Fall through to default metadata
    }
  }

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
