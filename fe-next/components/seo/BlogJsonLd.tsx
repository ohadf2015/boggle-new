import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { withBodyLocales } from '@/lib/seo/bodyLocales';
import {
    BLOG_AUTHOR,
    BLOG_PUBLISHER,
    INDEXABLE_ROBOTS,
    SITE_URL,
    blogFeedUrl,
    blogImageSet,
    toIsoDateTime,
} from '@/lib/blog/posts';

// Image, dates, author and publisher come from lib/blog/posts, the same list the sitemaps and
// RSS feeds read, so the article schema can't drift from them.

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

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description,
        url: articleUrl,
        mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
        datePublished: toIsoDateTime(datePublished),
        dateModified: toIsoDateTime(dateModified || datePublished),
        ...(wordCount && { wordCount }),
        ...(keywords && { keywords }),
        ...(articleSection && { articleSection }),
        inLanguage: locale,
        // 16x9, 4x3 and 1x1, each 1200px+ wide (Google Article / Discover guidance).
        image: blogImageSet(slug),
        author: {
            '@type': 'Person',
            name: BLOG_AUTHOR.name,
            url: BLOG_AUTHOR.url,
            jobTitle: 'Founder & Editor-in-Chief, LexiClash',
            description:
                'Founder of LexiClash. Word-game designer and cognitive-science enthusiast with 8+ years researching word games, linguistics, and brain health.',
            image: `${SITE_URL}/images/author-ohad.png`,
            email: 'editor@lexiclash.live',
            sameAs: [BLOG_AUTHOR.url, `${SITE_URL}/en/editorial-policy`],
            knowsAbout: [
                'Word Games',
                'Cognitive Science',
                'Linguistics',
                'Brain Training',
                'Game Design',
                'Multilingual Learning',
            ],
            worksFor: { '@type': 'Organization', '@id': BLOG_PUBLISHER['@id'], name: BLOG_PUBLISHER.name, url: SITE_URL },
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
            url: `${SITE_URL}/en/editorial-policy`,
        },
        publisher: BLOG_PUBLISHER,
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
    /**
     * Opt-in: article has a native ru translation → include ru/ru-RU in the
     * hreflang cluster. Off by default so untranslated articles never point
     * at their noindexed /ru sibling (invalid-cluster signal in GSC).
     */
    ruTranslated?: boolean;
}

export function generateBlogMetadata({
    slug,
    locale,
    title,
    description,
    datePublished,
    dateModified,
    hasTranslation = true,
    ruTranslated = false,
}: BlogMetadataOptions): Metadata {
    const [imageUrl] = blogImageSet(slug);
    const articleUrl = `https://www.lexiclash.live/${locale}/blog/${slug}`;

    return withBodyLocales({
        title,
        description,
        openGraph: {
            type: 'article',
            title,
            description,
            url: articleUrl,
            siteName: 'LexiClash',
            images: [{ url: imageUrl, alt: title }],
            publishedTime: toIsoDateTime(datePublished),
            modifiedTime: toIsoDateTime(dateModified || datePublished),
            authors: [BLOG_AUTHOR.url],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [imageUrl],
        },
        alternates: {
            canonical: articleUrl,
            types: { 'application/rss+xml': blogFeedUrl(locale) },
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
                ...(ruTranslated
                    ? {
                        ru: `https://www.lexiclash.live/ru/blog/${slug}`,
                        'ru-RU': `https://www.lexiclash.live/ru/blog/${slug}`,
                    }
                    : {}),
            },
        },
        robots: hasTranslation ? INDEXABLE_ROBOTS : { index: false, follow: true },
    }, `/blog/${slug}`, locale);
}
