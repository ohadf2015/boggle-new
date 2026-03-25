import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Check if this is a preview/staging environment (explicitly set or PR preview)
// Only block indexing when NEXT_PUBLIC_IS_PREVIEW is explicitly true or when it's a PR preview
const isPreviewEnvironment = process.env.NEXT_PUBLIC_IS_PREVIEW === 'true' ||
    process.env.RAILWAY_ENVIRONMENT_NAME?.startsWith('pr-');

export const metadata: Metadata = {
    metadataBase: new URL('https://www.lexiclash.live'),
    title: {
        default: 'LexiClash - Free Online Multiplayer Word Game | Play Boggle Online No Download',
        template: '%s | LexiClash',
    },
    description: 'Play free online multiplayer word games — no download required! LexiClash is a fast-paced word battle game like Boggle & Words With Friends. Compete with friends in real-time.',
    // Open Graph meta tags for social sharing (WhatsApp, Facebook, Discord, etc.)
    // These are essential for link previews when sharing root URLs like lexiclash.live?room=1234
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://www.lexiclash.live',
        title: 'LexiClash - Free Online Multiplayer Word Game | Play Boggle Online No Download',
        description: 'Play free online multiplayer word games — no download required! LexiClash is a fast-paced word battle game like Boggle & Words With Friends. Compete with friends in real-time.',
        siteName: 'LexiClash',
        images: [
            {
                url: 'https://www.lexiclash.live/og-image-en.jpg',
                width: 1200,
                height: 630,
                alt: 'LexiClash - Real-Time Multiplayer Word Strategy Game',
            },
        ],
    },
    // Twitter Card meta tags
    twitter: {
        card: 'summary_large_image',
        title: 'LexiClash - Free Online Multiplayer Word Game | No Download',
        description: 'Play free online multiplayer word games — no download! Like Boggle & Words With Friends but real-time. Compete with friends now.',
        images: ['https://www.lexiclash.live/og-image-en.jpg'],
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
        'google-adsense-account': 'ca-pub-1896836706464880',
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
    return children;
}
