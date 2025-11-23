import { translations } from '@/translations';
import { Providers } from '../providers';

export async function generateMetadata({ params }) {
    const { locale } = await params;
    const seo = translations[locale]?.seo || translations.he.seo;

    return {
        title: seo.title,
        description: seo.description,
        keywords: seo.keywords,
        authors: [{ name: 'LexiClash' }],
        openGraph: {
            type: 'website',
            locale: seo.locale,
            url: `https://www.lexiclash.live${locale === 'en' ? '/en' : ''}`,
            title: seo.ogTitle,
            description: seo.ogDescription,
            siteName: 'LexiClash',
            images: [
                {
                    url: '/lexiclash.jpg',
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
            images: ['/lexiclash.jpg'],
        },
        alternates: {
            canonical: `https://www.lexiclash.live${locale === 'en' ? '/en' : ''}`,
            languages: {
                'x-default': 'https://www.lexiclash.live',
                he: 'https://www.lexiclash.live',
                en: 'https://www.lexiclash.live/en',
            },
        },
        other: {
            'google-site-verification': '4Blim0yOh_Hl4uX9TFnRX71lagbldOOxg7PwrcEbhrc',
        },
    };
}

export async function generateStaticParams() {
    return [{ locale: 'he' }, { locale: 'en' }];
}

export default async function LocaleLayout({ children, params }) {
    const { locale } = await params;
    const dir = translations[locale]?.direction || 'rtl';

    return (
        <html lang={locale} dir={dir}>
            <head>
                <meta charSet="utf-8" />
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="apple-touch-icon" href="/lexiclash.jpg" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="theme-color" content="#667eea" />
                <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
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
