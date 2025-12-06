import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    metadataBase: new URL('https://www.lexiclash.live'),
    title: {
        default: 'LexiClash - Educational Word Game | Vocabulary Builder | לקסיקלאש',
        template: '%s | LexiClash',
    },
    description: 'Play LexiClash - the multiplayer word game that builds vocabulary! Challenge friends, join rooms, and improve your language skills.',
    // Open Graph meta tags for social sharing (WhatsApp, Facebook, etc.)
    // These are essential for link previews when sharing root URLs like lexiclash.live?room=1234
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://www.lexiclash.live',
        title: 'LexiClash - Multiplayer Word Game',
        description: 'Play LexiClash - the multiplayer word game that builds vocabulary! Challenge friends and improve your language skills.',
        siteName: 'LexiClash',
        images: [
            {
                url: 'https://www.lexiclash.live/og-image-en.jpg',
                width: 1200,
                height: 630,
                alt: 'LexiClash - Multiplayer Word Game',
            },
        ],
    },
    // Twitter Card meta tags
    twitter: {
        card: 'summary_large_image',
        title: 'LexiClash - Multiplayer Word Game',
        description: 'Play LexiClash - the multiplayer word game that builds vocabulary! Challenge friends and improve your language skills.',
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
    // Help Google find and display favicon
    icons: {
        icon: [
            { url: 'https://www.lexiclash.live/favicon.svg', type: 'image/svg+xml' },
            { url: 'https://www.lexiclash.live/favicon.ico', sizes: '48x48 32x32 16x16', type: 'image/x-icon' },
            { url: 'https://www.lexiclash.live/icon-192.png', sizes: '192x192', type: 'image/png' },
        ],
        shortcut: 'https://www.lexiclash.live/favicon.ico',
        apple: 'https://www.lexiclash.live/apple-touch-icon.png',
    },
};

interface RootLayoutProps {
    children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): ReactNode {
    return children;
}
