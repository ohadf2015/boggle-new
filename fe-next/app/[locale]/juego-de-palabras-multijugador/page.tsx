import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Juego de Palabras Multijugador Online Gratis - Boggle y Scrabble en Tiempo Real | LexiClash',
  description: 'Te gustan Boggle, Scrabble o Wordle? LexiClash es un juego de palabras multijugador online en tiempo real. Crea una sala, envia un enlace a tus amigos y compite en tiempo real. 10,000+ palabras, sin registro, completamente gratis. Perfecto para noches de juegos con amigos y familia.',
  keywords: 'juego de palabras multijugador, juego de palabras online gratis, juego de palabras en tiempo real, boggle online multijugador, scrabble online gratis, wordle en espanol, juego de palabras con amigos, juego de palabras sin descargar, juego de letras online, sopa de letras multijugador, juego de vocabulario, palabras cruzadas online, juego de palabras gratis, batalla de palabras',
  openGraph: {
    title: 'Juego de Palabras Multijugador Online - Boggle y Scrabble Gratis | LexiClash',
    description: 'Como Boggle, Scrabble y Wordle combinados. Crea una sala, invita amigos, compite en tiempo real. Gratis y sin registro.',
    locale: 'es_ES',
    type: 'website',
    images: [
      {
        url: 'https://www.lexiclash.live/og-image-es.jpg',
        width: 1200,
        height: 630,
        alt: 'LexiClash - Juego de Palabras Multijugador Online',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Juego de Palabras Multijugador Online Gratis - LexiClash',
    description: 'Como Boggle, Scrabble y Wordle combinados. Crea una sala, invita amigos y compite en tiempo real. Gratis y sin registro.',
    images: ['https://www.lexiclash.live/og-image-es.jpg'],
  },
  alternates: {
    canonical: 'https://www.lexiclash.live/es',
  },
  robots: {
    index: true,
    follow: true,
  },
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function SpanishWordGamePage({ params }: PageProps): Promise<never> {
  const { locale } = await params;
  redirect(`/${locale}/multiplayer`);
}
