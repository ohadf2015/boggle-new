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
};

const FALLBACK_IMAGE = '/og-image-en.jpg';

function getBlogImage(slug: string): string {
    return `${SITE_URL}${BLOG_IMAGE_MAP[slug] || FALLBACK_IMAGE}`;
}

interface BlogPostingJsonLdProps {
    title: string;
    description: string;
    slug: string;
    locale: string;
    datePublished: string;
    dateModified?: string;
    wordCount?: number;
}

export function BlogPostingJsonLd({
    title,
    description,
    slug,
    locale,
    datePublished,
    dateModified,
    wordCount,
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
        inLanguage: locale,
        image: {
            '@type': 'ImageObject',
            url: imageUrl,
            width: 1200,
            height: 630,
        },
        author: {
            '@type': 'Organization',
            name: 'LexiClash Editorial Team',
            url: SITE_URL,
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
    };

    // Safe: all content is from static blog data constants, not user input
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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
}

export function generateBlogMetadata({
    slug,
    locale,
    title,
    description,
    datePublished,
    dateModified,
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
            authors: ['LexiClash Editorial Team'],
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
            },
        },
        robots: { index: true, follow: true },
    };
}
