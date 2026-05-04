import type { Metadata } from 'next';
import Link from 'next/link';
import NativePageEnhancements from "@/components/landing/NativePageEnhancements";
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { VideoGameJsonLd } from '@/components/seo/VideoGameJsonLd';


interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'es';
  const pageUrl = `${BASE_URL}/es/juego-de-palabras-multijugador`;

  return {
    title: 'Scrabble Online en Español — Multijugador Gratis | LexiClash',
    description: 'Juega Scrabble online en español gratis. Crea sala, comparte el enlace y compite en tiempo real con amigos. 10 000+ palabras, sin registro, sin descargas.',
    keywords: 'scrabble online español multijugador, scrabble online en español gratis, scrabble multijugador online, scrabble con amigos online, scrabble español tiempo real, apalabrados online gratis, juego de palabras multijugador, boggle online en español, juego de palabras online gratis, batalla de palabras tiempo real',
    openGraph: {
      title: 'Scrabble Online en Español Multijugador - Gratis y Sin Registro | LexiClash',
      description: 'Juega Scrabble online en español con amigos. Crea sala, invita por enlace, compite en tiempo real. 100% gratis, sin descargas.',
      locale: 'es_ES',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-es.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Scrabble Online en Español Multijugador',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Scrabble Online en Español Multijugador Gratis - LexiClash',
      description: 'Juega Scrabble online en español con amigos. Sala con enlace, tiempo real, sin registro. ¡100% gratis!',
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
    robots: isTargetLocale
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

export default async function SpanishWordGamePage({ params }: PageProps) {
  const { locale } = await params;

  const faqs = [
    {
      q: '¿Cómo juego Scrabble online en español multijugador gratis?',
      a: 'En LexiClash haces clic en "Crear sala" en la página multijugador, compartes el enlace con tus amigos y todos compiten en tiempo real al estilo Scrabble. Sin registro, sin descargas, 100% gratis. Funciona en móvil y ordenador.',
    },
    {
      q: '¿LexiClash es como Scrabble o Apalabrados pero online?',
      a: 'Sí. LexiClash combina la profundidad estratégica de Scrabble, la velocidad de Boggle y el formato social de Apalabrados, todo en tiempo real con más de 10,000 palabras en español.',
    },
    {
      q: '¿Puedo jugar Scrabble online con amigos sin registrarme?',
      a: '¡Sí! Crea una sala, envía el enlace por WhatsApp, Discord o cualquier app, y tus amigos se unen al instante. Sin cuenta, sin email, sin descargas.',
    },
    {
      q: '¿Cuántas palabras en español tiene el diccionario?',
      a: 'Más de 10,000 palabras en español validadas, actualizadas continuamente. Reconoce variantes de España y Latinoamérica.',
    },
    {
      q: '¿Qué modos de juego multijugador hay?',
      a: 'Salas multijugador en tiempo real, desafíos diarios, cazadores de palabras, modo explosión, batallas de jefes y más. Cada modo tiene reglas y puntuación únicas.',
    },
  ];

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <BreadcrumbJsonLd
        items={[
          { name: 'Inicio', url: `${BASE_URL}/${locale}` },
          { name: 'Multijugador', url: `${BASE_URL}/${locale}/multiplayer` },
          { name: 'Scrabble Online en Español Multijugador', url: `${BASE_URL}/es/juego-de-palabras-multijugador` },
        ]}
      />
      <VideoGameJsonLd
        mode="juego-de-palabras-multijugador"
        locale="es"
        name="LexiClash - Scrabble Online en Español Multijugador"
        description="Scrabble online en español multijugador gratis. Crea sala, comparte enlace, compite en tiempo real con amigos. 10,000+ palabras, sin registro, sin descargas."
        playMode="MultiPlayer"
        numberOfPlayers={{ minValue: 2, maxValue: 8 }}
      />
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
          Scrabble Online en Español Multijugador - Gratis y en Tiempo Real
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          ¿Buscas Scrabble online en español multijugador? LexiClash es la mejor alternativa gratuita: un juego de palabras en tiempo real que combina lo mejor de Scrabble, Boggle y Apalabrados. Crea una sala, comparte el enlace con tus amigos y compite al instante en español. Más de 10,000 palabras en el diccionario, sin descargas, sin registro y 100% gratis. Juega Scrabble multijugador online desde tu móvil u ordenador, en cualquier momento.
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
            ].map((feature) => (
              <div
                key={feature}
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
                key={`faq-${idx}-${faq.q}`}
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
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Sobre Scrabble Online en Español Multijugador</h2>
          <p className="mt-4 text-neo-gray-200">
            LexiClash revoluciona el Scrabble online en español al combinar la profundidad estratégica de Scrabble, la velocidad en tiempo real de Boggle y el formato social de Apalabrados. Nuestra plataforma está diseñada para amantes de las palabras, jugadores casuales y competitivos por igual.
          </p>
          <p className="mt-4 text-neo-gray-200">
            Juega Scrabble multijugador online con amigos, familia o rivales de todo el mundo hispanohablante. Ya sea una partida rápida de 15 minutos o una sesión competitiva más larga, LexiClash se adapta a tu ritmo. La interfaz intuitiva funciona en escritorio y móvil, así que puedes jugar Scrabble en español en cualquier lugar y momento.
          </p>
          <p className="mt-4 text-neo-gray-200">
            Compite en clasificaciones globales, obtén logros y desbloquea modos de juego especiales. Nuestras batallas de jefes añaden un giro único de PvE donde los jugadores colaboran contra oponentes de IA. Los desafíos diarios ofrecen nuevos rompecabezas cada día con recompensas exclusivas.
          </p>
        </section>
        <NativePageEnhancements locale={locale} />
      </div>
    </main>
  );
}
