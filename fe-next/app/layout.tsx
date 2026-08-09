import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { LazyMotionRoot } from './LazyMotionRoot';
import { getAdSenseAccountMeta } from '@/lib/ads/adSensePolicy';

// Check if this is a preview/staging environment (explicitly set or PR preview)
// Only block indexing when NEXT_PUBLIC_IS_PREVIEW is explicitly true or when it's a PR preview
const isPreviewEnvironment = process.env.NEXT_PUBLIC_IS_PREVIEW === 'true' ||
    process.env.RAILWAY_ENVIRONMENT_NAME?.startsWith('pr-');

export const metadata: Metadata = {
    metadataBase: new URL('https://www.lexiclash.live'),
    // Canonical at the bare root — resolves the duplicate-content ambiguity
    // between `/`, `/?room=…`, and `/?utm_*=…`. Locale pages set their own
    // canonical in `[locale]/layout.tsx`.
    alternates: {
        canonical: 'https://www.lexiclash.live/',
        languages: {
            'x-default': 'https://www.lexiclash.live/en',
            en: 'https://www.lexiclash.live/en',
            he: 'https://www.lexiclash.live/he',
            sv: 'https://www.lexiclash.live/sv',
            ja: 'https://www.lexiclash.live/ja',
            es: 'https://www.lexiclash.live/es',
            ru: 'https://www.lexiclash.live/ru',
        },
    },
    title: {
        default: 'Free Boggle Online — No Download | LexiClash Multiplayer Word Game',
        template: '%s | LexiClash',
    },
    description: 'LexiClash — the free multiplayer word game. Play boggle online with friends, no download needed. Real-time word battles for 2-20+ players. Daily word wheel, adventure mode, brain training. Like Words With Friends but everyone plays at once. 5 languages.',
    // Open Graph meta tags for social sharing (WhatsApp, Facebook, Discord, etc.)
    // These are essential for link previews when sharing root URLs like lexiclash.live?room=1234
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://www.lexiclash.live',
        title: 'Free Boggle Online — No Download | LexiClash Multiplayer Word Game',
        description: 'Play boggle online free — no download, no signup. Real-time multiplayer word battles with friends. Like Words With Friends but everyone plays at once. Daily challenges, 5 languages.',
        siteName: 'LexiClash',
        images: [
            {
                url: 'https://www.lexiclash.live/og-image-en.webp',
                width: 1200,
                height: 630,
                alt: 'LexiClash - Real-Time Multiplayer Word Strategy Game',
            },
        ],
    },
    // Twitter Card meta tags
    twitter: {
        card: 'summary_large_image',
        title: 'LexiClash – Free Online Word Game | Play With Friends',
        description: 'Play boggle free online with friends — no download. Real-time multiplayer word battles, daily challenges, 5 languages.',
        images: ['https://www.lexiclash.live/og-image-en.webp'],
    },
    // Block indexing for preview/staging environments
    robots: isPreviewEnvironment ? {
        index: false,
        follow: false,
        noarchive: true,
        nosnippet: true,
        noimageindex: true,
        googleBot: {
            index: false,
            follow: false,
            noarchive: true,
            nosnippet: true,
            noimageindex: true,
        },
    } : {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
        },
    },
    icons: {
        // Primary icon for Google (48px PNG - Google's preferred format)
        icon: '/icon-48.png',
        // Shortcut icon — Bing/Edge require .ico format explicitly
        shortcut: { url: '/favicon.ico', type: 'image/x-icon' },
        // Apple touch icon for iOS
        apple: '/apple-touch-icon.png',
        // Additional sizes for other contexts
        other: [
            { rel: 'icon', url: '/icon-96.png', sizes: '96x96', type: 'image/png' },
            { rel: 'icon', url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        ],
    },
    other: {
        'google-site-verification': '4Blim0yOh_Hl4uX9TFnRX71lagbldOOxg7PwrcEbhrc',
        // Yandex Webmaster site ownership. Yandex is the majority search engine in
        // Russia and verification is the gate for submitting a sitemap / reading RU
        // search data there. Issued for https://www.lexiclash.live on 2026-08-09;
        // like google-site-verification above it is a public token, not a secret,
        // so it is inlined rather than env-gated. Env var stays as an override for
        // re-issue. Yandex re-checks periodically — removing this un-verifies us.
        'yandex-verification': process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || 'a0492cff1a6bdd70',
        // AdSense site-ownership signal — privacy-neutral (no script/cookie). Always
        // present so the review crawler can verify the domain even while ad serving
        // stays consent-gated/dark. See lib/ads/adSensePolicy.ts:getAdSenseAccountMeta.
        'google-adsense-account': getAdSenseAccountMeta(),
        'rating': 'General',
        'msapplication-TileColor': '#1a1a2e',
        'msapplication-TileImage': '/icon-144.png',
        'msapplication-config': '/browserconfig.xml',
    },
    category: 'games',
};

interface RootLayoutProps {
    children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): ReactNode {
    return <LazyMotionRoot>{children}</LazyMotionRoot>;
}
