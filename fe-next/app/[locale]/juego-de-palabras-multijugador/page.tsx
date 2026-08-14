import type { Metadata } from 'next';
import Link from 'next/link';
import NativePageEnhancements from '@/components/landing/NativePageEnhancements';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { VideoGameJsonLd } from '@/components/seo/VideoGameJsonLd';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { HeroAnimated } from './components/HeroAnimated';
import { FeatureGrid } from './components/FeatureGrid';
import { StepsSection } from './components/StepsSection';
import { ModesShowcase } from './components/ModesShowcase';
import { FaqAccordion } from './components/FaqAccordion';
import { BottomCTA } from './components/BottomCTA';
import { ComparisonTable } from './components/ComparisonTable';
import { PageScrollFx } from './components/PageScrollFx';
import { FAQS } from './data';


interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'es';
  const pageUrl = `${BASE_URL}/es/juego-de-palabras-multijugador`;

  return {
    title: 'Scrabble Online en Español Gratis 2026 — Sin Registro | LexiClash',
    description: '¡Juega Scrabble online en español ahora! Sala lista en 10 seg, hasta 50 jugadores en tiempo real, sin registro ni descarga. 100% gratis →',
    keywords: 'jugar scrabble en español online gratis, scrabble en español online gratis, scrabble online español, cruzaletras online, apalabrados online gratis, scrabble en linea, scrabble en línea español, jugar scrabble online en español, alternativa a scrabble online español multijugador, juego como scrabble online en español gratis, alternativa scrabble multijugador online, scrabble online en español multijugador, jugar scrabble gratis multijugador, juegos de palabras online multijugador, juego de palabras multijugador, boggle online en español, juego de palabras online gratis, batalla de palabras tiempo real, juegos de letras online',
    openGraph: {
      title: 'Scrabble Online en Español Gratis 2026 — Sin Registro | LexiClash',
      description: '¡Juega Scrabble online en español ahora! Sala lista en 10 seg, hasta 50 jugadores en tiempo real, sin registro ni descarga.',
      locale: 'es_ES',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-es-multiplayer.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Alternativa a Scrabble Online en Español Multijugador',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Scrabble Online en Español Gratis — Sin Registro, Sin Descarga | LexiClash',
      description: 'Scrabble online gratis en español — sin registro, sin descarga. Crea sala en 10 segundos, invita amigos y juega en tiempo real. Hasta 50 jugadores.',
      images: [`${BASE_URL}/og-image-es-multiplayer.webp`],
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-neo-navy text-neo-white">
      <BreadcrumbJsonLd
        items={[
          { name: 'Inicio', url: `${BASE_URL}/${locale}` },
          { name: 'Multijugador', url: `${BASE_URL}/${locale}/multiplayer` },
          { name: 'Alternativa a Scrabble Online en Español Multijugador', url: `${BASE_URL}/es/juego-de-palabras-multijugador` },
        ]}
      />
      <VideoGameJsonLd
        mode="juego-de-palabras-multijugador"
        locale="es"
        name="LexiClash - Alternativa a Scrabble Online en Español Multijugador"
        description="Alternativa al estilo Scrabble online en español multijugador gratis. Crea sala, comparte enlace, compite en tiempo real con amigos. 10,000+ palabras, sin registro, sin descargas."
        playMode="MultiPlayer"
        numberOfPlayers={{ minValue: 2, maxValue: 50 }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'FAQPage',
                mainEntity: FAQS.map((faq) => ({
                  '@type': 'Question',
                  name: faq.q,
                  acceptedAnswer: { '@type': 'Answer', text: faq.a },
                })),
              },
              {
                '@type': 'HowTo',
                name: 'Cómo jugar Scrabble online en español gratis con amigos',
                description: 'Juega Scrabble online en español gratis con amigos en tiempo real en 3 pasos — sin descargas, sin registro, en cualquier navegador.',
                totalTime: 'PT1M',
                step: [
                  { '@type': 'HowToStep', name: 'Abrir LexiClash', text: 'Entra a lexiclash.live desde cualquier navegador en móvil, tablet o computadora. No requiere descarga.' },
                  { '@type': 'HowToStep', name: 'Crear una sala', text: 'Pulsa "Crear sala" y comparte el enlace por WhatsApp, Discord o mensaje directo. Hasta 50 jugadores pueden unirse.' },
                  { '@type': 'HowToStep', name: 'Encontrar palabras en tiempo real', text: 'Todos ven la misma cuadrícula al mismo tiempo. Haz clic o arrastra para formar palabras — las más largas dan más puntos. Partida de 2-3 minutos.' },
                ],
              },
            ],
          }),
        }}
      />

      <div
        aria-hidden
        data-parallax-speed="80"
        className="pointer-events-none absolute -left-32 top-32 -z-10 h-72 w-72 rotate-12 bg-neo-cyan/10 blur-3xl sm:h-[28rem] sm:w-[28rem]"
      />
      <div
        aria-hidden
        data-parallax-speed="-64"
        className="pointer-events-none absolute -right-40 top-[60%] -z-10 h-72 w-72 -rotate-12 bg-neo-lime/10 blur-3xl sm:h-[28rem] sm:w-[28rem]"
      />

      <PageScrollFx />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />
        <HeroAnimated locale={locale} />
        <FeatureGrid />
        <StepsSection />
        <ModesShowcase />
        <ComparisonTable />
        <FaqAccordion />

        <section className="mb-12 max-w-3xl">
          <h2 className="mb-3 font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-3xl">
            Scrabble Online Gratis en Español: La Alternativa Multijugador
          </h2>
          <div className="space-y-3 font-neo-body text-sm leading-relaxed text-neo-white sm:text-base">
            <p>
              LexiClash es la alternativa moderna al Scrabble online en español: combina la profundidad estratégica de Scrabble, la velocidad en tiempo real de Boggle y el formato social de Apalabrados (también conocido como Cruzaletras). Diseñada para amantes de las palabras, jugadores casuales y competitivos por igual.
            </p>
            <p>
              Juega con amigos, familia o rivales de todo el mundo hispanohablante. Una partida rápida de 15 minutos o una sesión competitiva más larga, LexiClash se adapta a tu ritmo. La interfaz funciona en escritorio y móvil, así que puedes jugar en cualquier lugar.
            </p>
            <p>
              Compite en{' '}
              <Link href={`/${locale}/leaderboard`} className="text-neo-yellow underline">
                clasificaciones globales
              </Link>
              , obtén logros y desbloquea modos especiales. Las batallas de jefes añaden un giro PvE donde colaboras contra oponentes de IA. Los{' '}
              <Link href={`/${locale}/daily`} className="text-neo-pink underline">
                desafíos diarios
              </Link>{' '}
              traen rompecabezas nuevos cada día con recompensas exclusivas.
            </p>
            <p>
              Para jugar scrabble en línea gratis sin registrarte, abre LexiClash en tu navegador, crea una sala y comparte el enlace. Funciona como juego de palabras gratis online en español sin instalación. Compite en{' '}
              <Link href={`/${locale}/multiplayer`} className="text-neo-cyan underline">
                modo multijugador en tiempo real
              </Link>{' '}
              contra amigos, o practica vocabulario en{' '}
              <Link href={`/${locale}/singleplayer`} className="text-neo-lime underline">
                modo individual
              </Link>
. El{' '}
              <Link href={`/${locale}/words`} className="text-neo-cyan underline">
                diccionario de palabras
              </Link>{' '}
              incluye más de 10.000 palabras en español, ideal para expandir vocabulario y practicar ortografía. ¿Atascado en una ronda? El{' '}
              <Link href={`/${locale}/anagram`} className="text-neo-pink underline">
                resolvedor de anagramas
              </Link>{' '}
              encuentra al instante todas las palabras que puedes formar. ¿Buscas{' '}
              <Link href={`/${locale}/education/esl-word-games`} className="text-neo-yellow underline">
                juegos de vocabulario en inglés
              </Link>{' '}
              para el aula? Tenemos una sección dedicada para profesores y estudiantes de ESL.
            </p>
          </div>
        </section>

        <section className="mb-12 max-w-3xl">
          <h2 className="mb-3 font-neo-display text-xl font-black uppercase leading-tight text-neo-white sm:text-2xl">
            Más herramientas en español
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href={`/${locale}/words`}
              className="rounded-neo border-3 border-neo-cyan/60 bg-neo-navy-light p-4 shadow-hard transition-all hover:border-neo-cyan"
            >
              <h3 className="font-neo-display font-bold text-neo-cyan">Diccionario de palabras</h3>
              <p className="mt-1 text-xs text-slate-300">Explora todas las palabras válidas — busca por longitud (3 a 8 letras) o letra inicial.</p>
            </Link>
            <Link
              href={`/${locale}/anagram`}
              className="rounded-neo border-3 border-neo-pink/60 bg-neo-navy-light p-4 shadow-hard transition-all hover:border-neo-pink"
            >
              <h3 className="font-neo-display font-bold text-neo-pink">Resolvedor de anagramas</h3>
              <p className="mt-1 text-xs text-slate-300">Introduce letras y descubre todas las palabras que puedes formar al instante.</p>
            </Link>
            <Link
              href={`/${locale}/daily`}
              className="rounded-neo border-3 border-neo-lime/60 bg-neo-navy-light p-4 shadow-hard transition-all hover:border-neo-lime"
            >
              <h3 className="font-neo-display font-bold text-neo-lime">Desafío diario</h3>
              <p className="mt-1 text-xs text-slate-300">Rueda de palabras y caza de palabras — un nuevo puzzle cada día con tablas de clasificación globales.</p>
            </Link>
            <Link
              href={`/${locale}/leaderboard`}
              className="rounded-neo border-3 border-neo-yellow/60 bg-neo-navy-light p-4 shadow-hard transition-all hover:border-neo-yellow"
            >
              <h3 className="font-neo-display font-bold text-neo-yellow">Tabla de clasificación</h3>
              <p className="mt-1 text-xs text-slate-300">Sube en los rankings globales: diarios, semanales y de todos los tiempos.</p>
            </Link>
          </div>
        </section>

        <BottomCTA locale={locale} />

        <NativePageEnhancements locale={locale} />
      </div>
    </main>
  );
}
