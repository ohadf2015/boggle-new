import type { ReactNode } from 'react';

const SUPPORTED_LOCALES = new Set(['en', 'he', 'sv', 'ja', 'es']);
const SITE_ORIGIN = 'https://www.lexiclash.live';

interface VideoGameJsonLdProps {
    /** Game-mode slug (e.g. 'multiplayer', 'blast'). Omit for site-wide schema. */
    mode?: string;
    /** Locale path segment (en, he, sv, ja, es). Required when `mode` is set. */
    locale?: string;
    /** Override game name. Defaults to 'LexiClash'. */
    name?: string;
    /** Override game description. */
    description?: string;
    /** Single playMode string (mode-specific) or array (site-wide default). */
    playMode?: 'SinglePlayer' | 'MultiPlayer' | 'CoOp' | Array<'SinglePlayer' | 'MultiPlayer' | 'CoOp'>;
    /** Number of players range. */
    numberOfPlayers?: { minValue: number; maxValue: number };
}

/**
 * VideoGame JSON-LD schema for LexiClash.
 * Site-wide when called bare; per-mode when `mode` + `locale` provided.
 * All content is static constants or server-rendered string literals.
 */
export function VideoGameJsonLd(props: VideoGameJsonLdProps = {}): ReactNode {
    const { mode, locale, name, description, playMode, numberOfPlayers } = props;
    const lang = locale && SUPPORTED_LOCALES.has(locale) ? locale : 'en';
    const isModeScoped = Boolean(mode);
    const url = isModeScoped ? `${SITE_ORIGIN}/${lang}/${mode}` : SITE_ORIGIN;
    const id = isModeScoped ? `${url}#videogame` : `${SITE_ORIGIN}/#videogame`;

    const schema = {
        '@context': 'https://schema.org',
        '@type': isModeScoped ? ['VideoGame', 'SoftwareApplication'] : 'VideoGame',
        '@id': id,
        name: name ?? 'LexiClash',
        url,
        description:
            description ??
            'Free online multiplayer word game. Battle friends in real-time boggle-style word hunts across 10+ game modes.',
        genre: ['Word Game', 'Puzzle', 'Multiplayer'],
        gamePlatform: ['Web', 'Android', 'iOS'],
        applicationCategory: isModeScoped ? 'GameApplication' : 'Game',
        operatingSystem: isModeScoped ? 'Web, Android' : 'Any',
        numberOfPlayers: {
            '@type': 'QuantitativeValue',
            minValue: numberOfPlayers?.minValue ?? 1,
            maxValue: numberOfPlayers?.maxValue ?? 20,
        },
        playMode: playMode ?? ['SinglePlayer', 'MultiPlayer', 'CoOp'],
        inLanguage: isModeScoped ? lang : ['en', 'he', 'sv', 'ja', 'es'],
        isFamilyFriendly: true,
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
        },
        publisher: {
            '@type': 'Organization',
            '@id': `${SITE_ORIGIN}/#organization`,
            name: 'LexiClash',
        },
        image: `${SITE_ORIGIN}/og-image-${lang}.webp`,
        downloadUrl: 'https://play.google.com/store/apps/details?id=live.lexiclash.app',
        installUrl: 'https://play.google.com/store/apps/details?id=live.lexiclash.app',
        speakable: {
            '@type': 'SpeakableSpecification',
            cssSelector: ['h1', 'h2', '[data-speakable="true"]', 'main p:first-of-type'],
        },
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
