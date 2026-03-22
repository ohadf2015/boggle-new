import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import nextDynamic from 'next/dynamic';
import { layoutTranslations as translations } from '@/translations/layout';
import { ConditionalProviders } from '../conditional-providers';
import { loadTranslation } from '@/translations/loadTranslation';
import AutoHideFooter from '@/components/AutoHideFooter';
import GlobalBottomNav from '@/components/GlobalBottomNav';
import GoogleConsentMode from '@/components/GoogleConsentMode';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import GoogleAdSense from '@/components/GoogleAdSense';
import { CrazyGamesScript } from '@/components/CrazyGamesSDK';
import WebVitalsReporter from '@/components/WebVitalsReporter';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import VersionChecker from '@/components/VersionChecker';
import NewYearCountdown from '@/components/celebration/NewYearCountdown';
import AnimationsLoader from '@/components/AnimationsLoader';
import DeepLinkHandler from '@/components/DeepLinkHandler';
import NativeOAuthInitializer from '@/components/NativeOAuthInitializer';
import { ToastContainer } from '@/components/ui/EnhancedToast';
import { fredoka, rubik } from '../fonts';

// Dynamic import for EmailCaptureModal (shown conditionally, not needed immediately)
const EmailCaptureModal = nextDynamic(() => import('@/components/EmailCaptureModal'), {
  loading: () => null,
});

// Lazy-load push notification prompt — shown after engagement threshold
const PushNotificationPrompt = nextDynamic(
  () => import('@/components/notifications/PushNotificationPrompt'),
  { loading: () => null }
);

// Lazy-load persistent streak bar — engagement status on every screen
const StreakBar = nextDynamic(
  () => import('@/components/engagement/StreakBar'),
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
    const validLocale = (locale as Locale) || 'en';
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
                { url: 'https://www.lexiclash.live/icon-48.png', sizes: '48x48', type: 'image/png' },
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
        },
    };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps): Promise<ReactNode> {
    const { locale } = await params;
    const validLocale = (locale as Locale) || 'he';
    const dir = translations[validLocale]?.direction || 'rtl';
    const seo = translations[validLocale]?.seo || translations.he.seo;
    const localePath = getLocalePath(validLocale);
    const languageCode = getLanguageCode(validLocale);

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
            applicationSubCategory: 'Multiplayer Word Game',
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
                'Real-time multiplayer gameplay',
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
            author: {
                '@type': 'Organization',
                name: 'LexiClash',
                url: 'https://www.lexiclash.live',
            },
            keywords: 'multiplayer word game, real-time word battle, competitive word game, party game, word puzzle, wordle multiplayer, scrabble online, boggle online, ruzzle alternative, משחק מילים מרובה משתתפים, משחק מילים בעברית, קרב מילים אונליין, משחק מילים לחברים, וורדל בעברית, סקראבל אונליין, בוגל אונליין, תפזורת אונליין',
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
    ];

    return (
        <html lang={validLocale} dir={dir} className={`dark ${fredoka.variable || ''} ${rubik.variable || ''}`} suppressHydrationWarning>
            <head>
                <meta charSet="utf-8" />
                {/* Preconnect hints for faster resource loading on slow connections */}
                {/* Note: Google Fonts preconnects removed - now using next/font for zero CLS */}
                <link rel="preconnect" href="https://www.lexiclash.live" />
                <link rel="preconnect" href="https://hdtmpkicuxvtmvrmtybx.supabase.co" />
                <link rel="dns-prefetch" href="https://hdtmpkicuxvtmvrmtybx.supabase.co" />
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
                <link rel="manifest" href="/manifest.json" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="LexiClash" />
            </head>
            <body className="antialiased screen-fit" suppressHydrationWarning>
                {/* Skip to main content link for keyboard/screen reader users */}
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-70 focus:px-4 focus:py-3 focus:min-h-[48px] focus:min-w-[48px] focus:bg-neo-lime focus:text-neo-black focus:font-bold focus:border-3 focus:border-neo-black focus:rounded-neo focus:shadow-hard focus:outline-none focus:flex focus:items-center focus:justify-center focus:ring-4 focus:ring-neo-cyan focus:ring-offset-2"
                    aria-label={translations[validLocale]?.accessibility?.skipToMain || 'Skip to main content'}
                >
                    {translations[validLocale]?.accessibility?.skipToMain || 'Skip to main content'}
                </a>
                {/* Google Consent Mode v2 — MUST load before GA/AdSense */}
                <GoogleConsentMode />
                {/* Load external scripts with optimized strategies to prevent blocking */}
                <GoogleAnalytics />
                <GoogleAdSense />
                <CrazyGamesScript />
                <WebVitalsReporter />
                <ServiceWorkerRegistration />
                {/* Defer loading animations.css (60KB) after page mount */}
                <AnimationsLoader />
                {/* Handle deep links for OAuth callbacks on mobile (Capacitor) */}
                <DeepLinkHandler />
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
                    <div className="flex-1 flex flex-col min-h-0 relative [overflow-x:clip]">
                        <main
                            id="main-content"
                            className="relative z-10 main-content-safe flex-1 min-h-0 flex flex-col"
                            tabIndex={-1}
                        >
                            <StreakBar />
                            <div className="flex-1 flex flex-col min-h-0">
                                {children}
                            </div>
                            <AutoHideFooter className="relative z-0 flex-shrink-0 mt-auto" />
                        </main>
                        {/* Global bottom navigation - mobile only, hidden during gameplay */}
                        <GlobalBottomNav />
                    </div>
                    <PWAInstallPrompt />
                    <PushNotificationPrompt />
                    <EmailCaptureModal />
                    <NewYearCountdown />
                    <CookieConsent />
                    {/* Toast notifications container */}
                    <ToastContainer position="bottom-right" />
                </ConditionalProviders>
            </body>
        </html>
    );
}
