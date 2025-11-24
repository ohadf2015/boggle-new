import { translations } from '@/translations';
import { Providers } from '../providers';

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
                    url: 'https://www.lexiclash.live/lexiclash.jpg',
                    width: 1200,
                    height: 630,
                    alt: 'LexiClash - Multiplayer Word Game',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: seo.twitterTitle,
            description: seo.twitterDescription,
            images: ['https://www.lexiclash.live/lexiclash.jpg'],
        },
        icons: {
            icon: '/favicon.ico',
            apple: '/lexiclash.jpg',
        },
        alternates: {
            canonical: `https://www.lexiclash.live${localePath}`,
            languages: {
                'x-default': 'https://www.lexiclash.live',
                he: 'https://www.lexiclash.live',
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

    // Structured data for Google
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'LexiClash',
        applicationCategory: 'Game',
        operatingSystem: 'Any',
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
        },
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            ratingCount: '150',
        },
        description: seo.description,
        url: `https://www.lexiclash.live${localePath}`,
        image: 'https://www.lexiclash.live/lexiclash.jpg',
        inLanguage: languageCode,
    };

    return (
        <html lang={locale} dir={dir}>
            <head>
                <meta charSet="utf-8" />
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="apple-touch-icon" href="/lexiclash.jpg" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="theme-color" content="#667eea" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
                />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300..700&family=Rubik:ital,wght@0,300..900;1,300..900&display=swap"
                    rel="stylesheet"
                />
                <link rel="manifest" href="/manifest.json" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="LexiClash" />
            </head>
            <body className="antialiased">
                <Providers lang={locale}>{children}</Providers>
            </body>
        </html>
    );
}
