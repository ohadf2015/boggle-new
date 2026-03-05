import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Multiplayer Ordspel Online - Spela Boggle, Scrabble & Ordspel Gratis | LexiClash',
  description: 'Gillar du Wordfeud, Boggle eller Scrabble? LexiClash ar ett multiplayer ordspel online pa svenska! Skapa ett rum, skicka en lank till vanner och tavla i realtid. 10 000+ svenska ord, ingen registrering, helt gratis. Perfekt for spelkvall med vanner och familj.',
  keywords: 'ordspel online, multiplayer ordspel, ordspel svenska, wordfeud alternativ, boggle online svenska, scrabble online gratis, ordspel med vanner, ordspel i realtid, svensk ordlek, ordpussel online, gratis ordspel, ordspel utan nedladdning, ordspel multiplayer gratis, tavlingsspel ord, ordspel pa natet',
  openGraph: {
    title: 'Multiplayer Ordspel - Boggle & Scrabble Online pa Svenska | LexiClash',
    description: 'Gillar du Wordfeud eller Boggle? Testa LexiClash - multiplayer ordspel pa svenska! Skapa rum, bjud in vanner, tavla i realtid. Gratis och utan registrering.',
    locale: 'sv_SE',
    type: 'website',
    images: [
      {
        url: 'https://www.lexiclash.live/og-image-sv.jpg',
        width: 1200,
        height: 630,
        alt: 'LexiClash - Multiplayer Ordspel pa Svenska',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Multiplayer Ordspel Online pa Svenska - LexiClash',
    description: 'Gillar du Wordfeud eller Boggle? Testa LexiClash - multiplayer ordspel pa svenska! Skapa rum, bjud in vanner och tavla i realtid. Gratis!',
    images: ['https://www.lexiclash.live/og-image-sv.jpg'],
  },
  alternates: {
    canonical: 'https://www.lexiclash.live/sv',
  },
  robots: {
    index: true,
    follow: true,
  },
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function SwedishMultiplayerWordGamePage({ params }: PageProps): Promise<never> {
  const { locale } = await params;
  redirect(`/${locale}/multiplayer`);
}
