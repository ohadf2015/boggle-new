import React, { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import type { Metadata } from 'next';
import { loadTranslation } from '@/translations/loadTranslation';
import { PageLoader } from '@/components/ui/PageLoader';


type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

interface PageParams {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    share?: string;
    wh?: string;
    // Simple query params for WhatsApp compatibility
    whSolved?: string;
    whAttempts?: string;
    whPuzzle?: string;
    whName?: string;
    whEmoji?: string;
    whStreak?: string;
    whAvatar?: string; // Custom avatar image filename
    whScore?: string; // Rival score for "beat me" challenge
  }>;
}

// Loading fallback - flex-1 fills parent flex-col, centers loader vertically
const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center bg-neo-navy">
    <PageLoader size="lg" text="Loading Daily Challenge..." />
  </div>
);

// Dynamic import for redirect component (client component)
const DailyRedirect = dynamicImport(() => import('@/components/daily/DailyRedirect'), {
  loading: LoadingFallback,
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
  const { share, wh, whSolved, whAttempts, whPuzzle, whName, whEmoji, whStreak, whAvatar, whScore } = await searchParams;
  const validLocale = (locale as Locale) || 'en';
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const enT = await loadTranslation('en') as Record<string, any>;
  const seo = t?.seo?.daily || enT.seo.daily;

  const localePath = `/${locale}`;
  const baseUrl = 'https://www.lexiclash.live';

  // Check if this is a Word Hunt share - support both old wh param and new simple params
  // New simple params take priority (better WhatsApp compatibility)
  if (whSolved || whPuzzle || wh) {
    try {
      let solved: boolean;
      let attempts: number;
      let streak: number;
      let puzzleNumber: string | null;
      let displayName: string;
      let avatarEmoji: string;
      let avatarImage: string | null;
      let emojiGrid: string;

      // Check for new simple params first (WhatsApp-friendly)
      if (whSolved || whPuzzle) {
        solved = whSolved === 'true';
        attempts = parseInt(whAttempts || '0');
        streak = parseInt(whStreak || '0');
        puzzleNumber = whPuzzle || null;
        displayName = whName || 'Player';
        avatarEmoji = whEmoji || '🎯';
        avatarImage = whAvatar || null;
        emojiGrid = '';
      } else {
        // Fall back to old wh param format
        let decodedWh = wh!;
        try {
          decodedWh = decodeURIComponent(wh!);
        } catch {
          // Already decoded or invalid encoding, use as-is
        }
        const whParams = new URLSearchParams(decodedWh);
        solved = whParams.get('solved') === 'true';
        attempts = parseInt(whParams.get('attempts') || '0');
        streak = parseInt(whParams.get('streak') || '0');
        puzzleNumber = whParams.get('puzzleNumber');
        displayName = whParams.get('displayName') || 'Player';
        avatarEmoji = whParams.get('avatarEmoji') || '🎯';
        avatarImage = whParams.get('avatarImage') || null;
        emojiGrid = whParams.get('emojiGrid') || '';
      }

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
          ...(avatarImage && { avatarImage }),
        });
        const ogImageUrl = `${baseUrl}/api/og/word-hunt?${ogParams.toString()}`;

        const performanceMsg = getWhPerformanceMessage(solved, attempts, validLocale);
        const attemptText = solved ? `${attempts}/10` : 'X/10';
        const streakText = streak > 1 ? ` | 🔥 ${streak} day streak` : '';

        const title = `${displayName}: ${performanceMsg} Word Hunt #${puzzleNumber}`;
        const description = `${attemptText}${streakText} - Can you beat this?`;

        // Include params in og:url so Facebook/WhatsApp don't re-fetch without them
        // Use simple params format for better WhatsApp compatibility
        const shareParams = new URLSearchParams({
          whSolved: String(solved),
          whAttempts: String(attempts),
          whPuzzle: puzzleNumber,
          whName: displayName,
          whEmoji: avatarEmoji,
          ...(streak > 0 && { whStreak: String(streak) }),
          ...(avatarImage && { whAvatar: avatarImage }),
        });
        const shareUrl = `${baseUrl}${localePath}/daily?${shareParams.toString()}`;

        return {
          title,
          description,
          openGraph: {
            type: 'website',
            url: shareUrl,
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

  // Default metadata (no share parameter) - use locale-specific static OG images
  const ogImageMap: Record<string, string> = {
    he: `${baseUrl}/og-image-he.webp`,
    en: `${baseUrl}/og-image-en.webp`,
    sv: `${baseUrl}/og-image-sv.webp`,
    ja: `${baseUrl}/og-image-ja.webp`,
    es: `${baseUrl}/og-image-es.webp`,
  };
  const ogImage = ogImageMap[validLocale] || ogImageMap.en;

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `${baseUrl}${localePath}/daily`,
      languages: {
        en: `${baseUrl}/en/daily`,
        he: `${baseUrl}/he/daily`,
        sv: `${baseUrl}/sv/daily`,
        ja: `${baseUrl}/ja/daily`,
        es: `${baseUrl}/es/daily`,
        ru: `${baseUrl}/ru/daily`,
      },
    },
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
 *
 * Wrapped in Suspense boundary to properly handle useSearchParams
 * which can cause "Rendered fewer hooks than expected" errors without it.
 */
export default function DailyChallengePage(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DailyRedirect />
    </Suspense>
  );
}
