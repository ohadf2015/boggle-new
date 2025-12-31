import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { translations } from '@/translations';
import { Providers } from '../providers';
import Footer from '@/components/Footer';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import SocialMediaPixels from '@/components/SocialMediaPixels';
import WebVitalsReporter from '@/components/WebVitalsReporter';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import EmailCaptureModal from '@/components/EmailCaptureModal';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import NewYearCountdown from '@/components/celebration/NewYearCountdown';
import { fredoka, rubik } from '../fonts';

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const runtime = 'nodejs';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface LocaleLayoutProps {
    children: ReactNode;
    params: Promise<{ locale: string }>;
}

// Helper function to get locale-specific URL path
// Always returns explicit locale path for SEO consistency
function getLocalePath(locale: string): string {
    switch (locale) {
        case 'en':
            return '/en';
        case 'sv':
            return '/sv';
        case 'ja':
            return '/ja';
        case 'he':
            return '/he';
        case 'es':
            return '/es';
        default:
            return '/en'; // Default to English for SEO
    }
}

// Helper function to get language code for structured data
function getLanguageCode(locale: string): string {
    switch (locale) {
        case 'en':
            return 'en';
        case 'sv':
            return 'sv';
        case 'ja':
            return 'ja';
        case 'es':
            return 'es';
        case 'he':
        default:
            return 'he';
    }
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
    const { locale } = await params;
    const validLocale = (locale as Locale) || 'he';
    const seo = translations[validLocale]?.seo || translations.he.seo;
    const localePath = getLocalePath(validLocale);

    // Use locale-specific OG image
    const ogImageMap: Record<string, string> = {
        he: 'https://www.lexiclash.live/og-image-he.jpg',
        en: 'https://www.lexiclash.live/og-image-en.jpg',
        sv: 'https://www.lexiclash.live/og-image-sv.jpg',
        ja: 'https://www.lexiclash.live/og-image-ja.jpg',
        es: 'https://www.lexiclash.live/og-image-es.jpg',
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
            },
        },
        other: {
            'google-site-verification': '4Blim0yOh_Hl4uX9TFnRX71lagbldOOxg7PwrcEbhrc',
        },
    };
}

// Removed generateStaticParams to prevent static generation
// The app uses dynamic rendering with WebSocket connections

export default async function LocaleLayout({ children, params }: LocaleLayoutProps): Promise<ReactNode> {
    const { locale } = await params;
    const validLocale = (locale as Locale) || 'he';
    const dir = translations[validLocale]?.direction || 'rtl';
    const seo = translations[validLocale]?.seo || translations.he.seo;
    const localePath = getLocalePath(validLocale);
    const languageCode = getLanguageCode(validLocale);

    // Structured data for Google (JSON-LD)
    const structuredData = [
        // WebApplication schema - competitive multiplayer word game
        {
            '@context': 'https://schema.org',
            '@type': ['WebApplication', 'VideoGame'],
            '@id': 'https://www.lexiclash.live/#webapp',
            name: 'LexiClash',
            alternateName: ['LexiClash Multiplayer Word Game', 'LexiClash Word Battle', 'לקסיקלאש'],
            applicationCategory: 'GameApplication',
            applicationSubCategory: 'Multiplayer Word Game',
            typicalAgeRange: '6-99',
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
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '500',
                bestRating: '5',
                worstRating: '1',
            },
            description: seo.description,
            url: `https://www.lexiclash.live${localePath}`,
            image: {
                '@type': 'ImageObject',
                url: 'https://www.lexiclash.live/og-image-en.jpg',
                width: 1200,
                height: 630,
            },
            screenshot: 'https://www.lexiclash.live/og-image-en.jpg',
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
            keywords: 'multiplayer word game, real-time word battle, competitive word game, party game, word puzzle',
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
                url: 'https://www.lexiclash.live/og-image-en.jpg',
                width: 1200,
                height: 630,
            },
            // Social media and platform presence for SEO authority
            sameAs: [
                'https://www.lexiclash.live',
            ],
            contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer support',
                availableLanguage: ['English', 'Hebrew', 'Swedish', 'Japanese', 'Spanish'],
            },
            foundingDate: '2024',
            slogan: 'Real-Time Multiplayer Word Battles',
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
                url: 'https://www.lexiclash.live/og-image-en.jpg',
            },
            mainContentOfPage: {
                '@type': 'WebPageElement',
                cssSelector: 'main',
            },
        },
        // FAQ schema - common questions users ask AI assistants and search engines
        {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            '@id': 'https://www.lexiclash.live/#faq',
            mainEntity: [
                {
                    '@type': 'Question',
                    name: 'What is a good multiplayer word game for parties?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'LexiClash is a fast-paced multiplayer word game perfect for parties. Players compete in real-time to find words on a shared letter grid. It works on any device with no download required - just share a room code or QR code with friends and start playing instantly. Great for 2-20+ players!',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'What is a free online game like Boggle I can play with friends?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'LexiClash is a free online word game similar to Boggle that you can play with friends in real-time. It features competitive multiplayer gameplay, live leaderboards, and supports multiple languages including English, Hebrew, Swedish, Japanese, and Spanish. No account required - just create a room and share the link!',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'What are good team building games for remote teams?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'LexiClash is an excellent team building game for remote teams. It\'s a real-time multiplayer word game that works in any browser - no downloads needed. Teams can compete against each other, and the fast-paced gameplay keeps everyone engaged. Perfect for virtual team events and icebreakers.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'What is a fun word game for family game night?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'LexiClash is perfect for family game night! It\'s a multiplayer word game where everyone races to find words on a letter grid. Suitable for ages 6 and up, it\'s free to play, works on phones and computers, and the whole family can join with a simple room code. Great for building vocabulary while having fun!',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'Is there a free alternative to Kahoot for word games?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Yes! LexiClash is a free multiplayer word game similar to Kahoot\'s competitive style. Players join rooms and compete in real-time word battles. It\'s great for classrooms, parties, and casual play. No subscription needed - completely free with support for Hebrew, English, Swedish, Japanese, and Spanish.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'What is a good browser game that doesn\'t require download?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'LexiClash is a great browser-based multiplayer word game that requires no download. Just visit lexiclash.live, create or join a room, and start playing instantly. It works on desktop, tablet, and mobile browsers. Perfect for quick gaming sessions with friends!',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'What multiplayer games can I play on my phone with friends?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'LexiClash is a multiplayer word game you can play on your phone with friends. It\'s browser-based so there\'s nothing to install. Create a room, share the code or QR code with friends, and compete in real-time word battles. Supports unlimited players and works across all devices!',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'What is a good game like Alias to play online?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'LexiClash offers a similar competitive word game experience to Alias but playable online. It\'s a fast-paced multiplayer game where you find words against the clock while competing with friends. Free to play, no download required, and available in multiple languages.',
                    },
                },
                // Additional FAQ questions for better search coverage
                {
                    '@type': 'Question',
                    name: 'How do you play LexiClash?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'In LexiClash, players compete to find words on a letter grid. Swipe or click adjacent letters to form words - the longer the word, the more points you earn. Build combos by finding words quickly for bonus multipliers. Games typically last 3 minutes. Create a room, share the code with friends, and compete in real-time!',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'Is LexiClash free to play?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Yes, LexiClash is completely free to play! No subscription, no in-app purchases required. Just visit lexiclash.live, create a room, and start playing. The game works in any browser on desktop, tablet, or mobile devices.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'What languages does LexiClash support?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'LexiClash supports 5 languages: English, Hebrew, Swedish, Japanese, and Spanish. Each language has its own dictionary for word validation. You can switch languages from the game settings. The interface is also available in all supported languages.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'How many players can play LexiClash at once?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'LexiClash supports 2 to 20+ players in a single room! Perfect for small groups or large parties. All players see the same letter grid and compete in real-time. The live leaderboard shows everyone\'s score as the game progresses.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'Can I play LexiClash offline?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'LexiClash is primarily an online multiplayer game requiring internet connection. However, the Progressive Web App (PWA) features allow the game to load even with spotty connection once cached. For offline word practice, try the single-player mode which has reduced connectivity requirements.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'How do I join a friend\'s LexiClash game?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'To join a friend\'s game: 1) Get the room code or QR code from your friend, 2) Go to lexiclash.live, 3) Click "Join Room", 4) Enter the room code or scan the QR code. You\'ll join instantly and can start competing when the host starts the game!',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'Are there achievements in LexiClash?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Yes! LexiClash has 35+ achievements across categories like speed, combos, word length, and milestones. Unlock badges for finding long words, building high combos, or reaching career milestones. Track your progress on the profile page and compete on the leaderboard!',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'What devices can play LexiClash?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'LexiClash works on any device with a modern web browser! Play on desktop computers, laptops, tablets, and smartphones. No app download needed - just visit lexiclash.live. The game is optimized for touch screens and supports both portrait and landscape orientations on mobile.',
                    },
                },
            ],
        },
    ];

    return (
        <html lang={validLocale} dir={dir} className={`${fredoka.variable} ${rubik.variable}`}>
            <head>
                <meta charSet="utf-8" />
                {/* Preconnect hints for faster resource loading on slow connections */}
                {/* Note: Google Fonts preconnects removed - now using next/font for zero CLS */}
                <link rel="preconnect" href="https://hdtmpkicuxvtmvrmtybx.supabase.co" />
                <link rel="dns-prefetch" href="https://hdtmpkicuxvtmvrmtybx.supabase.co" />
                {/* Favicon and icons with absolute URLs for better Google crawlability */}
                {/* PNG icons FIRST - Google requires multiples of 48px and prefers PNG over SVG/ICO */}
                <link rel="icon" type="image/png" sizes="48x48" href="https://www.lexiclash.live/icon-48.png" />
                <link rel="icon" type="image/png" sizes="96x96" href="https://www.lexiclash.live/icon-96.png" />
                <link rel="icon" type="image/png" sizes="144x144" href="https://www.lexiclash.live/icon-144.png" />
                <link rel="icon" type="image/png" sizes="192x192" href="https://www.lexiclash.live/icon-192.png" />
                <link rel="icon" type="image/png" sizes="512x512" href="https://www.lexiclash.live/icon-512.png" />
                {/* SVG favicon for modern browsers (after PNG for Google compatibility) */}
                <link rel="icon" href="https://www.lexiclash.live/favicon.svg" type="image/svg+xml" />
                {/* Apple touch icons for iOS devices */}
                <link rel="apple-touch-icon" sizes="180x180" href="https://www.lexiclash.live/apple-touch-icon.png" />
                <link rel="apple-touch-icon" sizes="152x152" href="https://www.lexiclash.live/icon-144.png" />
                <link rel="apple-touch-icon" sizes="144x144" href="https://www.lexiclash.live/icon-144.png" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="theme-color" content="#667eea" />
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
            <body className="antialiased flex flex-col min-h-screen" suppressHydrationWarning>
                {/* Skip to main content link for keyboard/screen reader users */}
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-3 focus:min-h-[44px] focus:min-w-[44px] focus:bg-neo-yellow focus:text-neo-black focus:font-bold focus:border-3 focus:border-neo-black focus:rounded-neo focus:shadow-hard focus:outline-none focus:flex focus:items-center focus:justify-center"
                >
                    {validLocale === 'he' ? 'דלג לתוכן הראשי' : validLocale === 'sv' ? 'Hoppa till huvudinnehåll' : validLocale === 'ja' ? 'メインコンテンツへスキップ' : validLocale === 'es' ? 'Saltar al contenido principal' : 'Skip to main content'}
                </a>
                <GoogleAnalytics />
                <SocialMediaPixels />
                <WebVitalsReporter />
                <ServiceWorkerRegistration />
                <Providers lang={validLocale}>
                    <main id="main-content" className="flex-grow" tabIndex={-1}>
                        {children}
                    </main>
                    <Footer />
                    <PWAInstallPrompt />
                    <EmailCaptureModal />
                    <NewYearCountdown />
                </Providers>
            </body>
        </html>
    );
}
