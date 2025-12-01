import { Fredoka, Rubik } from 'next/font/google';
import { translations } from '@/translations';
import { Providers } from '../providers';
import Footer from '@/components/Footer';

// Optimize fonts with next/font
const fredoka = Fredoka({
  subsets: ['latin', 'hebrew'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-fredoka',
});

const rubik = Rubik({
  subsets: ['latin', 'hebrew'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-rubik',
});

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
                { url: '/favicon.ico', sizes: '48x48 32x32 16x16' },
                { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            ],
            apple: [
                { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
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
        // WebApplication schema
        {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            '@id': 'https://www.lexiclash.live/#webapp',
            name: 'LexiClash',
            alternateName: 'LexiClash Multiplayer Word Game',
            applicationCategory: 'GameApplication',
            applicationSubCategory: 'Word Game',
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
            image: 'https://www.lexiclash.live/og-image-en.jpg',
            screenshot: 'https://www.lexiclash.live/og-image-en.jpg',
            inLanguage: [languageCode, 'he', 'en', 'sv', 'ja'],
            featureList: [
                'Real-time multiplayer gameplay',
                'Multiple language support (Hebrew, English, Swedish, Japanese)',
                'Live leaderboard and rankings',
                'Achievement system',
                'Room-based multiplayer',
                'QR code sharing',
                'Cross-platform compatibility'
            ],
            genre: ['Word Game', 'Puzzle', 'Multiplayer', 'Party Game'],
            playMode: ['MultiPlayer', 'CoOp'],
            author: {
                '@type': 'Organization',
                name: 'LexiClash',
                url: 'https://www.lexiclash.live',
            },
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
        <html lang={locale} dir={dir} className={`${fredoka.variable} ${rubik.variable}`}>
            <head>
                <meta charSet="utf-8" />
                {/* Preconnect hints for faster resource loading on slow connections */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://hdtmpkicuxvtmvrmtybx.supabase.co" />
                <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
                <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
                <link rel="dns-prefetch" href="https://hdtmpkicuxvtmvrmtybx.supabase.co" />
                <link rel="icon" href="/favicon.ico" sizes="48x48 32x32 16x16" />
                <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
                <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
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
