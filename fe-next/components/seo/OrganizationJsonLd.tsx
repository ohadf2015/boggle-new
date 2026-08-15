import type { ReactNode } from 'react';

/**
 * Organization JSON-LD schema for LexiClash.
 * All content is static constants — safe for dangerouslySetInnerHTML.
 */
export function OrganizationJsonLd(): ReactNode {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': 'https://www.lexiclash.live/#organization',
        name: 'LexiClash',
        url: 'https://www.lexiclash.live',
        logo: {
            '@type': 'ImageObject',
            url: 'https://www.lexiclash.live/icon-512.png',
            width: 512,
            height: 512,
        },
        sameAs: [
            'https://www.instagram.com/lexi.clash',
            'https://play.google.com/store/apps/details?id=live.lexiclash.app',
        ],
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            url: 'https://www.lexiclash.live/en/contact',
            availableLanguage: ['English', 'Hebrew', 'Swedish', 'Japanese', 'Spanish'],
        },
        foundingDate: '2024',
        slogan: 'Real-Time Multiplayer Word Battles',
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}

export default OrganizationJsonLd;
