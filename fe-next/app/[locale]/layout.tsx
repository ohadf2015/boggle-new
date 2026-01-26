import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import nextDynamic from 'next/dynamic';
import { translations } from '@/translations';
import { ConditionalProviders } from '../conditional-providers';
import AutoHideFooter from '@/components/AutoHideFooter';
import GlobalBottomNav from '@/components/GlobalBottomNav';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { CrazyGamesScript } from '@/components/CrazyGamesSDK';
import WebVitalsReporter from '@/components/WebVitalsReporter';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import VersionChecker from '@/components/VersionChecker';
import NewYearCountdown from '@/components/celebration/NewYearCountdown';
import AnimationsLoader from '@/components/AnimationsLoader';
import { fredoka, rubik } from '../fonts';

// Dynamic import for EmailCaptureModal (shown conditionally, not needed immediately)
const EmailCaptureModal = nextDynamic(() => import('@/components/EmailCaptureModal'), {
  loading: () => null,
});

export const dynamicParams = false;

export function generateStaticParams() {
    return [
        { locale: 'en' },
        { locale: 'he' },
        { locale: 'sv' },
        { locale: 'ja' },
        { locale: 'es' },
    ];
}

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

export default async function LocaleLayout({ children, params }: LocaleLayoutProps): Promise<ReactNode> {
    const { locale } = await params;
    const validLocale = (locale as Locale) || 'he';
    const dir = translations[validLocale]?.direction || 'rtl';
    const seo = translations[validLocale]?.seo || translations.he.seo;
    const localePath = getLocalePath(validLocale);
    const languageCode = getLanguageCode(validLocale);

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
                url: 'https://www.lexiclash.live/og-image-en.webp',
                width: 1200,
                height: 630,
            },
            screenshot: 'https://www.lexiclash.live/og-image-en.webp',
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
            keywords: 'multiplayer word game, real-time word battle, competitive word game, party game, word puzzle, wordle multiplayer, scrabble online, boggle online, ruzzle alternative, משחק מילים מרובה משתתפים, משחק מילים בעברית, קרב מילים אונליין, משחק מילים לחברים, וורדל בעברית, סקראבל אונליין, בוגל אונליין, תפזורת אונליין',
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
                url: 'https://www.lexiclash.live/og-image-en.webp',
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
                url: 'https://www.lexiclash.live/og-image-en.webp',
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
                        text: 'LexiClash is a free online word game similar to Boggle that you can play with friends in real-time. Like Boggle and Scrabble, players find words from letters - but in LexiClash everyone competes simultaneously! It features competitive multiplayer gameplay, live leaderboards, and supports multiple languages including English, Hebrew, Swedish, Japanese, and Spanish. No account required - just create a room and share the link!',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'Is there a multiplayer version of Wordle I can play with friends?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Yes! While Wordle is single-player, LexiClash offers real-time multiplayer word game fun. Like Wordle, it challenges your vocabulary - but you compete live against friends! Create a room, share the code, and race to find more words than your opponents. It also has a Daily Challenge mode similar to Wordle where everyone plays the same puzzle.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'What is a good Scrabble alternative to play online?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'LexiClash is a great Scrabble alternative for online play! Unlike turn-based Scrabble, LexiClash is real-time - all players race simultaneously to find words on the same grid. It\'s faster, more exciting, and supports 2-20+ players. Perfect for parties or quick games with friends. Free to play, no download needed!',
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
                // Daily Buzz feature FAQ questions
                {
                    '@type': 'Question',
                    name: 'What is Daily Buzz in LexiClash?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Daily Buzz is an AI-generated word challenge in LexiClash based on trending topics and current events. Each day features a new topic - from sports to science to pop culture. Find words related to the daily buzz topic and compete on the leaderboard! You can also play past Daily Buzz challenges anytime.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'How does the AI word challenge work in LexiClash?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'LexiClash\'s Daily Buzz uses AI to generate word puzzles based on trending topics. The AI analyzes current events, popular searches, and cultural moments to create themed word challenges. Each puzzle includes topic-related vocabulary that players need to find. It\'s a unique blend of word games and current events!',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'Can I play previous Daily Buzz challenges?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Yes! Unlike Word Hunt Survival which is once-daily, you can replay past Daily Buzz challenges anytime. Browse the history to see previous topics and try puzzles you missed. Perfect for practicing or competing with friends on the same topic!',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'What is the difference between Word Hunt and Daily Buzz?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'LexiClash offers two daily challenges: Word Hunt Survival is a Wordle-style puzzle with 10 attempts to find a hidden word - same board for everyone, one attempt per day, shareable emoji results. Daily Buzz is an AI-generated themed challenge based on trending topics - find related words, replayable, with past challenges available anytime.',
                    },
                },
                // Hebrew-specific FAQ questions for Israeli SEO
                {
                    '@type': 'Question',
                    name: 'מה המשחק מילים הכי טוב בעברית לשחק עם חברים?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'לקסיקלאש הוא משחק מילים מרובה משתתפים בעברית, דומה לבוגל וסקראבל! צרו חדר, שלחו לינק לחברים והתחרו בזמן אמת. עם יותר מ-10,000 מילים בעברית, ללא צורך בהרשמה או הורדה. מושלם לערבי משפחה, מסיבות וגיבוש. פותח בישראל.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'האם יש משחק כמו וורדל בעברית שאפשר לשחק עם חברים?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'כן! לקסיקלאש הוא כמו וורדל אבל מרובה משתתפים ובעברית! במקום לשחק לבד, מתחרים בזמן אמת נגד חברים. יש גם מצב אתגר יומי כמו וורדל - אותו פאזל לכולם כל יום. בנוסף, יש מצב משחק חופשי עם חברים.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'איפה אפשר לשחק סקראבל או בוגל אונליין בעברית?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'לקסיקלאש הוא אלטרנטיבה מעולה לסקראבל ובוגל אונליין בעברית! בניגוד לסקראבל שמשחקים בתורות, בלקסיקלאש כולם מתחרים בו-זמנית על אותו לוח. מהיר יותר, מותח יותר, ותומך ב-2 עד 20+ שחקנים. חינם וללא הורדה!',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'איך משחקים משחק מילים מרובה משתתפים אונליין?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'בלקסיקלאש: 1) צרו חדר חדש 2) שלחו לינק או קוד QR לחברים 3) כולם מצטרפים ורואים את אותו לוח אותיות 4) התחרו בזמן אמת למצוא מילים - מי שימצא יותר ינצח! עובד בכל דפדפן ללא התקנה.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'האם יש משחק מילים בחינם בעברית לנייד?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'כן! לקסיקלאש הוא משחק מילים חינמי לחלוטין שעובד מצוין בנייד. אין צורך להוריד אפליקציה - פשוט היכנסו ל-lexiclash.live מהדפדפן. דומה לבוגל, סקראבל ותפזורת אבל מרובה משתתפים. תומך ב-2 עד 20+ שחקנים, עם מילון עברית מקיף.',
                    },
                },
                // Hebrew Daily Buzz FAQ questions
                {
                    '@type': 'Question',
                    name: 'מה זה דיילי באזז בלקסיקלאש?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'דיילי באזז הוא אתגר מילים יומי המבוסס על טרנדים ואירועים עכשוויים, נוצר על ידי בינה מלאכותית. כל יום יש נושא חדש - מספורט ועד מדע ותרבות פופולרית. מצאו מילים הקשורות לנושא היומי והתחרו בלידרבורד! אפשר גם לשחק אתגרים מימים קודמים.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'מה ההבדל בין Word Hunt לדיילי באזז?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'לקסיקלאש מציע שני אתגרים יומיים: Word Hunt Survival הוא פאזל בסגנון וורדל עם 10 ניסיונות למצוא מילה מוסתרת - אותו לוח לכולם, ניסיון אחד ביום, אפשר לשתף תוצאות באמוג\'י. דיילי באזז הוא אתגר נושאי המבוסס על טרנדים - מצאו מילים קשורות, אפשר לשחק שוב, ואתגרים קודמים זמינים תמיד.',
                    },
                },
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
            name: languageCode === 'he' ? 'איך לשחק ב-LexiClash' : 'How to Play LexiClash',
            description: languageCode === 'he'
                ? 'למדו כיצד לשחק במשחק המילים המרובה משתתפים LexiClash'
                : 'Learn how to play the multiplayer word game LexiClash',
            totalTime: 'PT3M',
            step: [
                {
                    '@type': 'HowToStep',
                    name: languageCode === 'he' ? 'צרו או הצטרפו לחדר' : 'Create or Join a Room',
                    text: languageCode === 'he'
                        ? 'צרו חדר משחק חדש או הצטרפו לחדר קיים באמצעות קוד חדר או סריקת QR'
                        : 'Create a new game room or join an existing one using a room code or QR scan',
                    position: 1,
                },
                {
                    '@type': 'HowToStep',
                    name: languageCode === 'he' ? 'מצאו מילים בלוח' : 'Find Words on the Grid',
                    text: languageCode === 'he'
                        ? 'החליקו או לחצו על אותיות סמוכות כדי ליצור מילים - ככל שהמילה ארוכה יותר, יותר נקודות!'
                        : 'Swipe or click adjacent letters to form words - longer words score more points!',
                    position: 2,
                },
                {
                    '@type': 'HowToStep',
                    name: languageCode === 'he' ? 'בנו קומבו' : 'Build Combos',
                    text: languageCode === 'he'
                        ? 'מצאו מילים במהירות רצופה לבניית קומבו ולהכפלת הניקוד שלכם'
                        : 'Find words in quick succession to build combos and multiply your score',
                    position: 3,
                },
                {
                    '@type': 'HowToStep',
                    name: languageCode === 'he' ? 'נצחו את היריבים!' : 'Beat Your Opponents!',
                    text: languageCode === 'he'
                        ? 'השחקן עם הכי הרבה נקודות בסוף הזמן מנצח. מילים שנמצאו על ידי כולם לא נותנות נקודות!'
                        : 'The player with the most points when time runs out wins. Words found by everyone score nothing!',
                    position: 4,
                },
            ],
        },
        // Event schema for Daily Challenge - improves discoverability for recurring events
        {
            '@context': 'https://schema.org',
            '@type': 'Event',
            '@id': 'https://www.lexiclash.live/#daily-challenge',
            name: languageCode === 'he' ? 'אתגר יומי של LexiClash' : 'LexiClash Daily Challenge',
            description: languageCode === 'he'
                ? 'פאזל מילים יומי - אותו לוח לכולם ברחבי העולם! שתפו את התוצאות שלכם כמו וורדל'
                : 'Daily word puzzle - same board for everyone worldwide! Share your results like Wordle',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
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
    ];

    return (
        <html lang={validLocale} dir={dir} className={`dark ${fredoka.variable || ''} ${rubik.variable || ''}`} suppressHydrationWarning>
            <head>
                <meta charSet="utf-8" />
                {/* Preconnect hints for faster resource loading on slow connections */}
                {/* Note: Google Fonts preconnects removed - now using next/font for zero CLS */}
                <link rel="preconnect" href="https://hdtmpkicuxvtmvrmtybx.supabase.co" />
                <link rel="dns-prefetch" href="https://hdtmpkicuxvtmvrmtybx.supabase.co" />
                {/* Preload hero mascot for faster LCP (200-300ms improvement) */}
                <link rel="preload" as="image" href="/mascot/main-nobg.gif" type="image/gif" />
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
            <body className="antialiased screen-fit" suppressHydrationWarning>
                {/* Skip to main content link for keyboard/screen reader users */}
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-3 focus:min-h-[44px] focus:min-w-[44px] focus:bg-neo-lime focus:text-neo-black focus:font-bold focus:border-3 focus:border-neo-black focus:rounded-neo focus:shadow-hard focus:outline-none focus:flex focus:items-center focus:justify-center"
                >
                    {validLocale === 'he' ? 'דלג לתוכן הראשי' : validLocale === 'sv' ? 'Hoppa till huvudinnehåll' : validLocale === 'ja' ? 'メインコンテンツへスキップ' : validLocale === 'es' ? 'Saltar al contenido principal' : 'Skip to main content'}
                </a>
                {/* Load external scripts with optimized strategies to prevent blocking */}
                <GoogleAnalytics />
                <CrazyGamesScript />
                <WebVitalsReporter />
                <ServiceWorkerRegistration />
                {/* Defer loading animations.css (60KB) after page mount */}
                <AnimationsLoader />
                <ConditionalProviders lang={validLocale}>
                    {/* VersionChecker needs to be inside providers to access LanguageContext */}
                    <VersionChecker />
                    <div className="flex-1 flex flex-col min-h-0 relative [overflow-x:clip]">
                        <main id="main-content" className="screen-fit-content relative z-10 overflow-visible pb-16 sm:pb-0" tabIndex={-1}>
                            {children}
                        </main>
                        <AutoHideFooter className="hidden sm:block relative z-10 flex-shrink-0" />
                        {/* Global bottom navigation - mobile only, hidden during gameplay */}
                        <GlobalBottomNav />
                    </div>
                    <PWAInstallPrompt />
                    <EmailCaptureModal />
                    <NewYearCountdown />
                </ConditionalProviders>
            </body>
        </html>
    );
}
