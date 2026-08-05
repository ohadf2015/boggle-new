import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import nextDynamic from 'next/dynamic';
import { layoutTranslations as translations } from '@/translations/layout';
import { ConditionalProviders } from '../conditional-providers';
import { loadTranslation } from '@/translations/loadTranslation';
import AutoHideFooter from '@/components/AutoHideFooter';
import GlobalBottomNav from '@/components/GlobalBottomNav';
import ScrollToTopOnNavigate from '@/components/ScrollToTopOnNavigate';
import InGameAudioButton from '@/components/InGameAudioButton';
import GoogleConsentMode from '@/components/GoogleConsentMode';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import AdSenseLoader from '@/components/ads/AdSenseLoader';
import WebAnchorAdObserver from '@/components/ads/WebAnchorAdObserver';
import CrazyGamesScriptServer from '@/components/CrazyGamesScriptServer';
import FeedbackDevtoolsWidget from '@/components/feedback/FeedbackDevtoolsWidget';
import WebVitalsReporter from '@/components/WebVitalsReporter';
import PagePresenceReporter from '@/components/PagePresenceReporter';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
// Eager (not nextDynamic): a lazily-loaded recovery component could itself be
// the stale chunk that 404s, defeating its purpose.
import ChunkErrorRecovery from '@/components/ChunkErrorRecovery';
import AnimationsLoader from '@/components/AnimationsLoader';
import { STORAGE_SHIM_SCRIPT } from '@/utils/storageShim';
import DictionaryPrewarmer from '@/components/DictionaryPrewarmer';
import NativeOAuthInitializer from '@/components/NativeOAuthInitializer';
import GoogleOneTapInitializer from '@/components/auth/GoogleOneTapInitializer';
import NativePGSInitializer from '@/components/NativePGSInitializer';
import { OfflineBanner } from '@/components/offline/OfflineBanner';
import { OfflineSyncBridge } from '@/components/offline/OfflineSyncBridge';
import { getLocalizedSchemaStrings } from '@/utils/seoLocalizedSchema';
import { ANDROID_PACKAGE } from '@/utils/androidApp';
import type { Language } from '@/shared/types/game';

import { fredokaLatin, fredokaHebrew, rubikLatin, rubikHebrew, heeboHebrew, fredokaCyrillic, rubikCyrillic } from '../fonts';

// Lazy-load push notification prompt — shown after engagement threshold
const PushNotificationPrompt = nextDynamic(
  () => import('@/components/notifications/PushNotificationPrompt'),
  { loading: () => null }
);

// Lazy-load cookie consent banner — only needed on first visit
const CookieConsent = nextDynamic(() => import('@/components/CookieConsent'));

// Non-critical components — deferred to keep landing-page JS small.
// All are post-hydration effects that don't block first paint or LCP.
const PWAInstallPrompt = nextDynamic(() => import('@/components/PWAInstallPrompt'), {
  loading: () => null,
});
const AndroidAppRedirect = nextDynamic(() => import('@/components/AndroidAppRedirect'), {
  loading: () => null,
});
const AndroidAppInstallPromo = nextDynamic(() => import('@/components/AndroidAppInstallPromo'), {
  loading: () => null,
});
const AndroidInstallPill = nextDynamic(() => import('@/components/android-install/AndroidInstallPill'), {
  loading: () => null,
});
const VersionChecker = nextDynamic(() => import('@/components/VersionChecker'), {
  loading: () => null,
});
const NewYearCountdown = nextDynamic(() => import('@/components/celebration/NewYearCountdown'), {
  loading: () => null,
});
const ChurnSignalTracker = nextDynamic(
  () => import('@/components/engagement/ChurnSignalTracker').then(m => ({ default: m.ChurnSignalTracker })),
  { loading: () => null }
);
const SocialMediaPixels = nextDynamic(() => import('@/components/SocialMediaPixels'), {
  loading: () => null,
});

// Synchronously primes CSS vars from localStorage before paint to prevent CLS
// from AdMob SizeChanged async event and GlobalBottomNav ResizeObserver.
// Static literal — no user input. Sanity cap at 200px: nav max ≈ 64 + 48px
// safe-area = 112; banner max (ADAPTIVE on Android 15) ≈ 75 + safe-area ≈ 110.
// Anything past 200 is a stale value from a pathological prior session (Android
// 15+ safe-area plugin double-counted system bars and we cached the result) —
// dropping it forces the runtime to re-measure cleanly, otherwise it haunts
// this session via PRIME before useSafeArea / AnchoredNativeBanner can recover.
const PRIME_CLS_VARS_SCRIPT = `(function(){try{var d=document.documentElement;var b=parseFloat(localStorage.getItem('lc_admob_h'));var n=parseFloat(localStorage.getItem('lc_bottom_nav_h'));if(!isNaN(b)&&b>=0&&b<=200)d.style.setProperty('--admob-banner-height',b+'px');else if(!isNaN(b))try{localStorage.removeItem('lc_admob_h')}catch(e){}if(!isNaN(n)&&n>=0&&n<=200)d.style.setProperty('--bottom-nav-height',n+'px');else if(!isNaN(n))try{localStorage.removeItem('lc_bottom_nav_h')}catch(e){}}catch(e){}})();`;

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

interface LocaleLayoutProps {
    children: ReactNode;
    params: Promise<{ locale: string }>;
}

const SUPPORTED_LOCALES = new Set(['en', 'he', 'sv', 'ja', 'es', 'ru']);

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
                ru: 'https://www.lexiclash.live/ru',
                'ru-RU': 'https://www.lexiclash.live/ru',
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
            // App Links: lets Facebook/Twitter/LinkedIn/Slack link previews render
            // an "Open in App" / install action pointing at the Play listing when
            // this page is shared, instead of a plain web card.
            'al:android:package': ANDROID_PACKAGE,
            'al:android:app_name': 'LexiClash',
            'al:android:url': `https://www.lexiclash.live${localePath}`,
            'al:web:should_fallback': 'true',
        },
    };
}

// WORKAROUND for Next.js 16 memory leak (vercel/next.js#90433): with
// `output: 'standalone'`, server-side fetches that go through Next's Data Cache
// leave tee'd ReadableStream branches uncancelled, retained forever by the
// internal `cacheController` (~7.7MB per render, verified via heap-snapshot diff
// 2026-07-20 → OOM). Forcing fetches to no-store bypasses the Data Cache tee.
// Cascades to all [locale] routes. Landing data is still amortized by the
// in-process TTL cache (lib/cache/ttlCache). REMOVE once #90433 is fixed upstream.
export const fetchCache = 'force-no-store';

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: '#1a1a2e',
    // Let the soft keyboard SHRINK the layout viewport instead of overlaying it.
    // With this, a bottom-anchored element (e.g. the onboarding "Continue" CTA)
    // sits above the keyboard rather than behind it. Combined with 100dvh on the
    // onboarding overlay, this keeps the primary action reachable while typing.
    interactiveWidget: 'resizes-content' as const,
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps): Promise<ReactNode> {
    const { locale } = await params;
    const validLocale = (SUPPORTED_LOCALES.has(locale) ? locale : 'en') as Locale;
    const dir = translations[validLocale]?.direction || 'ltr';
    const seo = translations[validLocale]?.seo || translations.en.seo;
    const localePath = getLocalePath(validLocale);
    const languageCode = getLanguageCode(validLocale);
    const schemaStrings = getLocalizedSchemaStrings(validLocale);

    // Locale-aware font preloading: Hebrew pages get all 4 font variables,
    // non-Hebrew pages skip Hebrew font preloads (~60-80KB saved)
    // Russian needs Cyrillic glyphs: Fredoka has none → Comfortaa (display),
    // Rubik ships Cyrillic upstream (body). Both also carry Latin so the brand
    // name / numbers still render. Use ONLY the Cyrillic faces to avoid a
    // --font-fredoka / --font-rubik CSS-var collision with the Latin faces.
    const fontClasses = validLocale === 'he'
      ? `${fredokaLatin.variable || ''} ${fredokaHebrew.variable || ''} ${rubikLatin.variable || ''} ${rubikHebrew.variable || ''} ${heeboHebrew.variable || ''}`
      : validLocale === 'ru'
        ? `${fredokaCyrillic.variable || ''} ${rubikCyrillic.variable || ''}`
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
            inLanguage: [languageCode, 'he', 'en', 'sv', 'ja', 'es', 'ru'],
            availableLanguage: [
                { '@type': 'Language', name: 'English', alternateName: 'en' },
                { '@type': 'Language', name: 'Hebrew', alternateName: 'he' },
                { '@type': 'Language', name: 'Swedish', alternateName: 'sv' },
                { '@type': 'Language', name: 'Japanese', alternateName: 'ja' },
                { '@type': 'Language', name: 'Spanish', alternateName: 'es' },
                { '@type': 'Language', name: 'Russian', alternateName: 'ru' },
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
            alternateName: ['לקסיקלאש', 'לקסי קלאש', 'Lexi Clash'],
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
                'https://play.google.com/store/apps/details?id=live.lexiclash.app',
                'https://www.crazygames.com/game/lexiclash',
                // TODO: Add TikTok and X/Twitter URLs here once accounts are created
            ],
            contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer support',
                availableLanguage: ['English', 'Hebrew', 'Swedish', 'Japanese', 'Spanish', 'Russian'],
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
            alternateName: ['לקסיקלאש', 'לקסי קלאש', 'Lexi Clash', 'LexiClash Word Game'],
            description: seo.description,
            publisher: {
                '@id': 'https://www.lexiclash.live/#organization',
            },
            inLanguage: [languageCode, 'he', 'en', 'sv', 'ja', 'es', 'ru'],
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
        // SiteNavigationElement schema — ordered by user value for sitelinks signal
        // (Google picks ~6-8 sitelinks; lead with highest-CTR/most-distinctive pages)
        {
            '@context': 'https://schema.org',
            '@type': 'SiteNavigationElement',
            '@id': 'https://www.lexiclash.live/#site-navigation',
            name: 'Main Navigation',
            hasPart: [
                { '@type': 'SiteNavigationElement', name: 'Multiplayer Word Battle', url: `https://www.lexiclash.live${localePath}/multiplayer` },
                { '@type': 'SiteNavigationElement', name: 'Daily Word Wheel', url: `https://www.lexiclash.live${localePath}/daily/word-wheel` },
                { '@type': 'SiteNavigationElement', name: 'Daily Word Hunt', url: `https://www.lexiclash.live${localePath}/daily` },
                { '@type': 'SiteNavigationElement', name: 'Word of the Day', url: `https://www.lexiclash.live${localePath}/word-of-the-day` },
                { '@type': 'SiteNavigationElement', name: 'Adventure Mode', url: `https://www.lexiclash.live${localePath}/adventure` },
                { '@type': 'SiteNavigationElement', name: 'Leaderboard', url: `https://www.lexiclash.live${localePath}/leaderboard` },
                { '@type': 'SiteNavigationElement', name: 'Play Classic Solo', url: `https://www.lexiclash.live${localePath}/singleplayer` },
                { '@type': 'SiteNavigationElement', name: 'Word Solver', url: `https://www.lexiclash.live${localePath}/tools/word-solver` },
                { '@type': 'SiteNavigationElement', name: 'How to Play', url: `https://www.lexiclash.live${localePath}/how-to-play` },
                { '@type': 'SiteNavigationElement', name: 'Blog', url: `https://www.lexiclash.live${localePath}/blog` },
                { '@type': 'SiteNavigationElement', name: 'FAQ', url: `https://www.lexiclash.live${localePath}/faq` },
                { '@type': 'SiteNavigationElement', name: 'About', url: `https://www.lexiclash.live${localePath}/about` },
            ],
        },
        // Game modes ItemList — exposes the 8 distinct game modes as sub-entities
        // for richer brand SERP / sitelinks consideration (rising "lexiclash" brand query +320% w/w).
        {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            '@id': 'https://www.lexiclash.live/#game-modes',
            name: 'LexiClash Game Modes',
            description: '8 distinct word game modes — multiplayer, daily, solo, adventure, blast, word hunt, word wheel, brain training.',
            numberOfItems: 8,
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Multiplayer Word Battle', url: `https://www.lexiclash.live${localePath}/multiplayer`, description: 'Real-time grid battles with 2-20 friends, free, no download.' },
                { '@type': 'ListItem', position: 2, name: 'Daily Word Wheel', url: `https://www.lexiclash.live${localePath}/daily/word-wheel`, description: 'Spin the daily letter wheel, find every word, beat the timer.' },
                { '@type': 'ListItem', position: 3, name: 'Daily Word Hunt', url: `https://www.lexiclash.live${localePath}/daily`, description: 'Wordle-style 10-attempt survival mode with global leaderboard.' },
                { '@type': 'ListItem', position: 4, name: 'Adventure Mode', url: `https://www.lexiclash.live${localePath}/adventure`, description: 'Roguelike word-game adventure with bosses and loot.' },
                { '@type': 'ListItem', position: 5, name: 'Blast', url: `https://www.lexiclash.live${localePath}/singleplayer`, description: 'Cascading combos and tile-clearing word puzzles.' },
                { '@type': 'ListItem', position: 6, name: 'Single Player vs AI', url: `https://www.lexiclash.live${localePath}/singleplayer`, description: 'Solo practice against AI bots with adjustable difficulty.' },
                { '@type': 'ListItem', position: 7, name: 'Brain Training Drills', url: `https://www.lexiclash.live${localePath}/brain-training`, description: 'Quick vocab and pattern drills, daily progression.' },
                { '@type': 'ListItem', position: 8, name: 'Word of the Day', url: `https://www.lexiclash.live${localePath}/word-of-the-day`, description: 'Daily featured word with definition, etymology and example use.' },
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
            name: schemaStrings.howToName,
            description: schemaStrings.howToDescription,
            totalTime: 'PT3M',
            inLanguage: languageCode,
            step: schemaStrings.steps.map((s, i) => ({
                '@type': 'HowToStep',
                name: s.name,
                text: s.text,
                position: i + 1,
            })),
        },
        // Event schema for Daily Challenge - improves discoverability for recurring events
        {
            '@context': 'https://schema.org',
            '@type': 'Event',
            '@id': 'https://www.lexiclash.live/#daily-challenge',
            name: schemaStrings.dailyEventName,
            description: schemaStrings.dailyEventDescription,
            inLanguage: languageCode,
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
        // FAQPage JSON-LD lives on the homepage only (lib/seo/homepageFaqJsonLd.ts)
        // to avoid Google "Duplicate field 'FAQPage'" on landing pages with own FAQ.
    ];

    return (
        <html lang={validLocale} dir={dir} className={`dark ${fontClasses}`} suppressHydrationWarning>
            <head>
                <meta charSet="utf-8" />
                {/* Must be the first script — see STORAGE_SHIM_SCRIPT comment above */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: STORAGE_SHIM_SCRIPT,
                    }}
                />
                {/* Preconnect hints for faster resource loading on slow connections */}
                {/* Note: Google Fonts preconnects removed - now using next/font for zero CLS */}
                <link rel="preconnect" href="https://www.lexiclash.live" />
                <link rel="preconnect" href="https://hdtmpkicuxvtmvrmtybx.supabase.co" />
                <link rel="dns-prefetch" href="https://hdtmpkicuxvtmvrmtybx.supabase.co" />
                {/* PostHog EU analytics — preconnect for faster first event */}
                <link rel="preconnect" href="https://eu.i.posthog.com" />
                <link rel="dns-prefetch" href="https://eu.i.posthog.com" />
                {/* AdSense / Google Ads — preconnect for ad script and ad serving origins */}
                <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
                <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
                <link rel="preconnect" href="https://googleads.g.doubleclick.net" />
                <link rel="dns-prefetch" href="https://googleads.g.doubleclick.net" />
                {/* CrazyGames SDK — preconnect for game-distribution builds */}
                <link rel="preconnect" href="https://sdk.crazygames.com" />
                <link rel="dns-prefetch" href="https://sdk.crazygames.com" />
                {/* GIF preload removed — 571KB blocks critical resources (Lighthouse: LCP 24s → should drop significantly) */}
                {/* Locale-conditional font preloads — Hebrew/Cyrillic fonts have
                    preload: false in fonts.ts to avoid wasted bytes on Latin pages.
                    Preload them here when the locale actually needs them.
                    Next.js auto-generates size-adjust for the fallback,
                    so font-swap CLS is already mitigated. */}
                {validLocale === 'he' && (
                  <>
                    <link rel="preload" href="/fonts/fredoka-hebrew.woff2" as="font" type="font/woff2" crossOrigin="anonymous" fetchPriority="high" />
                    <link rel="preload" href="/fonts/rubik-hebrew.woff2" as="font" type="font/woff2" crossOrigin="anonymous" fetchPriority="high" />
                    <link rel="preload" href="/fonts/heebo-hebrew.woff2" as="font" type="font/woff2" crossOrigin="anonymous" fetchPriority="high" />
                  </>
                )}
                {validLocale === 'ru' && (
                  <>
                    <link rel="preload" href="/fonts/comfortaa-cyrillic.woff2" as="font" type="font/woff2" crossOrigin="anonymous" fetchPriority="high" />
                    <link rel="preload" href="/fonts/rubik-cyrillic.woff2" as="font" type="font/woff2" crossOrigin="anonymous" fetchPriority="high" />
                  </>
                )}
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
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
                />
                <link rel="manifest" href="/manifest.webmanifest" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="LexiClash" />
                {/* CrazyGames SDK — loaded with lazyOnload strategy (non-blocking).
                    Render position in <head> is vestigial (next/script injects at
                    the document body regardless of tree position). */}
                <CrazyGamesScriptServer />
                {/* CLS guard: prime --admob-banner-height and --bottom-nav-height
                    from localStorage BEFORE first paint.
                    Static string literal, no user input. */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: PRIME_CLS_VARS_SCRIPT,
                    }}
                />
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
                    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-70 focus:px-4 focus:py-3 focus:min-h-[48px] focus:min-w-[48px] focus:bg-accent focus:text-accent-foreground focus:font-bold focus:border-3 focus:border-neo-black focus:rounded-neo focus:shadow-hard focus:outline-hidden focus:flex focus:items-center focus:justify-center focus:ring-4 focus:ring-neo-cyan focus:ring-offset-2"
                    aria-label={translations[validLocale]?.accessibility?.skipToMain || 'Skip to main content'}
                >
                    {translations[validLocale]?.accessibility?.skipToMain || 'Skip to main content'}
                </a>
                {/* Google Consent Mode v2 — MUST load before GA */}
                <GoogleConsentMode />
                {/* Load external scripts with optimized strategies to prevent blocking */}
                <GoogleAnalytics />
                {/* Direct AdSense (web Auto-Ads) — replaces PurpleAds. Dark until
                    NEXT_PUBLIC_ADSENSE_ENABLED=true; consent/tier/web gated internally. */}
                <AdSenseLoader />
                {/* Web anchor-ad height observer — measures AdSense anchor ad band
                    and publishes --web-anchor-ad-height for CLS prevention. */}
                <WebAnchorAdObserver />
                <SocialMediaPixels />
                <WebVitalsReporter />
                {/* Report current page so admin live monitor sees users not in a game */}
                <PagePresenceReporter />
                <ServiceWorkerRegistration />
                {/* Defer loading animations.css (60KB) after page mount */}
                <AnimationsLoader />
                {/* Warm client dict Set on idle so first word submit skips ~100-300ms fetch */}
                <DictionaryPrewarmer lang={validLocale as Language} />
                {/* DeepLinkHandler moved to NativeAppProvider (client component) to avoid Capacitor/Turbopack issues */}
                {/* Initialize native OAuth (Google/Apple Sign-In) on mobile */}
                <NativeOAuthInitializer />
                {/* Warm the Android-only Play Games Services bridge on mobile */}
                <NativePGSInitializer />
                {/* Server-rendered legal navigation — guarantees crawlers find
                    privacy/terms/about links even without JS execution */}
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
                    {/* Pin every new route to the top of the page — the app's scroll
                        container is <body class="screen-fit">, so without this a stale
                        offset (or a child's mount-time auto-scroll) can open a page at
                        the footer. */}
                    <ScrollToTopOnNavigate />
                    {/* VersionChecker needs to be inside providers to access LanguageContext */}
                    <VersionChecker />
                    {/* Auto-recovers stale-deploy chunk 404s that escape error boundaries
                        (prefetch / asset onerror / next/dynamic import rejections). */}
                    <ChunkErrorRecovery />
                    <OfflineBanner />
                    <OfflineSyncBridge />
                    <div className="flex-1 flex flex-col min-h-0 relative overflow-x-clip">
                        <main
                            id="main-content"
                            className="main-content-safe flex-1 min-h-0 flex flex-col"
                            tabIndex={-1}
                        >
                            <div className="flex-1 flex flex-col min-h-0">
                                {children}
                            </div>
                        </main>
                        <AutoHideFooter className="relative z-0 shrink-0" />
                        {/* Global bottom navigation - mobile only, hidden during gameplay */}
                        <GlobalBottomNav />
                        {/* Global mute control — appears only during active gameplay, when
                            the header (and its MusicControls) is hidden. */}
                        <InGameAudioButton />
                    </div>
                    <AndroidAppRedirect />
                    <AndroidAppInstallPromo />
                    <AndroidInstallPill />
                    <PWAInstallPrompt />
                    <PushNotificationPrompt />
                    <NewYearCountdown />
                    <CookieConsent />
                    {/* Single feedback entry point: feedback.devtools shared widget —
                        neo-brutalist launcher, posts via same-origin /api/v1/feedback
                        proxy to the shared ingest API */}
                    <FeedbackDevtoolsWidget />
                    {/* Google One Tap (web) — in-page ID-token sign-in so Google's
                        consent shows our domain, not <ref>.supabase.co. No redirect. */}
                    <GoogleOneTapInitializer />
                    <ChurnSignalTracker />
                </ConditionalProviders>
            </body>
        </html>
    );
}
