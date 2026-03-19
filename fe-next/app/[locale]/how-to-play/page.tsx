import HowToPlayPageClient from './PageClient';
import { getHowToPlayContent } from './content';
import { loadTranslation, type TranslationData } from '@/translations/loadTranslation';
import type { Metadata } from 'next';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface PageParams {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
    const { locale } = await params;
    const validLocale = (['en','he','sv','ja','es'].includes(locale) ? locale : 'en') as Locale;
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const enT = await loadTranslation('en') as Record<string, any>;
    const pageContent = getHowToPlayContent(validLocale);
    const baseSeo = t?.seo || enT.seo;

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
                'en-IL': 'https://www.lexiclash.live/en/how-to-play',
                'he-IL': 'https://www.lexiclash.live/he/how-to-play',
                'en-US': 'https://www.lexiclash.live/en/how-to-play',
                'es-US': 'https://www.lexiclash.live/es/how-to-play',
                'en-GB': 'https://www.lexiclash.live/en/how-to-play',
                'en-SE': 'https://www.lexiclash.live/en/how-to-play',
                'sv-SE': 'https://www.lexiclash.live/sv/how-to-play',
                'en-JP': 'https://www.lexiclash.live/en/how-to-play',
                'ja-JP': 'https://www.lexiclash.live/ja/how-to-play',
                'en-ES': 'https://www.lexiclash.live/en/how-to-play',
                'es-ES': 'https://www.lexiclash.live/es/how-to-play',
                'en-MX': 'https://www.lexiclash.live/en/how-to-play',
                'es-MX': 'https://www.lexiclash.live/es/how-to-play',
                'en-AU': 'https://www.lexiclash.live/en/how-to-play',
                'es-AR': 'https://www.lexiclash.live/es/how-to-play',
                'es-CO': 'https://www.lexiclash.live/es/how-to-play',
            },
        },
        robots: { index: true, follow: true },
    };
}

export default async function HowToPlayPage({ params }: PageParams) {
    const { locale } = await params;
    return <HowToPlayPageClient locale={locale} />;
}
