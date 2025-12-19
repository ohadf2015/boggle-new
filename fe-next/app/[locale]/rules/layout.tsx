import type { Metadata } from 'next';
import type { ReactNode } from 'react';

interface LayoutParams {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
    const { locale } = await params;
    const localePath = locale === 'he' ? '' : `/${locale}`;

    return {
        title: 'How to Play LexiClash - Game Rules & Strategy Guide',
        description: 'Learn how to play LexiClash, the real-time multiplayer word game. Complete guide covering game rules, scoring system, winning strategies, and tips for beginners.',
        openGraph: {
            title: 'How to Play LexiClash - Game Rules & Strategy Guide',
            description: 'Learn how to play LexiClash, the real-time multiplayer word game. Complete guide covering game rules, scoring system, and winning strategies.',
            type: 'article',
            url: `https://www.lexiclash.live${localePath}/rules`,
            siteName: 'LexiClash',
        },
        twitter: {
            card: 'summary_large_image',
            title: 'How to Play LexiClash - Game Rules & Strategy Guide',
            description: 'Learn how to play LexiClash, the real-time multiplayer word game. Complete guide covering game rules, scoring system, and winning strategies.',
        },
        alternates: {
            canonical: `https://www.lexiclash.live${localePath}/rules`,
            languages: {
                'x-default': 'https://www.lexiclash.live/rules',
                he: 'https://www.lexiclash.live/he/rules',
                en: 'https://www.lexiclash.live/en/rules',
                sv: 'https://www.lexiclash.live/sv/rules',
                ja: 'https://www.lexiclash.live/ja/rules',
            },
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

interface RulesLayoutProps {
    children: ReactNode;
    params: Promise<{ locale: string }>;
}

export default async function RulesLayout({ children, params }: RulesLayoutProps): Promise<ReactNode> {
    const { locale } = await params;
    const localePath = locale === 'he' ? '' : `/${locale}`;

    // Breadcrumb structured data - shows page hierarchy for search engines
    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        '@id': `https://www.lexiclash.live${localePath}/rules#breadcrumb`,
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'LexiClash',
                item: `https://www.lexiclash.live${localePath}`,
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'How to Play',
                item: `https://www.lexiclash.live${localePath}/rules`,
            },
        ],
    };

    // HowTo schema - structured data for game instructions
    const howToSchema = {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        '@id': `https://www.lexiclash.live${localePath}/rules#howto`,
        name: 'How to Play LexiClash',
        description: 'Learn how to play LexiClash, the real-time multiplayer word game.',
        step: [
            {
                '@type': 'HowToStep',
                name: 'Create or Join a Room',
                text: 'Start by creating a new game room or joining an existing one with a room code.',
            },
            {
                '@type': 'HowToStep',
                name: 'Find Words on the Grid',
                text: 'When the game starts, find words by connecting adjacent letters on the grid.',
            },
            {
                '@type': 'HowToStep',
                name: 'Score Points',
                text: 'Earn points based on word length. Longer words score more points.',
            },
            {
                '@type': 'HowToStep',
                name: 'Win the Round',
                text: 'The player with the most points at the end of the timer wins the round.',
            },
        ],
        totalTime: 'PT5M',
        isPartOf: {
            '@id': 'https://www.lexiclash.live/#website',
        },
    };

    // WebPage schema - identifies this page as subordinate to the main site
    const webPageSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `https://www.lexiclash.live${localePath}/rules#webpage`,
        url: `https://www.lexiclash.live${localePath}/rules`,
        name: 'How to Play LexiClash - Game Rules & Strategy Guide',
        description: 'Learn how to play LexiClash with our comprehensive rules guide.',
        isPartOf: {
            '@id': 'https://www.lexiclash.live/#website',
        },
        breadcrumb: {
            '@id': `https://www.lexiclash.live${localePath}/rules#breadcrumb`,
        },
        mainEntity: {
            '@id': `https://www.lexiclash.live${localePath}/rules#howto`,
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbSchema, howToSchema, webPageSchema]) }}
            />
            {children}
        </>
    );
}
