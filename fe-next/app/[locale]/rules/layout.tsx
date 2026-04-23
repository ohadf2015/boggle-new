import type { Metadata } from 'next';
import type { ReactNode } from 'react';

interface LayoutParams {
    params: Promise<{ locale: string }>;
}

// Localized metadata for rules page
const rulesMetadata: Record<string, { title: string; description: string; ogDescription: string }> = {
    en: {
        title: 'How to Play LexiClash: Rules, Scoring & 7 Winning Tips',
        description: 'The complete 2026 LexiClash guide: game rules, scoring system, 7 proven beginner tips, and pro strategies to climb the leaderboard. Free, real-time multiplayer word game — no download.',
        ogDescription: 'Rules + scoring + 7 winning tips. The up-to-date LexiClash playbook.',
    },
    he: {
        title: 'איך לשחק לקסיקלאש | חוקים, ניקוד ו-7 טיפים לניצחון (2026)',
        description: 'המדריך המלא ללקסיקלאש ב-2026: חוקי המשחק, שיטת הניקוד, שבעה טיפים מוכחים לשחקנים מתחילים ואסטרטגיות למנצחים. משחק מילים מרובה משתתפים, חינם לגמרי.',
        ogDescription: 'חוקים + ניקוד + 7 טיפים לניצחון. המדריך המעודכן ביותר ללקסיקלאש.',
    },
    sv: {
        title: 'Hur Man Spelar LexiClash - Spelregler & Strategiguide',
        description: 'Lär dig spela LexiClash, ordspelet för flera spelare i realtid. Komplett guide med spelregler, poängsystem, vinnande strategier och tips för nybörjare.',
        ogDescription: 'Lär dig spela LexiClash, ordspelet för flera spelare i realtid. Komplett guide med spelregler och vinnande strategier.',
    },
    ja: {
        title: 'LexiClashの遊び方 - ゲームルール＆戦略ガイド',
        description: 'リアルタイムマルチプレイヤーワードゲーム、LexiClashの遊び方を学びましょう。ゲームルール、スコアリングシステム、勝利戦略、初心者向けヒントを網羅した完全ガイド。',
        ogDescription: 'リアルタイムマルチプレイヤーワードゲーム、LexiClashの遊び方を学びましょう。ゲームルールと勝利戦略の完全ガイド。',
    },
    es: {
        title: 'Como Jugar LexiClash - Reglas del Juego y Guia de Estrategia',
        description: 'Aprende a jugar LexiClash, el juego de palabras multijugador en tiempo real. Guía completa con reglas del juego, sistema de puntuación, estrategias ganadoras y consejos para principiantes.',
        ogDescription: 'Aprende a jugar LexiClash, el juego de palabras multijugador en tiempo real. Guía completa con reglas y estrategias ganadoras.',
    },
};

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
    const { locale } = await params;
    // Always use explicit locale path for SEO consistency
    const localePath = `/${locale}`;
    const meta = rulesMetadata[locale] || rulesMetadata.en;

    return {
        title: meta.title,
        description: meta.description,
        openGraph: {
            title: meta.title,
            description: meta.ogDescription,
            type: 'article',
            url: `https://www.lexiclash.live${localePath}/rules`,
            siteName: 'LexiClash',
        },
        twitter: {
            card: 'summary_large_image',
            title: meta.title,
            description: meta.ogDescription,
        },
        alternates: {
            canonical: `https://www.lexiclash.live${localePath}/rules`,
            languages: {
                'x-default': 'https://www.lexiclash.live/en/rules',
                he: 'https://www.lexiclash.live/he/rules',
                en: 'https://www.lexiclash.live/en/rules',
                sv: 'https://www.lexiclash.live/sv/rules',
                ja: 'https://www.lexiclash.live/ja/rules',
                es: 'https://www.lexiclash.live/es/rules',
                'en-IL': 'https://www.lexiclash.live/en/rules',
                'he-IL': 'https://www.lexiclash.live/he/rules',
                'en-US': 'https://www.lexiclash.live/en/rules',
                'es-US': 'https://www.lexiclash.live/es/rules',
                'en-GB': 'https://www.lexiclash.live/en/rules',
                'en-SE': 'https://www.lexiclash.live/en/rules',
                'sv-SE': 'https://www.lexiclash.live/sv/rules',
                'en-JP': 'https://www.lexiclash.live/en/rules',
                'ja-JP': 'https://www.lexiclash.live/ja/rules',
                'en-ES': 'https://www.lexiclash.live/en/rules',
                'es-ES': 'https://www.lexiclash.live/es/rules',
                'en-MX': 'https://www.lexiclash.live/en/rules',
                'es-MX': 'https://www.lexiclash.live/es/rules',
                'en-AU': 'https://www.lexiclash.live/en/rules',
                'es-AR': 'https://www.lexiclash.live/es/rules',
                'es-CO': 'https://www.lexiclash.live/es/rules',
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
    // Always use explicit locale path for SEO consistency
    const localePath = `/${locale}`;

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
