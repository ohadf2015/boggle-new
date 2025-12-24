import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    metadataBase: new URL('https://www.lexiclash.live'),
    title: {
        default: 'LexiClash - Real-Time Multiplayer Word Strategy Game',
        template: '%s | LexiClash',
    },
    description: 'Compete in real-time word battles against friends. LexiClash is a fast-paced multiplayer strategy game. Play for free now.',
    // Open Graph meta tags for social sharing (WhatsApp, Facebook, Discord, etc.)
    // These are essential for link previews when sharing root URLs like lexiclash.live?room=1234
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://www.lexiclash.live',
        title: 'LexiClash - Real-Time Multiplayer Word Strategy Game',
        description: 'Compete in real-time word battles against friends. LexiClash is a fast-paced multiplayer strategy game. Play for free now.',
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
        title: 'LexiClash - Real-Time Multiplayer Word Strategy Game',
        description: 'Compete in real-time word battles against friends. LexiClash is a fast-paced multiplayer strategy game. Play for free now.',
        images: ['https://www.lexiclash.live/og-image-en.jpg'],
    },
    robots: {
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
    // Help Google find and display favicon - PNG icons first (Google preferred)
    icons: {
        icon: [
            // PNG icons first - Google requires multiples of 48px
            { url: 'https://www.lexiclash.live/icon-48.png', sizes: '48x48', type: 'image/png' },
            { url: 'https://www.lexiclash.live/icon-96.png', sizes: '96x96', type: 'image/png' },
            { url: 'https://www.lexiclash.live/icon-144.png', sizes: '144x144', type: 'image/png' },
            { url: 'https://www.lexiclash.live/icon-192.png', sizes: '192x192', type: 'image/png' },
            // SVG for modern browsers (after PNG for Google compatibility)
            { url: 'https://www.lexiclash.live/favicon.svg', type: 'image/svg+xml' },
        ],
        shortcut: 'https://www.lexiclash.live/icon-48.png',
        apple: 'https://www.lexiclash.live/apple-touch-icon.png',
    },
};

interface RootLayoutProps {
    children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): ReactNode {
    return children;
}
