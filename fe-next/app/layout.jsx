import './globals.css';

export const metadata = {
    metadataBase: new URL('https://www.lexiclash.live'),
    title: {
        default: 'LexiClash - Multiplayer Word Game | לקסיקלאש',
        template: '%s | LexiClash',
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function RootLayout({ children }) {
    return children;
}
