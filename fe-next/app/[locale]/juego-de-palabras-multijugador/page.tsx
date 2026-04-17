import type { Metadata } from 'next';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'es';
  const pageUrl = `${BASE_URL}/es/juego-de-palabras-multijugador`;

  return {
    title: 'Juego de Palabras Multijugador Online Gratis - Boggle y Scrabble en Tiempo Real | LexiClash',
    description: 'Te gustan Boggle, Scrabble o Wordle? LexiClash es un juego de palabras multijugador online en tiempo real. Crea una sala, envia un enlace a tus amigos y compite en tiempo real. 10,000+ palabras, sin registro, completamente gratis.',
    keywords: 'juego de palabras multijugador, juego de palabras online gratis, juego de palabras en tiempo real, boggle online multijugador, scrabble online gratis, juego de palabras con amigos, batalla de palabras',
    openGraph: {
      title: 'Juego de Palabras Multijugador Online - Boggle y Scrabble Gratis | LexiClash',
      description: 'Como Boggle, Scrabble y Wordle combinados. Crea una sala, invita amigos, compite en tiempo real. Gratis y sin registro.',
      locale: 'es_ES',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-es.webp`,
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
      images: [`${BASE_URL}/og-image-es.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/multiplayer-word-game-online`,
        en: `${BASE_URL}/en/multiplayer-word-game-online`,
        he: `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
        es: `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-IL': `${BASE_URL}/en/multiplayer-word-game-online`,
        'he-IL': `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        'en-US': `${BASE_URL}/en/multiplayer-word-game-online`,
        'es-US': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-GB': `${BASE_URL}/en/multiplayer-word-game-online`,
        'en-SE': `${BASE_URL}/en/multiplayer-word-game-online`,
        'sv-SE': `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        'en-JP': `${BASE_URL}/en/multiplayer-word-game-online`,
        'ja-JP': `${BASE_URL}/ja/japanese-word-game`,
        'en-ES': `${BASE_URL}/en/multiplayer-word-game-online`,
        'es-ES': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-MX': `${BASE_URL}/en/multiplayer-word-game-online`,
        'es-MX': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-AU': `${BASE_URL}/en/multiplayer-word-game-online`,
        'es-AR': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'es-CO': `${BASE_URL}/es/juego-de-palabras-multijugador`,
      },
    },
    robots: { index: false, follow: true },
  };
}

export default async function SpanishWordGamePage({ params }: PageProps) {
  const { locale } = await params;

  const faqs = [
    {
      q: '¿Cómo comienzo a jugar juegos de palabras multijugador?',
      a: 'Simplemente haz clic en "Crear sala" o "Unirse a sala" en la página multijugador. Comparte el enlace de la sala con amigos y ¡todos pueden comenzar a competir en tiempo real! Sin necesidad de registrarse.',
    },
    {
      q: '¿Qué hace a LexiClash diferente de otros juegos de palabras?',
      a: 'LexiClash combina lo mejor de Boggle, Scrabble y Wordle. Compite en tiempo real con retroalimentación de puntos inmediata, múltiples modos de juego, batallas de jefes y desafíos diarios.',
    },
    {
      q: '¿Puedo jugar con amigos en línea gratis?',
      a: '¡Sí! LexiClash es completamente gratis. Crea salas, invita amigos a través del enlace y compite sin descargas ni registro.',
    },
    {
      q: '¿Cuántas palabras en español tiene LexiClash?',
      a: 'LexiClash incluye más de 10,000 palabras en español. Nuestro diccionario se actualiza continuamente.',
    },
    {
      q: '¿Qué modos de juego hay?',
      a: 'Juega salas multijugador, desafíos diarios, cazadores de palabras, modo explosión y más. Cada modo tiene reglas y cálculo de puntos únicos.',
    },
  ];

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            })),
          }),
        }}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Juego de Palabras Multijugador Online - Batallas de Palabras en Tiempo Real
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Bienvenido a LexiClash, el juego de palabras multijugador online gratuito definitivo en español. Ya sea que ames Boggle, Scrabble o Wordle, nuestra plataforma de batalla de palabras en tiempo real combina lo mejor de cada uno. Crea una sala, envía un enlace a tus amigos y compite en emocionantes batallas de palabras al instante. Con más de 10,000 palabras en nuestro diccionario en español, sin descargas requeridas y acceso completamente gratuito, LexiClash es tu juego de palabras definitivo para diversión competitiva.
        </p>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            ¿Por qué jugar LexiClash Multijugador?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              'Batallas multijugador en tiempo real con retroalimentación de puntos instantánea',
              'Crea salas e invita amigos a través de enlace compartido',
              '10,000+ palabras en español',
              'Múltiples modos de juego (Boggle, Cazador, Explosión)',
              'Desafíos diarios con clasificaciones',
              'Batallas de jefes con giros únicos',
              'Completamente gratis, sin descargas necesarias',
              'Juega en 5 idiomas (EN, HE, SV, JA, ES)',
            ].map((feature, idx) => (
              <div
                key={idx}
                className="flex gap-3 rounded-neo border-3 border-neo-yellow bg-neo-navy/50 p-4 shadow-hard"
              >
                <span className="text-neo-yellow">✓</span>
                <p className="text-sm sm:text-base">{feature}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href={`/${locale}/multiplayer`}
            className="rounded-neo border-4 border-neo-yellow bg-neo-yellow px-6 py-3 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4"
          >
            Comenzar a Jugar Multijugador
          </Link>
          <Link
            href={`/${locale}/singleplayer`}
            className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4"
          >
            Jugar Solo
          </Link>
          <Link
            href={`/${locale}/daily`}
            className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4"
          >
            Desafío Diario
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Preguntas Frecuentes</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details
                key={idx}
                className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard"
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span>{faq.q}</span>
                  <span className="text-neo-yellow transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12 max-w-none">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Sobre LexiClash Multijugador</h2>
          <p className="mt-4 text-neo-gray-200">
            LexiClash revoluciona los juegos de palabras en línea al combinar la profundidad estratégica de Scrabble, la velocidad en tiempo real de Boggle y la satisfacción del rompecabezas de Wordle. Nuestra plataforma está diseñada para amantes de palabras, jugadores casuales y jugadores competitivos por igual.
          </p>
          <p className="mt-4 text-neo-gray-200">
            Juega juegos de palabras multijugador en línea con amigos, familia o extraños en todo el mundo. Ya sea que quieras una partida rápida de 15 minutos o una sesión competitiva más larga, LexiClash se adapta a todos los estilos de juego. La interfaz intuitiva funciona en escritorio y móvil, permitiéndote jugar juegos de palabras en cualquier lugar, en cualquier momento.
          </p>
          <p className="mt-4 text-neo-gray-200">
            Compite en clasificaciones globales, obtén logros y desbloquea modos de juego especiales. Nuestras batallas de jefes añaden un giro único de PvE donde los jugadores colaboran contra oponentes de IA. Los desafíos diarios ofrecen nuevos rompecabezas cada día con recompensas exclusivas.
          </p>
        </section>
      </div>
    </main>
  );
}
