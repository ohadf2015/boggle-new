import type { ReactNode } from 'react';

const SITE_URL = 'https://www.lexiclash.live';

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

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description,
        url: articleUrl,
        mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
        datePublished,
        ...(dateModified && { dateModified }),
        ...(wordCount && { wordCount }),
        inLanguage: locale,
        author: {
            '@type': 'Organization',
            name: 'LexiClash Editorial Team',
        },
        publisher: {
            '@type': 'Organization',
            name: 'LexiClash Ltd',
            logo: {
                '@type': 'ImageObject',
                url: `${SITE_URL}/images/logo-192.png`,
            },
        },
    };

    // Safe: content is from CMS/static blog data, not arbitrary user input
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
