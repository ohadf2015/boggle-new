import './globals.css';

export const metadata = {
    metadataBase: new URL('https://www.lexiclash.live'),
    title: {
        default: 'LexiClash - Educational Word Game | Vocabulary Builder | לקסיקלאש',
        template: '%s | LexiClash',
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

export default function RootLayout({ children }) {
    return children;
}
