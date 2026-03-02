import type { ReactNode } from 'react';

const SITE_URL = 'https://www.lexiclash.live';

const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'LexiClash',
    url: SITE_URL,
    description: 'Free multiplayer word game - like Boggle meets Wordle but multiplayer',
    inLanguage: ['en', 'he', 'sv', 'ja', 'es'],
    potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/en/blog?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
    },
};

const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'LexiClash Ltd',
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo-192.png`,
    contactPoint: {
        '@type': 'ContactPoint',
        email: 'lexiclash.game@gmail.com',
        contactType: 'customer support',
    },
    sameAs: ['https://www.instagram.com/lexi.clash'],
};

export function WebSiteJsonLd(): ReactNode {
    // Safe: content is static, not user-supplied
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify([websiteSchema, organizationSchema]),
            }}
        />
    );
}

interface FAQItem {
    question: string;
    answer: string;
}

export function FAQPageJsonLd({ items }: { items: FAQItem[] }): ReactNode {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
            },
        })),
    };

    // Safe: content is static FAQ data, not user-supplied
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
