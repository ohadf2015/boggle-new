import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import nextDynamic from 'next/dynamic';
import { layoutTranslations as translations } from '@/translations/layout';
import { ConditionalProviders } from '../conditional-providers';
import { loadTranslation } from '@/translations/loadTranslation';
import AutoHideFooter from '@/components/AutoHideFooter';
import GlobalBottomNav from '@/components/GlobalBottomNav';
import DesktopGameNav from '@/components/DesktopGameNav';
import GoogleConsentMode from '@/components/GoogleConsentMode';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import GoogleAdSense from '@/components/GoogleAdSense';
import CrazyGamesScriptServer from '@/components/CrazyGamesScriptServer';
import WebVitalsReporter from '@/components/WebVitalsReporter';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import VersionChecker from '@/components/VersionChecker';
import NewYearCountdown from '@/components/celebration/NewYearCountdown';
import AnimationsLoader from '@/components/AnimationsLoader';
import NativeOAuthInitializer from '@/components/NativeOAuthInitializer';
import { ToastContainer } from '@/components/ui/EnhancedToast';
import { ChurnSignalTracker } from '@/components/engagement/ChurnSignalTracker';
import SocialMediaPixels from '@/components/SocialMediaPixels';
import { OrganizationJsonLd } from '@/components/seo/OrganizationJsonLd';
import { VideoGameJsonLd } from '@/components/seo/VideoGameJsonLd';
import { fredokaLatin, fredokaHebrew, rubikLatin, rubikHebrew, heeboHebrew } from '../fonts';
import { FeedbackToolbar } from '@feedback/sdk';

// Dynamic import for EmailCaptureModal (shown conditionally, not needed immediately)
const EmailCaptureModal = nextDynamic(() => import('@/components/EmailCaptureModal'), {
  loading: () => null,
});

// Lazy-load push notification prompt — shown after engagement threshold
const PushNotificationPrompt = nextDynamic(
  () => import('@/components/notifications/PushNotificationPrompt'),
  { loading: () => null }
);

// Lazy-load cookie consent banner — only needed on first visit
const CookieConsent = nextDynamic(() => import('@/components/CookieConsent'));


export const dynamicParams = false;

export function generateStaticParams() {
    return [
        { locale: 'en' },
        { locale: 'he' },
        { locale: 'sv' },
        { locale: 'ja' },
        { locale: 'es' },
    ];
}

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface LocaleLayoutProps {
    children: ReactNode;
    params: Promise<{ locale: string }>;
}

const SUPPORTED_LOCALES = new Set(['en', 'he', 'sv', 'ja', 'es']);

function getLocalePath(locale: string): string {
    return SUPPORTED_LOCALES.has(locale) ? `/${locale}` : '/en';
}

function getLanguageCode(locale: string): string {
    return SUPPORTED_LOCALES.has(locale) ? locale : 'en';
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
    const { locale } = await params;
    const validLocale = (SUPPORTED_LOCALES.has(locale) ? locale : 'en') as Locale;
    const seo = translations[validLocale]?.seo || translations.en.seo;
    const localePath = getLocalePath(validLocale);

    // Use locale-specific OG image (WebP format for faster loading)
    const ogImageMap: Record<string, string> = {
        he: 'https://www.lexiclash.live/og-image-he.webp',
        en: 'https://www.lexiclash.live/og-image-en.webp',
        sv: 'https://www.lexiclash.live/og-image-sv.webp',
        ja: 'https://www.lexiclash.live/og-image-ja.webp',
        es: 'https://www.lexiclash.live/og-image-es.webp',
    };
    const ogImageAltMap: Record<string, string> = {
        he: 'לקסי קלאש - משחק מילים מרובה משתתפים',
        en: 'LexiClash - Multiplayer Word Game',
        sv: 'LexiClash - Snabbt Multiplayer Ordspel',
        ja: 'LexiClash - マルチプレイヤーワードゲーム',
        es: 'LexiClash - Juego de Palabras Multijugador',
    };
    const ogImage = ogImageMap[locale] || ogImageMap.en;
    const ogImageAlt = ogImageAltMap[locale] || ogImageAltMap.en;

    return {
        title: seo.title,
        description: seo.description,
        keywords: seo.keywords,
        authors: [{ name: 'LexiClash' }],
        openGraph: {
            type: 'website',
            locale: seo.locale,
            url: `https://www.lexiclash.live${localePath}`,
            title: seo.ogTitle,
            description: seo.ogDescription,
            siteName: 'LexiClash',
            images: [
                {
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: ogImageAlt,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: seo.twitterTitle,
            description: seo.twitterDescription,
            images: [ogImage],
        },
        icons: {
            icon: [
                // PNG icons first - Google requires multiples of 48px
                { url: 'https://www.lexiclash.live/icon-48.png', sizes: '48x48', type: 'image/png' },
                { url: 'https://www.lexiclash.live/icon-96.png', sizes: '96x96', type: 'image/png' },
                { url: 'https://www.lexiclash.live/icon-144.png', sizes: '144x144', type: 'image/png' },
                { url: 'https://www.lexiclash.live/icon-192.png', sizes: '192x192', type: 'image/png' },
                { url: 'https://www.lexiclash.live/icon-512.png', sizes: '512x512', type: 'image/png' },
                // SVG for modern browsers (after PNG for Google compatibility)
                { url: 'https://www.lexiclash.live/favicon.svg', type: 'image/svg+xml' },
            ],
            shortcut: [
                { url: 'https://www.lexiclash.live/favicon.ico', type: 'image/x-icon' },
            ],
            apple: [
                { url: 'https://www.lexiclash.live/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
                { url: 'https://www.lexiclash.live/icon-144.png', sizes: '144x144', type: 'image/png' },
            ],
        },
        alternates: {
            canonical: `https://www.lexiclash.live${localePath}`,
            languages: {
                'x-default': 'https://www.lexiclash.live/en',
                he: 'https://www.lexiclash.live/he',
                en: 'https://www.lexiclash.live/en',
                sv: 'https://www.lexiclash.live/sv',
                ja: 'https://www.lexiclash.live/ja',
                es: 'https://www.lexiclash.live/es',
                'en-IL': 'https://www.lexiclash.live/en',
                'he-IL': 'https://www.lexiclash.live/he',
                'en-US': 'https://www.lexiclash.live/en',
                'es-US': 'https://www.lexiclash.live/es',
                'en-GB': 'https://www.lexiclash.live/en',
                'en-SE': 'https://www.lexiclash.live/en',
                'sv-SE': 'https://www.lexiclash.live/sv',
                'en-JP': 'https://www.lexiclash.live/en',
                'ja-JP': 'https://www.lexiclash.live/ja',
                'en-ES': 'https://www.lexiclash.live/en',
                'es-ES': 'https://www.lexiclash.live/es',
                'en-MX': 'https://www.lexiclash.live/en',
                'es-MX': 'https://www.lexiclash.live/es',
                'en-AU': 'https://www.lexiclash.live/en',
                'es-AR': 'https://www.lexiclash.live/es',
                'es-CO': 'https://www.lexiclash.live/es',
            },
        },
        other: {
            'google-site-verification': '4Blim0yOh_Hl4uX9TFnRX71lagbldOOxg7PwrcEbhrc',
            // Geo-targeting: signal to search engines this site is based in Israel
            'geo.region': 'IL',
            'geo.placename': 'Israel',
            // Content-Language hints for search engines (supplements html lang attr)
            'content-language': validLocale === 'he' ? 'he-IL' : validLocale,
        },
    };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps): Promise<ReactNode> {
    const { locale } = await params;
    const validLocale = (SUPPORTED_LOCALES.has(locale) ? locale : 'en') as Locale;
    const dir = translations[validLocale]?.direction || 'ltr';
    const seo = translations[validLocale]?.seo || translations.en.seo;
    const localePath = getLocalePath(validLocale);
    const languageCode = getLanguageCode(validLocale);

    // Locale-aware font preloading: Hebrew pages get all 4 font variables,
    // non-Hebrew pages skip Hebrew font preloads (~60-80KB saved)
    const fontClasses = validLocale === 'he'
      ? `${fredokaLatin.variable || ''} ${fredokaHebrew.variable || ''} ${rubikLatin.variable || ''} ${rubikHebrew.variable || ''} ${heeboHebrew.variable || ''}`
      : `${fredokaLatin.variable || ''} ${rubikLatin.variable || ''}`;

    // Load only the active language's full translations server-side (~250KB instead of 1.26MB)
    // This is passed to ConditionalProviders → EssentialProviders → LanguageProvider
    // so the client only downloads the language it needs
    const initialTranslations = await loadTranslation(validLocale).catch(() => undefined);

    // IMPORTANT: The theme script below modifies the DOM before React hydration
    // To prevent hydration mismatches, we need to ensure the server-rendered className
    // is compatible with what the client will expect after the script runs
    // The script now preserves existing classes and only adds the theme class

    // Structured data for Google (JSON-LD)
    const structuredData = [
        // WebApplication schema - competitive multiplayer word game
        {
            '@context': 'https://schema.org',
            '@type': ['WebApplication', 'VideoGame'],
            '@id': 'https://www.lexiclash.live/#webapp',
            name: 'LexiClash',
            alternateName: ['LexiClash Multiplayer Word Game', 'LexiClash Word Battle', 'לקסיקלאש', 'לקסי קלאש', 'משחק מילים מרובה משתתפים', 'קרב מילים אונליין', 'משחק כמו בוגל', 'משחק כמו סקראבל', 'וורדל מרובה משתתפים'],
            applicationCategory: 'GameApplication',
            applicationSubCategory: 'Online Multiplayer Word Game',
            typicalAgeRange: '6-99',
            contentRating: 'Everyone',
            isFamilyFriendly: true,
            audience: {
                '@type': 'PeopleAudience',
                suggestedMinAge: 6,
            },
            operatingSystem: 'Any',
            browserRequirements: 'Requires JavaScript. Requires HTML5.',
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
            },
            // aggregateRating removed — hardcoded ratings risk a Google manual action.
            // TODO: Wire to real user ratings from Supabase when available.
            description: seo.description,
            url: `https://www.lexiclash.live${localePath}`,
            image: {
                '@type': 'ImageObject',
                url: 'https://www.lexiclash.live/og-image-en.webp',
                width: 1200,
                height: 630,
            },
            screenshot: 'https://www.lexiclash.live/og-image-en.webp',
            inLanguage: [languageCode, 'he', 'en', 'sv', 'ja', 'es'],
            availableLanguage: [
                { '@type': 'Language', name: 'English', alternateName: 'en' },
                { '@type': 'Language', name: 'Hebrew', alternateName: 'he' },
                { '@type': 'Language', name: 'Swedish', alternateName: 'sv' },
                { '@type': 'Language', name: 'Japanese', alternateName: 'ja' },
                { '@type': 'Language', name: 'Spanish', alternateName: 'es' },
            ],
            featureList: [
                'Online multiplayer word game with real-time gameplay',
                'Fast-paced competitive word battles',
                'Multiple language support (Hebrew, English, Swedish, Japanese, Spanish)',
                'Live leaderboard and rankings',
                'Achievement system with 35+ badges',
                'Room-based multiplayer with QR code sharing',
                'Cross-platform compatibility',
                'No download required - browser-based',
                'Daily Challenge mode like Wordle',
                'Single player vs AI bots',
                'Vocabulary building for language learners',
                'Perfect for parties and game nights',
                'Team building activities',
                'Educational word games for classrooms',
            ],
            genre: [
                'Word Game',
                'Puzzle',
                'Multiplayer',
                'Party Game',
                'Competitive Game',
                'Brain Training',
                'Educational',
                'Casual',
                'Family Friendly',
            ],
            playMode: ['MultiPlayer', 'SinglePlayer', 'CoOp'],
            numberOfPlayers: {
                '@type': 'QuantitativeValue',
                minValue: 1,
                maxValue: 20,
            },
            gamePlatform: [
                'Web Browser',
                'Desktop',
                'Mobile',
                'iOS',
                'Android',
            ],
            // Signal to Google that this app serves Israel (primary market) + global
            areaServed: [
                { '@type': 'Country', name: 'Israel' },
                { '@type': 'Country', name: 'United States' },
                { '@type': 'Country', name: 'Sweden' },
                { '@type': 'Country', name: 'Japan' },
            ],
            author: {
                '@type': 'Organization',
                name: 'LexiClash',
                url: 'https://www.lexiclash.live',
            },
            keywords: 'online multiplayer word game, multiplayer word game, real-time word battle, competitive word game, party game, word puzzle, wordle multiplayer, scrabble online, boggle online, ruzzle alternative, משחק מילים מרובה משתתפים, משחק מילים בעברית, קרב מילים אונליין, משחק מילים לחברים, וורדל בעברית, סקראבל אונליין, בוגל אונליין, תפזורת אונליין',
        },
        // Organization schema with social proof
        {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': 'https://www.lexiclash.live/#organization',
            name: 'LexiClash',
            url: 'https://www.lexiclash.live',
            logo: {
                '@type': 'ImageObject',
                url: 'https://www.lexiclash.live/og-image-en.webp',
                width: 1200,
                height: 630,
            },
            // Social media and platform presence for SEO authority
            sameAs: [
                'https://www.lexiclash.live',
                'https://www.instagram.com/lexi.clash',
                // TODO: Add TikTok and X/Twitter URLs here once accounts are created
            ],
            contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer support',
                availableLanguage: ['English', 'Hebrew', 'Swedish', 'Japanese', 'Spanish'],
            },
            foundingDate: '2024',
            slogan: 'Real-Time Multiplayer Word Battles',
            foundingLocation: {
                '@type': 'Place',
                address: {
                    '@type': 'PostalAddress',
                    addressCountry: 'IL',
                },
            },
        },
        // Website schema
        {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': 'https://www.lexiclash.live/#website',
            url: 'https://www.lexiclash.live',
            name: 'LexiClash',
            description: seo.description,
            publisher: {
                '@id': 'https://www.lexiclash.live/#organization',
            },
            inLanguage: [languageCode, 'he', 'en', 'sv', 'ja', 'es'],
        },
        // WebPage schema - marks the main page as the primary entry point
        {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            '@id': `https://www.lexiclash.live${localePath}#webpage`,
            url: `https://www.lexiclash.live${localePath}`,
            name: seo.title,
            description: seo.description,
            isPartOf: {
                '@id': 'https://www.lexiclash.live/#website',
            },
            about: {
                '@id': 'https://www.lexiclash.live/#webapp',
            },
            primaryImageOfPage: {
                '@type': 'ImageObject',
                url: 'https://www.lexiclash.live/og-image-en.webp',
            },
            mainContentOfPage: {
                '@type': 'WebPageElement',
                cssSelector: 'main',
            },
            speakable: {
                '@type': 'SpeakableSpecification',
                cssSelector: ['[data-speakable="true"]', 'h1', 'h2', 'main p:first-of-type'],
            },
        },
        // SiteNavigationElement schema for main navigation
        {
            '@context': 'https://schema.org',
            '@type': 'SiteNavigationElement',
            '@id': 'https://www.lexiclash.live/#site-navigation',
            name: 'Main Navigation',
            hasPart: [
                { '@type': 'SiteNavigationElement', name: 'Home', url: `https://www.lexiclash.live${localePath}` },
                { '@type': 'SiteNavigationElement', name: 'Play Classic', url: `https://www.lexiclash.live${localePath}/singleplayer` },
                { '@type': 'SiteNavigationElement', name: 'Daily Challenge', url: `https://www.lexiclash.live${localePath}/daily` },
                { '@type': 'SiteNavigationElement', name: 'Multiplayer', url: `https://www.lexiclash.live${localePath}/multiplayer` },
                { '@type': 'SiteNavigationElement', name: 'How to Play', url: `https://www.lexiclash.live${localePath}/how-to-play` },
                { '@type': 'SiteNavigationElement', name: 'Blog', url: `https://www.lexiclash.live${localePath}/blog` },
                { '@type': 'SiteNavigationElement', name: 'FAQ', url: `https://www.lexiclash.live${localePath}/faq` },
                { '@type': 'SiteNavigationElement', name: 'Leaderboard', url: `https://www.lexiclash.live${localePath}/leaderboard` },
                { '@type': 'SiteNavigationElement', name: 'About', url: `https://www.lexiclash.live${localePath}/about` },
                { '@type': 'SiteNavigationElement', name: 'Contact', url: `https://www.lexiclash.live${localePath}/contact` },
                { '@type': 'SiteNavigationElement', name: 'Word Solver', url: `https://www.lexiclash.live${localePath}/tools/word-solver` },
                { '@type': 'SiteNavigationElement', name: 'Word of the Day', url: `https://www.lexiclash.live${localePath}/word-of-the-day` },
                { '@type': 'SiteNavigationElement', name: 'Adventure Mode', url: `https://www.lexiclash.live${localePath}/adventure` },
            ],
        },
        // BreadcrumbList schema for better SERP navigation
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            '@id': `https://www.lexiclash.live${localePath}#breadcrumb`,
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Home',
                    item: `https://www.lexiclash.live${localePath}`,
                },
            ],
        },
        // HowTo schema for game instructions - improves search visibility for "how to play" queries
        {
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            '@id': 'https://www.lexiclash.live/#howto',
            name: languageCode === 'he' ? 'איך לשחק ב-LexiClash' : 'How to Play LexiClash',
            description: languageCode === 'he'
                ? 'למדו כיצד לשחק במשחק המילים המרובה משתתפים LexiClash'
                : 'Learn how to play the multiplayer word game LexiClash',
            totalTime: 'PT3M',
            step: [
                {
                    '@type': 'HowToStep',
                    name: languageCode === 'he' ? 'צרו או הצטרפו לחדר' : 'Create or Join a Room',
                    text: languageCode === 'he'
                        ? 'צרו חדר משחק חדש או הצטרפו לחדר קיים באמצעות קוד חדר או סריקת QR'
                        : 'Create a new game room or join an existing one using a room code or QR scan',
                    position: 1,
                },
                {
                    '@type': 'HowToStep',
                    name: languageCode === 'he' ? 'מצאו מילים בלוח' : 'Find Words on the Grid',
                    text: languageCode === 'he'
                        ? 'החליקו או לחצו על אותיות סמוכות כדי ליצור מילים - ככל שהמילה ארוכה יותר, יותר נקודות!'
                        : 'Swipe or click adjacent letters to form words - longer words score more points!',
                    position: 2,
                },
                {
                    '@type': 'HowToStep',
                    name: languageCode === 'he' ? 'בנו קומבו' : 'Build Combos',
                    text: languageCode === 'he'
                        ? 'מצאו מילים במהירות רצופה לבניית קומבו ולהכפלת הניקוד שלכם'
                        : 'Find words in quick succession to build combos and multiply your score',
                    position: 3,
                },
                {
                    '@type': 'HowToStep',
                    name: languageCode === 'he' ? 'נצחו את היריבים!' : 'Beat Your Opponents!',
                    text: languageCode === 'he'
                        ? 'השחקן עם הכי הרבה נקודות בסוף הזמן מנצח. מילים שנמצאו על ידי כולם לא נותנות נקודות!'
                        : 'The player with the most points when time runs out wins. Words found by everyone score nothing!',
                    position: 4,
                },
            ],
        },
        // Event schema for Daily Challenge - improves discoverability for recurring events
        {
            '@context': 'https://schema.org',
            '@type': 'Event',
            '@id': 'https://www.lexiclash.live/#daily-challenge',
            name: languageCode === 'he' ? 'אתגר יומי של LexiClash' : 'LexiClash Daily Challenge',
            description: languageCode === 'he'
                ? 'פאזל מילים יומי - אותו לוח לכולם ברחבי העולם! שתפו את התוצאות שלכם כמו וורדל'
                : 'Daily word puzzle - same board for everyone worldwide! Share your results like Wordle',
            startDate: '2024-01-01',
            endDate: '2099-12-31',
            eventStatus: 'https://schema.org/EventScheduled',
            eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
            location: {
                '@type': 'VirtualLocation',
                url: `https://www.lexiclash.live${localePath}/daily`,
            },
            organizer: {
                '@id': 'https://www.lexiclash.live/#organization',
            },
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                url: `https://www.lexiclash.live${localePath}/daily`,
            },
            isAccessibleForFree: true,
            eventSchedule: {
                '@type': 'Schedule',
                repeatFrequency: 'P1D',
                byDay: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            },
        },
        // FAQPage schema on homepage — enables expandable FAQ rich snippets in SERPs
        // Targets high-impression 0%-CTR queries from Bing data
        {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            '@id': `https://www.lexiclash.live${localePath}#faq`,
            mainEntity: [
                {
                    '@type': 'Question',
                    name: languageCode === 'he' ? 'האם אפשר לשחק בוגל אונליין בחינם?' : 'Can I play boggle online free with no download?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: languageCode === 'he'
                            ? 'כן! לקסיקלאש מאפשר לשחק בוגל אונליין בחינם ללא הורדה וללא הרשמה. פשוט גלשו ל-lexiclash.live והתחילו לשחק מיד בכל מכשיר.'
                            : 'Yes! LexiClash lets you play boggle online completely free with no download and no signup. Just visit lexiclash.live and start playing instantly on any device.',
                    },
                },
                {
                    '@type': 'Question',
                    name: languageCode === 'he' ? 'האם זה כמו Words With Friends?' : 'Is this like Words With Friends but multiplayer?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: languageCode === 'he'
                            ? 'לקסיקלאש שונה מ-Words With Friends כי כולם משחקים בו-זמנית בזמן אמת במקום בתורות. 2-20+ שחקנים יכולים להתחרות על אותו לוח. מהיר יותר, מרגש יותר ומושלם לקבוצות.'
                            : 'LexiClash is different from Words With Friends because everyone plays simultaneously in real-time instead of taking turns. 2-20+ players can compete on the same grid. Faster, more exciting, and perfect for groups.',
                    },
                },
                {
                    '@type': 'Question',
                    name: languageCode === 'he' ? 'האם המשחק חינם?' : 'Is LexiClash free to play?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: languageCode === 'he'
                            ? 'כן, לקסיקלאש חינם לחלוטין. ללא מנוי, ללא רכישות בתוך האפליקציה. פשוט גלשו ל-lexiclash.live והתחילו לשחק.'
                            : 'Yes, LexiClash is completely free. No subscription, no in-app purchases. Just visit lexiclash.live and start playing.',
                    },
                },
                {
                    '@type': 'Question',
                    name: languageCode === 'he' ? 'איך משחקים עם חברים?' : 'How do I play word games with friends online?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: languageCode === 'he'
                            ? 'צרו חדר, שתפו את הלינק עם חברים דרך וואטסאפ, דיסקורד או כל מסנג\'ר. חברים לוחצים על הלינק ומצטרפים מיד — ללא הרשמה או הורדה. עד 20+ שחקנים בחדר אחד.'
                            : 'Create a room, share the link with friends via WhatsApp, Discord, or any messenger. Friends click the link and join instantly — no signup or download needed. Up to 20+ players per room.',
                    },
                },
            ],
        },
    ];

    return (
        <html lang={validLocale} dir={dir} className={`dark ${fontClasses}`} suppressHydrationWarning>
            <head>
                <meta charSet="utf-8" />
                {/* Preconnect hints for faster resource loading on slow connections */}
                {/* Note: Google Fonts preconnects removed - now using next/font for zero CLS */}
                <link rel="preconnect" href="https://www.lexiclash.live" />
                <link rel="preconnect" href="https://hdtmpkicuxvtmvrmtybx.supabase.co" />
                <link rel="dns-prefetch" href="https://hdtmpkicuxvtmvrmtybx.supabase.co" />
                {/* PostHog EU analytics — preconnect for faster first event */}
                <link rel="preconnect" href="https://eu.i.posthog.com" />
                <link rel="dns-prefetch" href="https://eu.i.posthog.com" />
                {/* GIF preload removed — 571KB blocks critical resources (Lighthouse: LCP 24s → should drop significantly) */}
                {/* Favicon and icons - use relative paths for development, absolute for production */}
                {/* PNG icons FIRST - Google requires multiples of 48px and prefers PNG over SVG/ICO */}
                <link rel="icon" type="image/png" sizes="48x48" href="/icon-48.png" />
                <link rel="icon" type="image/png" sizes="96x96" href="/icon-96.png" />
                <link rel="icon" type="image/png" sizes="144x144" href="/icon-144.png" />
                <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
                <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
                {/* SVG favicon for modern browsers (after PNG for Google compatibility) */}
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                {/* Apple touch icons for iOS devices */}
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
                <link rel="apple-touch-icon" sizes="152x152" href="/icon-144.png" />
                <link rel="apple-touch-icon" sizes="144x144" href="/icon-144.png" />
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="theme-color" content="#1a1a2e" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
                />
                <link rel="manifest" href="/manifest.webmanifest" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="LexiClash" />
                {/* CrazyGames SDK must load in <head> with beforeInteractive
                    so it's detected by their QA tool before hydration */}
                <CrazyGamesScriptServer />
                <OrganizationJsonLd />
                <VideoGameJsonLd />
            </head>
            <body className="antialiased screen-fit" suppressHydrationWarning>
                {/* Dark-only theme — static string literal, no user input, safe from XSS */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `document.documentElement.classList.add('dark')`,
                    }}
                />
                {/* Skip to main content link for keyboard/screen reader users */}
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-70 focus:px-4 focus:py-3 focus:min-h-[48px] focus:min-w-[48px] focus:bg-neo-lime focus:text-neo-black focus:font-bold focus:border-3 focus:border-neo-black focus:rounded-neo focus:shadow-hard focus:outline-hidden focus:flex focus:items-center focus:justify-center focus:ring-4 focus:ring-neo-cyan focus:ring-offset-2"
                    aria-label={translations[validLocale]?.accessibility?.skipToMain || 'Skip to main content'}
                >
                    {translations[validLocale]?.accessibility?.skipToMain || 'Skip to main content'}
                </a>
                {/* Google Consent Mode v2 — MUST load before GA/AdSense */}
                <GoogleConsentMode />
                {/* Load external scripts with optimized strategies to prevent blocking */}
                <GoogleAnalytics />
                <GoogleAdSense />
                <SocialMediaPixels />
                <WebVitalsReporter />
                <ServiceWorkerRegistration />
                {/* Defer loading animations.css (60KB) after page mount */}
                <AnimationsLoader />
                {/* DeepLinkHandler moved to NativeAppProvider (client component) to avoid Capacitor/Turbopack issues */}
                {/* Initialize native OAuth (Google/Apple Sign-In) on mobile */}
                <NativeOAuthInitializer />
                {/* Server-rendered legal navigation — guarantees crawlers find
                    privacy/terms/about links even without JS execution (AdSense requirement) */}
                <nav aria-label="Site Navigation" className="sr-only">
                    <ul>
                        <li><a href={`/${validLocale}/how-to-play`}>{translations[validLocale]?.nav?.howToPlay || 'How to Play'}</a></li>
                        <li><a href={`/${validLocale}/blog`}>{translations[validLocale]?.nav?.blog || 'Blog'}</a></li>
                        <li><a href={`/${validLocale}/faq`}>{translations[validLocale]?.nav?.faq || 'FAQ'}</a></li>
                        <li><a href={`/${validLocale}/about`}>{translations[validLocale]?.nav?.aboutLexiClash || 'About LexiClash'}</a></li>
                        <li><a href={`/${validLocale}/contact`}>{translations[validLocale]?.nav?.contactUs || 'Contact Us'}</a></li>
                        <li><a href={`/${validLocale}/legal/privacy`}>{translations[validLocale]?.nav?.privacyPolicy || 'Privacy Policy'}</a></li>
                        <li><a href={`/${validLocale}/legal/terms`}>{translations[validLocale]?.nav?.termsOfService || 'Terms of Service'}</a></li>
                        <li><a href={`/${validLocale}/legal/disclaimer`}>{translations[validLocale]?.nav?.disclaimer || 'Disclaimer'}</a></li>
                    </ul>
                </nav>
                <ConditionalProviders lang={validLocale} initialTranslations={initialTranslations}>
                    {/* VersionChecker needs to be inside providers to access LanguageContext */}
                    <VersionChecker />
                    <div className="flex-1 flex flex-col min-h-0 relative overflow-x-clip">
                        <DesktopGameNav />
                        <main
                            id="main-content"
                            className="relative z-10 main-content-safe flex-1 min-h-0 flex flex-col"
                            tabIndex={-1}
                        >
                            <div className="flex-1 flex flex-col min-h-0">
                                {children}
                            </div>
                        </main>
                        <AutoHideFooter className="relative z-0 shrink-0" />
                        {/* Global bottom navigation - mobile only, hidden during gameplay */}
                        <GlobalBottomNav />
                    </div>
                    <PWAInstallPrompt />
                    <PushNotificationPrompt />
                    <EmailCaptureModal />
                    <NewYearCountdown />
                    <CookieConsent />
                    <ChurnSignalTracker />
                    {/* Toast notifications container */}
                    <ToastContainer position="bottom-right" />
                    {process.env.NODE_ENV !== 'production' && (
                      <FeedbackToolbar projectToken={process.env.NEXT_PUBLIC_FEEDBACK_TOKEN!} />
                    )}
                </ConditionalProviders>
            </body>
        </html>
    );
}
