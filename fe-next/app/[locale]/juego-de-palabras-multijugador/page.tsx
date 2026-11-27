import type { Metadata } from 'next';
import Link from 'next/link';
import NativePageEnhancements from '@/components/landing/NativePageEnhancements';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { VideoGameJsonLd } from '@/components/seo/VideoGameJsonLd';
import { HeroAnimated } from './components/HeroAnimated';
import { MultijugadorIntent } from './components/MultijugadorIntent';
import { DosJugadoresSection } from './components/DosJugadoresSection';
import { LatamSection } from './components/LatamSection';
import { FeatureGrid } from './components/FeatureGrid';
import { StepsSection } from './components/StepsSection';
import { ModesShowcase } from './components/ModesShowcase';
import { FaqAccordion } from './components/FaqAccordion';
import { BottomCTA } from './components/BottomCTA';
import { EducationIntentCta } from '@/components/education/EducationIntentCta';
import { ComparisonTable } from './components/ComparisonTable';
import { BoggleAppFreeLink } from '@/components/seo/BoggleAppFreeLink';
import { SerpGapSections } from './components/SerpGapSections';
import { SinDescargarSection } from './components/SinDescargarSection';
import { DIRECT_ANSWER, FAQS, ES_DICT_FLOOR } from './data';
import { CompareTable, LandingPage, Prose, Section, TileGrid } from '@/components/landing/kit';


interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'es';
  const pageUrl = `${BASE_URL}/es/juego-de-palabras-multijugador`;

  return {
    title: 'Scrabble Online en Español Gratis — Sin Registro | LexiClash',
    description: 'Juega scrabble online gratis — sin registro ni descargas. Crea sala, invita amigos y compite en tiempo real. Hasta 50 jugadores. ¡Empieza ya! →',
    keywords: 'descargar scrabble en español gratis para pc, scrabble online español multijugador, scrabble online gratis, scrabble juego online, scrabble español online, jugar scrabble en español online gratis, scrabble en español online gratis, scrabble online español, cruzaletras online, apalabrados online gratis, scrabble en linea, scrabble en línea español, jugar scrabble online en español, alternativa a scrabble online español multijugador, juego como scrabble online en español gratis, alternativa scrabble multijugador online, scrabble online en español multijugador, jugar scrabble gratis multijugador, juegos de palabras online multijugador, juego de palabras multijugador, boggle online en español, juego de palabras online gratis, batalla de palabras tiempo real, juegos de letras online',
    openGraph: {
      title: 'Scrabble Online en Español Gratis — Sin Registro | LexiClash',
      description: 'Juega scrabble online gratis — sin registro ni descargas. Crea sala, invita amigos y compite en tiempo real. Hasta 50 jugadores. ¡Empieza ya! →',
      locale: 'es_ES',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/es/juego-de-palabras-multijugador/opengraph-image?v=2`,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Scrabble Online en Español Multijugador',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Scrabble Online en Español Gratis — Sin Registro | LexiClash',
      description: 'Juega scrabble online gratis — sin registro ni descargas. Crea sala, invita amigos y compite en tiempo real. Hasta 50 jugadores. ¡Empieza ya! →',
      images: [`${BASE_URL}/es/juego-de-palabras-multijugador/opengraph-image?v=2`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/free-multiplayer-word-game`,
        en: `${BASE_URL}/en/free-multiplayer-word-game`,
        he: `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
        es: `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-IL': `${BASE_URL}/en/free-multiplayer-word-game`,
        'he-IL': `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        'en-US': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-US': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-GB': `${BASE_URL}/en/free-multiplayer-word-game`,
        'en-SE': `${BASE_URL}/en/free-multiplayer-word-game`,
        'sv-SE': `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        'en-JP': `${BASE_URL}/en/free-multiplayer-word-game`,
        'ja-JP': `${BASE_URL}/ja/japanese-word-game`,
        'en-ES': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-ES': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-MX': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-MX': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-AU': `${BASE_URL}/en/free-multiplayer-word-game`,
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
    <LandingPage locale={locale} play={{ href: `/${locale}/multiplayer`, label: 'Jugar ahora' }}>
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
        description="Scrabble español online gratis sin registrarse. Crea sala, comparte enlace, compite en tiempo real con amigos. Sin email, sin cuenta, sin descargas."
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
                description: 'Juega scrabble español online gratis sin registrarse en 3 pasos — sin descargas, sin email, en cualquier navegador.',
                totalTime: 'PT1M',
                step: [
                  { '@type': 'HowToStep', name: 'Abrir LexiClash', text: 'Entra a lexiclash.live desde cualquier navegador en móvil, tablet o computadora. No requiere descarga.' },
                  { '@type': 'HowToStep', name: 'Crear una sala', text: 'Pulsa "Crear sala" y comparte el enlace por WhatsApp, Discord o mensaje directo. Hasta 50 jugadores pueden unirse.' },
                  { '@type': 'HowToStep', name: 'Encontrar palabras en tiempo real', text: 'Todos ven la misma cuadrícula al mismo tiempo. Haz clic o arrastra para formar palabras — las más largas dan más puntos. Cada ronda dura 90 segundos por defecto.' },
                ],
              },
            ],
          }),
        }}
      />

      <HeroAnimated locale={locale} />

      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
        <div data-seo="respuesta-directa">
          <Prose paper>
            <h2>{DIRECT_ANSWER.q}</h2>
            <p>{DIRECT_ANSWER.a}</p>
          </Prose>
        </div>
        <Section title="Scrabble español online gratis sin registrarse" className="lg:pt-6">
          <Prose>
            <p>
              Locura de Letras, Minijuegos y sopa-de-letras te ponen contra la máquina dentro de un iframe.
              Aquí no: pulsas Crear sala, pegas el enlace en WhatsApp y tus amigos juegan la misma cuadrícula,
              sin registrarse. No hay campo de email ni contraseña. Si no tienes un nombre guardado, un apodo
              basta — eso no crea una cuenta.
            </p>
          </Prose>
        </Section>
      </div>

      <SinDescargarSection locale={locale} />
      <div className="grid gap-14 lg:grid-cols-2 lg:gap-12">
        <MultijugadorIntent locale={locale} />
        <DosJugadoresSection locale={locale} />
      </div>
      <LatamSection locale={locale} />

      <Section title="Descargar Scrabble en español gratis para PC: lo que hay de verdad">
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
          <Prose>
            <p>
              Si llegaste buscando &quot;descargar scrabble en español gratis para pc&quot;, la respuesta honesta
              es corta: no existe una descarga oficial gratuita de Scrabble para PC en español. Scrabble GO,
              la app oficial (Scopely), es solo móvil — el APK de Android pesa unos 195 MB y la versión de
              iPhone 288.7 MB, con anuncios y compras dentro de la app. Para jugarla en el ordenador, las
              páginas de descargas te mandan instalar un emulador como BlueStacks: dos instalaciones, una
              cuenta de Google y varios cientos de MB antes de la primera partida.
            </p>
            <p>
              LexiClash es la alternativa que se salta todo eso: se juega en el navegador del PC (y del móvil
              y la tablet), gratis, sin descargar nada, sin emulador y sin registro. Diccionario de más de{' '}
              {ES_DICT_FLOOR} palabras en español con variantes de España y Latinoamérica, salas de 2 a 50
              jugadores en tiempo real y rondas de 90 segundos. Abre lexiclash.live, pulsa Crear sala y
              comparte el enlace — eso es toda la &quot;instalación&quot;.
            </p>
          </Prose>
          <CompareTable
            columns={[<span key="c" className="sr-only">Característica</span>, 'LexiClash', 'Scrabble GO en PC']}
            rows={[
              ['Precio', '$0, sin compras dentro del juego', 'Gratis, con anuncios y compras en la app'],
              ['Descarga en PC', 'Ninguna — navegador', 'Emulador (p. ej. BlueStacks) + la app de ~195 MB'],
              ['Registro', 'No — un apodo basta', 'Cuenta de Google / Scopely'],
              ['Idioma español', `Diccionario de +${ES_DICT_FLOOR} palabras`, 'Sí, entre 35 idiomas (listado de App Store)'],
              ['Multijugador', '2-50 en la misma sala, en tiempo real', 'Por turnos, 1 contra 1'],
            ]}
            caption="Cifras leídas de los listados públicos el 27 oct 2026: App Store (id 1215933788, 288.7 MB, 4.6 de 304 k valoraciones) y el APK de Android (~195 MB) vía Softonic. LexiClash no cobra nada de eso porque no hay nada que descargar."
          />
        </div>
      </Section>

      <FeatureGrid />
      <StepsSection />
      <ModesShowcase />
      <ComparisonTable />
      <SerpGapSections locale={locale} />
      <FaqAccordion />

      <Section title="Scrabble Online Gratis en Español: La Alternativa Multijugador">
        <Prose>
            <p>
              LexiClash nació de una frustración simple: intentar jugar al Scrabble online en español con
              amigos y toparse con apps que exigen registro, interrumpen con anuncios y te hacen esperar
              turnos eternos. Aquí funciona al revés — abres el navegador, creas una sala y en 10 segundos
              todos compiten en tiempo real sobre el mismo tablero. Tiene algo de la estrategia del Scrabble, la
              velocidad del Boggle y el pique con amigos de Apalabrados, pero sin esperas.
            </p>
            <p>
              Juega con amigos, familia o rivales de todo el mundo hispanohablante. Una ronda rápida de
              90 segundos o una sesión competitiva más larga — tú pones el ritmo. Y como todo ocurre en el
              navegador, da igual quién juega desde el móvil y quién desde el ordenador.
            </p>
            <p>
              Compite en{' '}
              <Link href={`/${locale}/leaderboard`}>
              clasificaciones globales
              </Link>
              , obtén logros y desbloquea modos especiales. Las batallas de jefes añaden un giro PvE donde colaboras contra oponentes de IA. Los{' '}
              <Link href={`/${locale}/daily`}>
              desafíos diarios
              </Link>{' '}
              traen rompecabezas nuevos cada día con recompensas exclusivas.
            </p>
            <p>
              Para jugar scrabble español online gratis sin registrarse, abre LexiClash en tu navegador, pulsa Crear sala y comparte el enlace. No pide email ni cuenta. Funciona como juego de palabras gratis online en español sin instalación. Compite en{' '}
              <Link href={`/${locale}/multiplayer`}>
              modo multijugador en tiempo real
              </Link>{' '}
              contra amigos, o practica vocabulario en{' '}
              <Link href={`/${locale}/quick-play`}>
              modo individual
              </Link>
              . El{' '}
              <Link href={`/${locale}/words`}>
              diccionario de palabras
              </Link>{' '}
              incluye más de {ES_DICT_FLOOR} palabras en español, ideal para expandir vocabulario y practicar ortografía. ¿Atascado en una ronda? El{' '}
              <Link href={`/${locale}/anagram`}>
              resolvedor de anagramas
              </Link>{' '}
              encuentra al instante todas las palabras que puedes formar. ¿Buscas{' '}
              <Link href={`/${locale}/education/esl-word-games`}>
              juegos de vocabulario en inglés
              </Link>{' '}
              para el aula? Tenemos una sección dedicada para profesores y estudiantes de ESL.
            </p>
        </Prose>
      </Section>

      <Section title="Más herramientas en español">
        <TileGrid
          variant="paper"
          columns={4}
          items={[
            { href: `/${locale}/words`, title: 'Diccionario de palabras', body: 'Explora todas las palabras válidas — busca por longitud (3 a 8 letras) o letra inicial.' },
            { href: `/${locale}/anagram`, title: 'Resolvedor de anagramas', body: 'Introduce letras y descubre todas las palabras que puedes formar al instante.' },
            { href: `/${locale}/daily`, title: 'Desafío diario', body: 'Rueda de palabras y caza de palabras — un nuevo puzzle cada día con tablas de clasificación globales.' },
            { href: `/${locale}/leaderboard`, title: 'Tabla de clasificación', body: 'Sube en los rankings globales: diarios, semanales y de todos los tiempos.' },
          ]}
        />
      </Section>

      <div className="flex flex-col gap-4">
        <BoggleAppFreeLink lead="En inglés, sin tienda de apps:" className="font-neo-body text-sm leading-relaxed text-neo-white" />
        <EducationIntentCta locale={locale} variant="esl" />
      </div>

      <NativePageEnhancements locale={locale} />
      <BottomCTA locale={locale} />
    </LandingPage>
  );
}
