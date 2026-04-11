import type { ReactNode } from 'react';

/**
 * VideoGame JSON-LD schema for LexiClash.
 * Enables Rich Results in Google Search with game metadata.
 * All content is static constants — safe for dangerouslySetInnerHTML.
 */
export function VideoGameJsonLd(): ReactNode {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'VideoGame',
        '@id': 'https://www.lexiclash.live/#videogame',
        name: 'LexiClash',
        url: 'https://www.lexiclash.live',
        description: 'Free online multiplayer word game. Battle friends in real-time boggle-style word hunts across 10+ game modes.',
        genre: ['Word Game', 'Puzzle', 'Multiplayer'],
        gamePlatform: ['Web Browser'],
        applicationCategory: 'Game',
        operatingSystem: 'Any',
        numberOfPlayers: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 20,
        },
        playMode: ['SinglePlayer', 'MultiPlayer', 'CoOp'],
        inLanguage: ['en', 'he', 'sv', 'ja', 'es'],
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
        },
        publisher: {
            '@type': 'Organization',
            '@id': 'https://www.lexiclash.live/#organization',
            name: 'LexiClash',
        },
        image: 'https://www.lexiclash.live/og-image-en.webp',
    };

    return (
        <script
            type="application/ld+json"
            // Content is entirely static constants — no user input, XSS-safe
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}

export default VideoGameJsonLd;
