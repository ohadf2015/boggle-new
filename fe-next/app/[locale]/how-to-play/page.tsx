import HowToPlayPageClient from './PageClient';
import { getHowToPlayContent } from './content';
import { translations } from '@/translations';
import type { Metadata } from 'next';

type Locale = keyof typeof translations;

interface PageParams {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
    const { locale } = await params;
    const validLocale = (locale in translations ? locale : 'en') as Locale;
    const pageContent = getHowToPlayContent(validLocale);
    const baseSeo = translations[validLocale]?.seo || translations.en.seo;

    return {
        title: pageContent.pageTitle,
        description: pageContent.pageDescription,
        openGraph: {
            type: 'website',
            locale: baseSeo.locale,
            url: `https://www.lexiclash.live/${locale}/how-to-play`,
            title: pageContent.pageTitle,
            description: pageContent.pageDescription,
            siteName: 'LexiClash',
            images: [
                {
                    url: 'https://www.lexiclash.live/og-image-en.webp',
                    width: 1200,
                    height: 630,
                    alt: 'LexiClash - How to Play',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: pageContent.pageTitle,
            description: pageContent.pageDescription,
            images: ['https://www.lexiclash.live/og-image-en.webp'],
        },
        alternates: {
            canonical: `https://www.lexiclash.live/${locale}/how-to-play`,
            languages: {
                'x-default': 'https://www.lexiclash.live/en/how-to-play',
                he: 'https://www.lexiclash.live/he/how-to-play',
                en: 'https://www.lexiclash.live/en/how-to-play',
                sv: 'https://www.lexiclash.live/sv/how-to-play',
                ja: 'https://www.lexiclash.live/ja/how-to-play',
                es: 'https://www.lexiclash.live/es/how-to-play',
            },
        },
        robots: { index: true, follow: true },
    };
}

export default async function HowToPlayPage({ params }: PageParams) {
    const { locale } = await params;
    return <HowToPlayPageClient locale={locale} />;
}
