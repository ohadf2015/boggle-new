import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Multiplayer Word Game Online Free - Real-Time Boggle & Word Battles | LexiClash',
  description: 'Play the best free multiplayer word game online! Like Boggle, Scrabble, and Wordle combined. Create a room, send a link to friends, and compete in real-time word battles. 10,000+ words, no download required, completely free. Features boss battles, daily challenges, leaderboards, and 5 languages.',
  keywords: 'multiplayer word game, word game online free, real-time word game, boggle online multiplayer, word game with friends, free word games, online word battles, word game like wordle, word game like scrabble, boggle with friends online, competitive word game, word game no download, multiplayer boggle, real-time boggle, word strategy game',
  openGraph: {
    title: 'Free Multiplayer Word Game Online - Real-Time Word Battles | LexiClash',
    description: 'Like Boggle, Scrabble & Wordle combined! Create a room, invite friends, compete in real-time. Free, no download, boss battles & daily challenges.',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://www.lexiclash.live/og-image-en.jpg',
        width: 1200,
        height: 630,
        alt: 'LexiClash - Free Multiplayer Word Game Online',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Multiplayer Word Game Online - LexiClash',
    description: 'Like Boggle, Scrabble & Wordle combined! Create a room, invite friends, compete in real-time word battles. Free & no download required.',
    images: ['https://www.lexiclash.live/og-image-en.jpg'],
  },
  alternates: {
    canonical: 'https://www.lexiclash.live/en',
  },
  robots: {
    index: true,
    follow: true,
  },
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function MultiplayerWordGameOnlinePage({ params }: PageProps): Promise<never> {
  const { locale } = await params;
  redirect(`/${locale}/multiplayer`);
}
