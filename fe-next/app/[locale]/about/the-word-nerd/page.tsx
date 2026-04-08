import type { Metadata } from 'next';
import Link from 'next/link';

interface PageProps {
    params: Promise<{ locale: string }>;
}

const SITE_URL = 'https://www.lexiclash.live';

const BLOG_POSTS = [
    { slug: '10-surprising-benefits-word-games', title: '10 Benefits of Word Games - Science-Backed Brain Benefits' },
    { slug: 'best-boggle-alternatives-2026', title: 'Best Boggle Alternatives 2026' },
    { slug: 'daily-challenge-strategies', title: 'Daily Word Game Strategies - Tips to Beat the Puzzle' },
    { slug: 'hebrew-word-games-guide', title: 'Hebrew Word Games Guide - Playing Right-to-Left' },
    { slug: 'improve-word-game-skills', title: 'Improve Word Game Skills - Free Boggle & Word Puzzle Tips' },
    { slug: 'multilingual-word-learning', title: 'Learn Languages Through Word Games' },
    { slug: 'multiplayer-word-games-social', title: 'Why Playing Word Games With Friends Hits Different' },
    { slug: 'science-behind-word-games', title: 'Word Games & Brain Health - Scientific Benefits Explained' },
    { slug: 'top-player-secrets', title: '7 Word Game Secrets Top Players Use' },
    { slug: 'vocabulary-building-strategies', title: 'Vocabulary Building Strategies - 500 Words in 30 Days' },
    { slug: 'why-word-games-are-addictive', title: "Why You Can't Stop Playing Word Games" },
    { slug: 'word-game-history', title: 'History of Word Games - From Ancient Tiles to Digital Grids' },
    { slug: 'word-games-and-mental-health', title: 'Word Games & Mental Health - How They Help With Anxiety' },
    { slug: 'word-games-for-brain-training', title: 'Word Games for Brain Training - What the Research Says' },
    { slug: 'word-games-for-kids-education', title: 'Word Games for Education - Why Teachers Need Them in 2026' },
];

const EXPERTISE = [
    'Cognitive Science',
    'Linguistics',
    'Game Design',
    'Brain Training',
    'Multilingual Learning',
    'Word Game Strategy',
];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const url = `${SITE_URL}/${locale}/about/the-word-nerd`;

    return {
        title: 'The Word Nerd - Senior Word Game Researcher & Game Designer',
        description:
            'Meet The Word Nerd — cognitive science enthusiast with 8+ years researching word games, linguistics, and brain health. Creator of LexiClash.',
        openGraph: {
            type: 'profile',
            title: 'The Word Nerd - Word Game Researcher & Game Designer',
            description:
                'Cognitive science enthusiast with 8+ years researching word games, linguistics, and brain health. Creator of LexiClash.',
            url,
            siteName: 'LexiClash',
            images: [{ url: `${SITE_URL}/images/author-word-nerd.jpg`, width: 400, height: 400, alt: 'The Word Nerd' }],
        },
        alternates: {
            canonical: url,
            languages: {
                'x-default': `${SITE_URL}/en/about/the-word-nerd`,
                he: `${SITE_URL}/he/about/the-word-nerd`,
                en: `${SITE_URL}/en/about/the-word-nerd`,
                sv: `${SITE_URL}/sv/about/the-word-nerd`,
                ja: `${SITE_URL}/ja/about/the-word-nerd`,
                es: `${SITE_URL}/es/about/the-word-nerd`,
                'en-IL': `${SITE_URL}/en/about/the-word-nerd`,
                'he-IL': `${SITE_URL}/he/about/the-word-nerd`,
                'en-US': `${SITE_URL}/en/about/the-word-nerd`,
                'es-US': `${SITE_URL}/es/about/the-word-nerd`,
                'en-GB': `${SITE_URL}/en/about/the-word-nerd`,
                'en-SE': `${SITE_URL}/en/about/the-word-nerd`,
                'sv-SE': `${SITE_URL}/sv/about/the-word-nerd`,
                'en-JP': `${SITE_URL}/en/about/the-word-nerd`,
                'ja-JP': `${SITE_URL}/ja/about/the-word-nerd`,
                'en-ES': `${SITE_URL}/en/about/the-word-nerd`,
                'es-ES': `${SITE_URL}/es/about/the-word-nerd`,
                'en-MX': `${SITE_URL}/en/about/the-word-nerd`,
                'es-MX': `${SITE_URL}/es/about/the-word-nerd`,
                'en-AU': `${SITE_URL}/en/about/the-word-nerd`,
                'es-AR': `${SITE_URL}/es/about/the-word-nerd`,
                'es-CO': `${SITE_URL}/es/about/the-word-nerd`,
            },
        },
        robots: { index: true, follow: true },
    };
}

export default async function TheWordNerdPage({ params }: PageProps) {
    const { locale } = await params;

    // All schema content is hardcoded constants — no user input, safe for JSON serialization
    const personSchema = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        '@id': `${SITE_URL}/about/the-word-nerd#person`,
        name: 'The Word Nerd',
        url: `${SITE_URL}/about/the-word-nerd`,
        jobTitle: 'Senior Word Game Researcher & Game Designer',
        description:
            'Cognitive science enthusiast with 8+ years researching word games, linguistics, and brain health. Creator of LexiClash.',
        image: `${SITE_URL}/images/author-word-nerd.jpg`,
        sameAs: [`${SITE_URL}/about/the-word-nerd`],
        knowsAbout: ['Word Games', 'Cognitive Science', 'Linguistics', 'Brain Training', 'Game Design', 'Multilingual Learning'],
        worksFor: {
            '@type': 'Organization',
            name: 'LexiClash Ltd',
            url: SITE_URL,
        },
    };

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/${locale}` },
            { '@type': 'ListItem', position: 2, name: 'About', item: `${SITE_URL}/${locale}/about` },
            { '@type': 'ListItem', position: 3, name: 'The Word Nerd', item: `${SITE_URL}/${locale}/about/the-word-nerd` },
        ],
    };

    // Safe: schemas built from static constants above, no user-supplied data
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify([personSchema, breadcrumbSchema]) }}
            />
            <main className="min-h-screen bg-neo-navy px-4 py-12 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl">
                    {/* Author Header */}
                    <div className="mb-10 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                        <div
                            className="flex h-28 w-28 shrink-0 items-center justify-center rounded-neo border-3 border-black bg-linear-to-br from-neo-yellow to-neo-orange shadow-hard-lg"
                            aria-hidden="true"
                        >
                            <span className="font-neo-display text-4xl font-bold text-black">WN</span>
                        </div>
                        <div className="text-center sm:text-start">
                            <h1 className="font-neo-display text-3xl font-bold text-neo-white sm:text-4xl">The Word Nerd</h1>
                            <p className="mt-1 font-neo-body text-lg text-neo-yellow">
                                Senior Word Game Researcher &amp; Game Designer
                            </p>
                        </div>
                    </div>

                    {/* Bio */}
                    <section className="mb-10 rounded-neo border-3 border-black bg-neo-navy/80 p-6 shadow-hard">
                        <h2 className="mb-4 font-neo-display text-xl font-bold text-neo-white">About</h2>
                        <div className="space-y-4 font-neo-body text-base leading-relaxed text-gray-300">
                            <p>
                                I am passionate about the intersection of word games, cognitive science, and game design. For over
                                eight years I have been researching how word games impact brain health, language acquisition, and
                                learning outcomes. That research is the foundation of everything we build at LexiClash.
                            </p>
                            <p>
                                My background is in linguistics and cognitive science. I spent years analyzing what makes word games
                                genuinely engaging and cognitively beneficial — not just fun, but measurably good for the brain. I
                                founded LexiClash to put that knowledge into practice: building word games that are accessible in
                                multiple languages and backed by real research.
                            </p>
                            <p>
                                I believe word games are more than entertainment. They sharpen memory, expand vocabulary, and
                                strengthen mental agility at every age. I write about the science, strategy, and psychology behind
                                word games so that players can get the most from their gaming experience — whether they are casual
                                puzzlers or competitive word athletes.
                            </p>
                        </div>
                    </section>

                    {/* Expertise */}
                    <section className="mb-10">
                        <h2 className="mb-4 font-neo-display text-xl font-bold text-neo-white">Areas of Expertise</h2>
                        <div className="flex flex-wrap gap-3">
                            {EXPERTISE.map((area) => (
                                <span
                                    key={area}
                                    className="rounded-neo border-3 border-black bg-neo-yellow px-3 py-1 font-neo-body text-sm font-bold text-black shadow-hard-sm"
                                >
                                    {area}
                                </span>
                            ))}
                        </div>
                    </section>

                    {/* Articles */}
                    <section className="mb-10">
                        <h2 className="mb-4 font-neo-display text-xl font-bold text-neo-white">
                            Articles by The Word Nerd
                        </h2>
                        <ul className="space-y-3">
                            {BLOG_POSTS.map((post) => (
                                <li key={post.slug}>
                                    <Link
                                        href={`/${locale}/blog/${post.slug}`}
                                        className="block rounded-neo border-3 border-black bg-neo-navy/60 px-4 py-3 font-neo-body text-neo-white shadow-hard-sm transition-shadow hover:shadow-hard"
                                    >
                                        {post.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Back link */}
                    <Link
                        href={`/${locale}/about`}
                        className="inline-block rounded-neo border-3 border-black bg-neo-yellow px-4 py-2 font-neo-body font-bold text-black shadow-hard-sm transition-shadow hover:shadow-hard"
                    >
                        &larr; Back to About
                    </Link>
                </div>
            </main>
        </>
    );
}
