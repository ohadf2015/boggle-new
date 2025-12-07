import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'How to Play LexiClash - Game Rules & Strategy Guide',
    description: 'Learn how to play LexiClash, the real-time multiplayer word game. Complete guide covering game rules, scoring system, winning strategies, and tips for beginners.',
    openGraph: {
        title: 'How to Play LexiClash - Game Rules & Strategy Guide',
        description: 'Learn how to play LexiClash, the real-time multiplayer word game. Complete guide covering game rules, scoring system, and winning strategies.',
        type: 'article',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'How to Play LexiClash - Game Rules & Strategy Guide',
        description: 'Learn how to play LexiClash, the real-time multiplayer word game. Complete guide covering game rules, scoring system, and winning strategies.',
    },
};

interface RulesLayoutProps {
    children: ReactNode;
}

export default function RulesLayout({ children }: RulesLayoutProps): ReactNode {
    return children;
}
