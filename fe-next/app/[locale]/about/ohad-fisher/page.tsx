import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const revalidate = 86400;

interface PageProps {
    params: Promise<{ locale: string }>;
}

const SITE_URL = 'https://www.lexiclash.live';

const BLOG_POSTS = [
    { slug: '10-surprising-benefits-word-games', title: '10 Benefits of Word Games - Science-Backed Brain Benefits' },
    { slug: 'best-boggle-alternatives-2026', title: 'Best Boggle Alternatives 2026' },
    { slug: 'boggle-vs-scrabble', title: 'Boggle vs Scrabble: Honest Verdict After Years of Both (2026)' },
    { slug: 'boggle-vs-wordle', title: "Boggle vs Wordle in 2026: I Played Both Daily — Here's My Verdict" },
    { slug: 'boggle-vs-words-with-friends', title: 'Boggle vs Words With Friends 2026 - Real-Time vs Async Word Game Comparison' },
    { slug: 'daily-challenge-strategies', title: 'Daily Word Game Strategies - Tips to Beat the Puzzle' },
    { slug: 'free-word-games-online', title: 'Free Word Games Online: The Honest Guide (No Pay-to-Win, 2026)' },
    { slug: 'hebrew-word-games-guide', title: 'Hebrew Word Games Guide - Playing Right-to-Left' },
    { slug: 'improve-word-game-skills', title: 'Improve Word Game Skills - Free Boggle & Word Puzzle Tips' },
    { slug: 'most-popular-word-games-2026', title: 'The Most Popular Online Word Games of 2026 — and Why They Exploded' },
    { slug: 'multilingual-word-learning', title: 'Learn Languages Through Word Games' },
    { slug: 'multiplayer-word-games-social', title: 'Why Playing Word Games With Friends Hits Different' },
    { slug: 'netflix-word-game-2026-rise', title: 'Netflix Just Dropped a Word Game — 2026 Is the Year Word Games Took Over' },
    { slug: 'science-behind-word-games', title: 'Word Games & Brain Health - Scientific Benefits Explained' },
    { slug: 'top-player-secrets', title: '7 Word Game Secrets Top Players Use' },
    { slug: 'vocabulary-building-strategies', title: 'Vocabulary Building Strategies - 500 Words in 30 Days' },
    { slug: 'why-word-games-are-addictive', title: "Why You Can't Stop Playing Word Games" },
    { slug: 'word-game-history', title: 'History of Word Games - From Ancient Tiles to Digital Grids' },
    { slug: 'word-games-and-mental-health', title: 'Word Games & Mental Health - How They Help With Anxiety' },
    { slug: 'word-games-for-brain-training', title: 'Word Games for Brain Training - What the Research Says' },
    { slug: 'word-games-for-kids-education', title: 'Word Games for Education - Why Teachers Need Them in 2026' },
    { slug: 'milat-hayom-habit', title: 'מילת היום: איך משחק קטן של שלוש דקות הופך להרגל של שנה שלמה' },
    { slug: 'mishachke-milim-chinuch', title: 'משחקי מילים בכיתה: מה קורה כשמורה לעברית מחליפה דף עבודה במשחק' },
    { slug: 'juegos-palabras-gratis', title: 'Juegos de Palabras Gratis 2026: Cómo Detectar las Trampas en 30 Segundos' },
    { slug: 'alternativas-a-scrabble', title: 'Alternativas a Scrabble: 4 Juegos de Palabras que Realmente Valen la Pena' },
    { slug: 'ordspel-familjer', title: 'Ordspel för Familjer: Hur Vi Hittade Något Att Göra Tillsammans Som Faktiskt Funkar' },
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
    const url = `${SITE_URL}/${locale}/about/ohad-fisher`;
    const isEnglish = locale === 'en';

    return {
        title: 'Ohad Fisher - Founder & Editor-in-Chief, LexiClash',
        description:
            'Meet Ohad Fisher — founder of LexiClash, word-game designer, and cognitive-science enthusiast with 8+ years researching word games, linguistics, and brain health.',
        openGraph: {
            type: 'profile',
            title: 'Ohad Fisher - Founder & Editor-in-Chief, LexiClash',
            description:
                'Founder of LexiClash, word-game designer, and cognitive-science enthusiast with 8+ years researching word games, linguistics, and brain health.',
            url,
            siteName: 'LexiClash',
            images: [{ url: `${SITE_URL}/images/author-ohad.png`, width: 400, height: 400, alt: 'Ohad Fisher' }],
        },
        alternates: {
            canonical: `${SITE_URL}/en/about/ohad-fisher`,
            languages: {
                'x-default': `${SITE_URL}/en/about/ohad-fisher`,
                he: `${SITE_URL}/he/about/ohad-fisher`,
                en: `${SITE_URL}/en/about/ohad-fisher`,
                sv: `${SITE_URL}/sv/about/ohad-fisher`,
                ja: `${SITE_URL}/ja/about/ohad-fisher`,
                es: `${SITE_URL}/es/about/ohad-fisher`,
                ru: `${SITE_URL}/ru/about/ohad-fisher`,
            },
        },
        robots: isEnglish ? { index: true, follow: true } : { index: false, follow: true },
    };
}

export default async function OhadFisherPage({ params }: PageProps) {
    const { locale } = await params;

    const personSchema = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        '@id': `${SITE_URL}/about/ohad-fisher#person`,
        name: 'Ohad Fisher',
        url: `${SITE_URL}/about/ohad-fisher`,
        jobTitle: 'Founder & Editor-in-Chief, LexiClash',
        description:
            'Founder of LexiClash. Word-game designer and cognitive-science enthusiast with 8+ years researching word games, linguistics, and brain health.',
        image: `${SITE_URL}/images/author-ohad.png`,
        email: 'editor@lexiclash.live',
        sameAs: [
            `${SITE_URL}/about/ohad-fisher`,
            `${SITE_URL}/editorial-policy`,
        ],
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
            { '@type': 'ListItem', position: 3, name: 'Ohad Fisher', item: `${SITE_URL}/${locale}/about/ohad-fisher` },
        ],
    };

    // Safe: schemas built from static hardcoded constants above; no user input is serialized.
    const jsonLd = JSON.stringify([personSchema, breadcrumbSchema]);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLd }}
            />
            <main className="min-h-screen bg-neo-navy px-4 py-12 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl">
                    <div className="mb-10 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                        <Image
                            src="/images/author-ohad.png"
                            alt="Ohad Fisher — Founder and Editor-in-Chief of LexiClash"
                            width={112}
                            height={112}
                            className="h-28 w-28 shrink-0 rounded-neo border-3 border-black object-cover shadow-hard-lg"
                            priority
                        />
                        <div className="text-center sm:text-start">
                            <h1 className="font-neo-display text-3xl font-bold text-neo-white sm:text-4xl">Ohad Fisher</h1>
                            <p className="mt-2 font-neo-body text-lg text-neo-lime">
                                Founder &amp; Editor-in-Chief, LexiClash
                            </p>
                            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                                <a href="mailto:editor@lexiclash.live" className="rounded-neo border-3 border-black bg-neo-cyan px-3 py-1 font-neo-body text-xs font-bold text-black shadow-hard-sm hover:shadow-hard">
                                    editor@lexiclash.live
                                </a>
                                <Link href={`/${locale}/editorial-policy`} className="rounded-neo border-3 border-black bg-neo-pink px-3 py-1 font-neo-body text-xs font-bold text-black shadow-hard-sm hover:shadow-hard">
                                    Editorial Policy
                                </Link>
                            </div>
                        </div>
                    </div>

                    <section className="mb-10 rounded-neo border-3 border-black bg-neo-navy/80 p-6 shadow-hard">
                        <h2 className="mb-4 font-neo-display text-xl font-bold text-neo-white">About Ohad</h2>
                        <div className="space-y-4 font-neo-body text-base leading-relaxed text-gray-300">
                            <p>
                                I&apos;m Ohad Fisher, the founder and editor-in-chief of LexiClash. I&apos;ve spent the last eight
                                years building, playing, and studying word games — first as an obsessive competitive Boggle player,
                                then as a developer who wanted a faster, smarter, friendlier version of the games I loved. That
                                obsession turned into LexiClash: a multiplayer word game built around what we actually know about
                                how the brain learns language.
                            </p>
                            <p>
                                My background is in software engineering and cognitive-science reading. I&apos;m not a neuroscientist,
                                and I don&apos;t pretend to be one — when I write about memory, vocabulary, or brain health, every
                                factual claim is sourced from peer-reviewed research and linked in the article so you can check it
                                yourself. Our full approach is documented in the{' '}
                                <Link href={`/${locale}/editorial-policy`} className="text-neo-lime underline">
                                    LexiClash Editorial Policy
                                </Link>
                                .
                            </p>
                            <p>
                                I write about the science, strategy, and psychology behind word games so players can get more out of
                                their time with them — whether that&apos;s a casual daily puzzle or a serious run at a tournament
                                leaderboard. I answer every email personally at{' '}
                                <a href="mailto:editor@lexiclash.live" className="text-neo-lime underline">
                                    editor@lexiclash.live
                                </a>
                                .
                            </p>
                        </div>
                    </section>

                    <section className="mb-10 rounded-neo border-3 border-black bg-neo-navy/80 p-6 shadow-hard">
                        <h2 className="mb-4 font-neo-display text-xl font-bold text-neo-white">How I Research &amp; Fact-Check</h2>
                        <ul className="list-disc space-y-2 pl-5 font-neo-body text-base leading-relaxed text-gray-300">
                            <li>
                                <strong>I play every game I write about.</strong> Every review or comparison is based on at least
                                ten hours of real play — no press kits, no second-hand opinions.
                            </li>
                            <li>
                                <strong>I cite primary sources.</strong> Cognitive-science claims link directly to peer-reviewed
                                journals, university publications, or institutional research (NIH, WHO, Oxford, Cambridge).
                            </li>
                            <li>
                                <strong>I correct errors publicly.</strong> If something is wrong, I fix it and add a dated note at
                                the bottom of the article. Email me at{' '}
                                <a href="mailto:editor@lexiclash.live" className="text-neo-lime underline">
                                    editor@lexiclash.live
                                </a>{' '}
                                with the URL and I&apos;ll respond within five business days.
                            </li>
                            <li>
                                <strong>I disclose AI use.</strong> I use AI tools as a research assistant, never as a ghostwriter.
                                Every word you read on LexiClash was written, rewritten, or signed off on by me. Full disclosure in
                                the{' '}
                                <Link href={`/${locale}/editorial-policy`} className="text-neo-lime underline">
                                    Editorial Policy
                                </Link>
                                .
                            </li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="mb-4 font-neo-display text-xl font-bold text-neo-white">Areas of Expertise</h2>
                        <div className="flex flex-wrap gap-3">
                            {EXPERTISE.map((area) => (
                                <span
                                    key={area}
                                    className="rounded-neo border-3 border-black bg-neo-lime px-3 py-1 font-neo-body text-sm font-bold text-black shadow-hard-sm"
                                >
                                    {area}
                                </span>
                            ))}
                        </div>
                    </section>

                    <section className="mb-10">
                        <h2 className="mb-4 font-neo-display text-xl font-bold text-neo-white">
                            Articles by Ohad Fisher
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
