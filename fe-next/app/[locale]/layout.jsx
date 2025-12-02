import { translations } from '@/translations';
import { Providers } from '../providers';
import Footer from '@/components/Footer';

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const runtime = 'nodejs';

// Helper function to get locale-specific URL path
function getLocalePath(locale) {
    switch (locale) {
        case 'en':
            return '/en';
        case 'sv':
            return '/sv';
        case 'ja':
            return '/ja';
        case 'he':
            return '/he';
        default:
            return '';
    }
}

// Helper function to get language code for structured data
function getLanguageCode(locale) {
    switch (locale) {
        case 'en':
            return 'en';
        case 'sv':
            return 'sv';
        case 'ja':
            return 'ja';
        case 'he':
        default:
            return 'he';
    }
}

export async function generateMetadata({ params }) {
    const { locale } = await params;
    const seo = translations[locale]?.seo || translations.he.seo;
    const localePath = getLocalePath(locale);

    // Use locale-specific OG image
    const ogImage = locale === 'he'
        ? 'https://www.lexiclash.live/og-image-he.jpg'
        : 'https://www.lexiclash.live/og-image-en.jpg';
    const ogImageAlt = locale === 'he'
        ? 'לקסי קלאש - משחק מילים מרובה משתתפים'
        : 'LexiClash - Multiplayer Word Game';

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
                { url: 'https://www.lexiclash.live/favicon.ico', sizes: '48x48 32x32 16x16', type: 'image/x-icon' },
                { url: 'https://www.lexiclash.live/icon-48.png', sizes: '48x48', type: 'image/png' },
                { url: 'https://www.lexiclash.live/icon-96.png', sizes: '96x96', type: 'image/png' },
                { url: 'https://www.lexiclash.live/icon-192.png', sizes: '192x192', type: 'image/png' },
                { url: 'https://www.lexiclash.live/icon-512.png', sizes: '512x512', type: 'image/png' },
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
                'x-default': 'https://www.lexiclash.live',
                he: 'https://www.lexiclash.live/he',
                en: 'https://www.lexiclash.live/en',
                sv: 'https://www.lexiclash.live/sv',
                ja: 'https://www.lexiclash.live/ja',
            },
        },
        other: {
            'google-site-verification': '4Blim0yOh_Hl4uX9TFnRX71lagbldOOxg7PwrcEbhrc',
        },
    };
}

// Removed generateStaticParams to prevent static generation
// The app uses dynamic rendering with WebSocket connections

export default async function LocaleLayout({ children, params }) {
    const { locale } = await params;
    const dir = translations[locale]?.direction || 'rtl';
    const seo = translations[locale]?.seo || translations.he.seo;
    const localePath = getLocalePath(locale);
    const languageCode = getLanguageCode(locale);

    // Structured data for Google (JSON-LD)
    const structuredData = [
        // WebApplication schema with educational focus
        {
            '@context': 'https://schema.org',
            '@type': ['WebApplication', 'VideoGame', 'LearningResource'],
            '@id': 'https://www.lexiclash.live/#webapp',
            name: 'LexiClash',
            alternateName: ['LexiClash Educational Word Game', 'LexiClash Vocabulary Builder', 'לקסיקלאש'],
            applicationCategory: 'GameApplication',
            applicationSubCategory: 'Educational Word Game',
            educationalUse: ['Language Learning', 'Vocabulary Building', 'Classroom Activity', 'Spelling Practice'],
            educationalLevel: ['Beginner', 'Intermediate', 'Advanced'],
            learningResourceType: ['Game', 'Interactive Resource'],
            teaches: ['Vocabulary', 'Spelling', 'Word Recognition', 'Language Skills'],
            typicalAgeRange: '6-99',
            audience: {
                '@type': 'EducationalAudience',
                educationalRole: ['student', 'teacher', 'parent'],
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
                ratingCount: '150',
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
            inLanguage: [languageCode, 'he', 'en', 'sv', 'ja'],
            availableLanguage: [
                { '@type': 'Language', name: 'English', alternateName: 'en' },
                { '@type': 'Language', name: 'Hebrew', alternateName: 'he' },
                { '@type': 'Language', name: 'Swedish', alternateName: 'sv' },
                { '@type': 'Language', name: 'Japanese', alternateName: 'ja' },
            ],
            featureList: [
                'Real-time multiplayer gameplay',
                'Educational vocabulary building',
                'Multiple language support (Hebrew, English, Swedish, Japanese)',
                'ESL and language learning support',
                'Classroom-friendly activities',
                'Live leaderboard and rankings',
                'Achievement system',
                'Room-based multiplayer',
                'QR code sharing',
                'Cross-platform compatibility',
                'No download required'
            ],
            genre: ['Educational Game', 'Word Game', 'Puzzle', 'Multiplayer', 'Party Game', 'Brain Training'],
            playMode: ['MultiPlayer', 'CoOp'],
            author: {
                '@type': 'Organization',
                name: 'LexiClash',
                url: 'https://www.lexiclash.live',
            },
            keywords: 'educational word game, vocabulary builder, language learning, ESL game, classroom game, spelling game',
        },
        // Organization schema
        {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': 'https://www.lexiclash.live/#organization',
            name: 'LexiClash',
            url: 'https://www.lexiclash.live',
            logo: {
                '@type': 'ImageObject',
                url: 'https://www.lexiclash.live/og-image-en.jpg',
            },
            sameAs: [],
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
            inLanguage: [languageCode, 'he', 'en', 'sv', 'ja'],
        },
    ];

    return (
        <html lang={locale} dir={dir}>
            <head>
                <meta charSet="utf-8" />
                {/* Preconnect hints for faster resource loading on slow connections */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://hdtmpkicuxvtmvrmtybx.supabase.co" />
                <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
                <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
                <link rel="dns-prefetch" href="https://hdtmpkicuxvtmvrmtybx.supabase.co" />
                {/* Load Google Fonts at runtime */}
                <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Rubik:wght@400;500;600;700&display=swap" rel="stylesheet" />
                {/* Favicon and icons with absolute URLs for better Google crawlability */}
                <link rel="icon" href="https://www.lexiclash.live/favicon.ico" sizes="48x48 32x32 16x16" type="image/x-icon" />
                <link rel="shortcut icon" href="https://www.lexiclash.live/favicon.ico" type="image/x-icon" />
                <link rel="icon" type="image/png" sizes="16x16" href="https://www.lexiclash.live/icon-48.png" />
                <link rel="icon" type="image/png" sizes="32x32" href="https://www.lexiclash.live/icon-48.png" />
                <link rel="icon" type="image/png" sizes="48x48" href="https://www.lexiclash.live/icon-48.png" />
                <link rel="icon" type="image/png" sizes="96x96" href="https://www.lexiclash.live/icon-96.png" />
                <link rel="icon" type="image/png" sizes="192x192" href="https://www.lexiclash.live/icon-192.png" />
                <link rel="icon" type="image/png" sizes="512x512" href="https://www.lexiclash.live/icon-512.png" />
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
                <Providers lang={locale}>
                    <main className="flex-grow">{children}</main>
                    <Footer />
                </Providers>
            </body>
        </html>
    );
}
