import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const SITE_URL = 'https://www.lexiclash.live';

// Map blog slugs to their hero images (posts without dedicated images use OG fallback)
const BLOG_IMAGE_MAP: Record<string, string> = {
    '10-surprising-benefits-word-games': '/images/blog/10-benefits.jpg',
    'best-boggle-alternatives-2026': '/images/blog/boggle-alternatives.jpg',
    'daily-challenge-strategies': '/images/blog/daily-strategies.jpg',
    'improve-word-game-skills': '/images/blog/improve-skills.jpg',
    'multilingual-word-learning': '/images/blog/multilingual-learning.jpg',
    'science-behind-word-games': '/images/blog/science-brain.jpg',
    'top-player-secrets': '/images/blog/top-player-secrets.jpg',
    'why-word-games-are-addictive': '/images/blog/why-addictive.jpg',
    'word-games-for-brain-training': '/images/blog/brain-training-words.jpg',
    'netflix-word-game-2026-rise': '/images/blog/netflix-word-games.jpg',
    'most-popular-word-games-2026': '/images/blog/most-popular-word-games-2026.jpg',
};

const FALLBACK_IMAGE = '/og-image-en.webp';

function getBlogImage(slug: string): string {
    return `${SITE_URL}${BLOG_IMAGE_MAP[slug] || FALLBACK_IMAGE}`;
}

interface CitationRef {
    title: string;
    url: string;
    author?: string;
    publisher?: string;
    datePublished?: string;
}

interface FaqQa {
    question: string;
    answer: string;
}

interface BlogPostingJsonLdProps {
    title: string;
    description: string;
    slug: string;
    locale: string;
    datePublished: string;
    dateModified?: string;
    wordCount?: number;
    citations?: CitationRef[];
    /** Optional FAQ Q/A — when present, an FAQPage schema is co-emitted alongside BlogPosting. */
    faqItems?: FaqQa[];
    /** Optional keywords (comma-separated) — helps AI categorization (e.g., "boggle vs scrabble, word game comparison"). */
    keywords?: string;
    /** Optional articleSection — content category (e.g., "Comparison", "Tutorial", "Trends"). */
    articleSection?: string;
}

export function BlogPostingJsonLd({
    title,
    description,
    slug,
    locale,
    datePublished,
    dateModified,
    wordCount,
    citations,
    faqItems,
    keywords,
    articleSection,
}: BlogPostingJsonLdProps): ReactNode {
    const articleUrl = `${SITE_URL}/${locale}/blog/${slug}`;
    const imageUrl = getBlogImage(slug);

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description,
        url: articleUrl,
        mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
        datePublished,
        dateModified: dateModified || datePublished,
        ...(wordCount && { wordCount }),
        ...(keywords && { keywords }),
        ...(articleSection && { articleSection }),
        inLanguage: locale,
        image: {
            '@type': 'ImageObject',
            url: imageUrl,
            width: 1200,
            height: 630,
        },
        author: {
            '@type': 'Person',
            name: 'Ohad Fisher',
            alternateName: 'Ohad Fisher',
            url: `${SITE_URL}/about/ohad-fisher`,
            jobTitle: 'Founder & Editor-in-Chief, LexiClash',
            description:
                'Founder of LexiClash. Word-game designer and cognitive-science enthusiast with 8+ years researching word games, linguistics, and brain health.',
            image: `${SITE_URL}/images/author-ohad.png`,
            email: 'editor@lexiclash.live',
            sameAs: [
                'https://www.lexiclash.live/about/ohad-fisher',
                'https://www.lexiclash.live/editorial-policy',
            ],
            knowsAbout: [
                'Word Games',
                'Cognitive Science',
                'Linguistics',
                'Brain Training',
                'Game Design',
                'Multilingual Learning',
            ],
            worksFor: {
                '@type': 'Organization',
                name: 'LexiClash Ltd',
                url: SITE_URL,
            },
        },
        ...(citations && citations.length > 0 && {
            citation: citations.map((c) => ({
                '@type': 'CreativeWork',
                name: c.title,
                url: c.url,
                ...(c.author && { author: { '@type': 'Person', name: c.author } }),
                ...(c.publisher && { publisher: { '@type': 'Organization', name: c.publisher } }),
                ...(c.datePublished && { datePublished: c.datePublished }),
            })),
        }),
        reviewedBy: {
            '@type': 'Organization',
            name: 'LexiClash Editorial Team',
            url: `${SITE_URL}/editorial-policy`,
        },
        publisher: {
            '@type': 'Organization',
            name: 'LexiClash Ltd',
            url: SITE_URL,
            logo: {
                '@type': 'ImageObject',
                url: `${SITE_URL}/icon-192.png`,
            },
        },
        speakable: {
            '@type': 'SpeakableSpecification',
            cssSelector: ['h1', '[data-speakable="true"]'],
        },
    };

    const faqSchema = faqItems && faqItems.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${articleUrl}#faq`,
        inLanguage: locale,
        mainEntity: faqItems.map((qa) => ({
            '@type': 'Question',
            name: qa.question,
            acceptedAnswer: { '@type': 'Answer', text: qa.answer },
        })),
    } : null;

    const payload = faqSchema ? [schema, faqSchema] : schema;

    // Safe: all content is from static blog data constants, not user input
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
        />
    );
}

/**
 * Generate consistent blog post metadata with og:image, article times, and author.
 * Use this in every blog post page.tsx generateMetadata function.
 */
interface BlogMetadataOptions {
    slug: string;
    locale: string;
    title: string;
    description: string;
    datePublished: string;
    dateModified?: string;
    /** When false, emit noindex — used for locales that fall back to English body. */
    hasTranslation?: boolean;
}

export function generateBlogMetadata({
    slug,
    locale,
    title,
    description,
    datePublished,
    dateModified,
    hasTranslation = true,
}: BlogMetadataOptions): Metadata {
    const imageUrl = getBlogImage(slug);
    const articleUrl = `https://www.lexiclash.live/${locale}/blog/${slug}`;

    return {
        title,
        description,
        openGraph: {
            type: 'article',
            title,
            description,
            url: articleUrl,
            siteName: 'LexiClash',
            images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
            publishedTime: datePublished,
            modifiedTime: dateModified || datePublished,
            authors: ['Ohad Fisher'],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [imageUrl],
        },
        alternates: {
            canonical: articleUrl,
            languages: {
                'x-default': `https://www.lexiclash.live/en/blog/${slug}`,
                he: `https://www.lexiclash.live/he/blog/${slug}`,
                en: `https://www.lexiclash.live/en/blog/${slug}`,
                sv: `https://www.lexiclash.live/sv/blog/${slug}`,
                ja: `https://www.lexiclash.live/ja/blog/${slug}`,
                es: `https://www.lexiclash.live/es/blog/${slug}`,
                'en-IL': `https://www.lexiclash.live/en/blog/${slug}`,
                'he-IL': `https://www.lexiclash.live/he/blog/${slug}`,
                'en-US': `https://www.lexiclash.live/en/blog/${slug}`,
                'es-US': `https://www.lexiclash.live/es/blog/${slug}`,
                'en-GB': `https://www.lexiclash.live/en/blog/${slug}`,
                'en-SE': `https://www.lexiclash.live/en/blog/${slug}`,
                'sv-SE': `https://www.lexiclash.live/sv/blog/${slug}`,
                'en-JP': `https://www.lexiclash.live/en/blog/${slug}`,
                'ja-JP': `https://www.lexiclash.live/ja/blog/${slug}`,
                'en-ES': `https://www.lexiclash.live/en/blog/${slug}`,
                'es-ES': `https://www.lexiclash.live/es/blog/${slug}`,
                'en-MX': `https://www.lexiclash.live/en/blog/${slug}`,
                'es-MX': `https://www.lexiclash.live/es/blog/${slug}`,
                'en-AU': `https://www.lexiclash.live/en/blog/${slug}`,
                'es-AR': `https://www.lexiclash.live/es/blog/${slug}`,
                'es-CO': `https://www.lexiclash.live/es/blog/${slug}`,
            },
        },
        robots: hasTranslation ? { index: true, follow: true } : { index: false, follow: true },
    };
}
