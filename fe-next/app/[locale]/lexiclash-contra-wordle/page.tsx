import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckList, CompareTable, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'es';
  const pageUrl = `${BASE_URL}/${locale}/lexiclash-contra-wordle`;

  return {
    title: 'LexiClash vs Wordle — La Mejor Alternativa a Wordle en Español | LexiClash',
    description: 'Alternativa a Wordle en español — partidas ilimitadas, multijugador en tiempo real, desafíos diarios. Gratis, sin descargas. ¿Wordle se queda corto? ¡Pruébalo ya! →',
    keywords: 'lexiclash vs wordle, alternativa a wordle, juego de palabras online, wordle en español alternativa, juego de palabras gratis, wordle alternativa multijugador, juego tipo wordle, juegos de palabras en español',
    openGraph: {
      title: 'LexiClash vs Wordle — Alternativa Gratis y Sin Límites',
      description: 'Wordle te da un intento al día. LexiClash te da partidas ilimitadas, multijugador y más. Juega gratis en tu navegador.',
      locale: 'es_MX',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-es.webp?v=2`,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Alternativa a Wordle en Español',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Wordle — La Alternativa que Estabas Buscando',
      description: 'Partidas ilimitadas, multijugador en tiempo real y desafíos diarios. Gratis y sin descargar.',
      images: [`${BASE_URL}/og-image-es.webp?v=2`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/es/lexiclash-contra-wordle`,
        en: `${BASE_URL}/en/lexiclash-vs-wordle`,
        es: `${BASE_URL}/es/lexiclash-contra-wordle`,
        he: `${BASE_URL}/he/lexiclash-neged-wordle`,
      },
    },
    robots: { index: true, follow: true },
  };
}

// FAQ data — all values are static string literals (safe for JSON serialization)
const faqs = [
  {
    q: '¿En qué se diferencia LexiClash de Wordle?',
    a: 'Wordle te da una sola palabra por día y juegas solo. LexiClash es completamente diferente: buscas palabras en una grilla de letras conectadas, puedes jugar cuantas veces quieras, y lo mejor — puedes competir contra amigos en tiempo real. Imagina Boggle + Wordle + Mario Party, todo en uno.',
  },
  {
    q: '¿LexiClash funciona en español?',
    a: 'Sí, LexiClash está disponible en español, inglés, hebreo, sueco, japonés y ruso. La interfaz, las instrucciones y el diccionario de palabras válidas — todo funciona en tu idioma. Solo selecciona español en los ajustes y listo.',
  },
  {
    q: '¿Puedo jugar LexiClash gratis y sin descargar nada?',
    a: 'Totalmente. LexiClash es gratis, se juega directo en el navegador y no necesitas crear cuenta. Abre lexiclash.live desde tu celular, tablet o computadora y empieza a jugar al instante. Sin apps, sin registro, sin vueltas.',
  },
  {
    q: '¿Qué modos de juego tiene LexiClash?',
    a: 'Tiene de todo: modo solo contra bots con IA, multijugador en tiempo real con hasta 20 jugadores, desafío diario donde todo el mundo juega el mismo tablero, modo aventura con jefes y upgrades, y entrenamientos para mejorar tu vocabulario. Mucho más que adivinar una palabra de 5 letras.',
  },
  {
    q: '¿LexiClash es mejor que Wordle para practicar vocabulario?',
    a: 'Para expandir vocabulario, sí. Wordle te expone a una palabra por día. En LexiClash encontrás decenas de palabras por partida, aprendes combinaciones nuevas y el sistema de combos te premia por encontrar palabras rápido. Es como un gym para tu cerebro lingüístico.',
  },
];

// Static JSON-LD — all content is hardcoded string literals, not user input (safe for dangerouslySetInnerHTML)
const faqJsonLd = JSON.stringify({
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
});

export default async function LexiClashContraWordlePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/quick-play`, label: 'Jugar Solo — Gratis' }}>
      {/* JSON-LD structured data for FAQ rich results — static content only, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />

      <LandingHero
        eyebrow="LexiClash vs Wordle"
        title="LexiClash vs Wordle — ¿Por Qué Cambiarte a Algo Mejor?"
        lead="Ya te sabes la rutina: abres Wordle, adivinas la palabra en 4 intentos, compartes tu cuadradito verde en Twitter y... ya."
        actions={
          <>
            <LandingButton href={`/${locale}/quick-play`}>Jugar Solo — Gratis</LandingButton>
            <LandingButton href={`/${locale}/multiplayer`} variant="secondary">Jugar con Amigos</LandingButton>
          </>
        }
        art={LANDING_ART.duel('Dos mascotas de LexiClash en un duelo de palabras')}
        artTone="lime"
        more={
          <p>
            Hasta mañana. ¿Y si te dijéramos que hay un juego de palabras que puedes jugar cuando quieras, contra tus
            amigos en tiempo real, con combos, jefes y desafíos diarios? Eso es LexiClash — la alternativa a Wordle que no
            sabías que necesitabas.
          </p>
        }
      >
        <LinkPills items={[{ href: `/${locale}/daily`, label: 'Desafío Diario' }]} />
      </LandingHero>

      <Section title="LexiClash vs Wordle — Comparación Completa">
        <CompareTable
          columns={['Característica', 'LexiClash', 'Wordle']}
          rows={[
            ['Partidas por día', 'Ilimitadas', '1 por día'],
            ['Multijugador', '✓ Tiempo real (2-20+ jugadores)', '✗ Solo individual'],
            ['Precio', 'Gratis, sin anuncios molestos', 'Gratis (con anuncios en NYT)'],
            ['Mecánica', 'Conectar letras en grilla', 'Adivinar palabra de 5 letras'],
            ['Desafío diario', '✓ Mismo tablero para todos', '✓ Misma palabra para todos'],
            ['Modo aventura', '✓ Jefes, upgrades, misiones', '✗'],
            ['Idiomas', '5 (ES, EN, HE, SV, JA)', '37+ (solo texto)'],
            ['Tamaños de grilla', '4×4, 5×5, 6×6', 'N/A (5 letras fijas)'],
            ['Sistema de combos', '✓ Puntos extra por velocidad', '✗'],
            ['Sin descarga', '✓ Directo en el navegador', '✓ Directo en el navegador'],
          ]}
        />
      </Section>

      <Section title="¿Por Qué LexiClash Es la Mejor Alternativa a Wordle?">
        <CheckList
          items={[
            'Juega cuantas veces quieras — sin esperar al día siguiente',
            'Multijugador en tiempo real: reta a tus amigos al instante',
            'Sistema de combos que premia la velocidad y consistencia',
            'Modo aventura con jefes, upgrades y progresión tipo RPG',
            'Desafío diario global — compite contra el mundo entero',
            'Grillas de 4×4, 5×5 y 6×6 para todos los niveles',
            'Funciona en celular, tablet y computadora sin descargar nada',
            'Disponible en español latino con diccionario completo',
          ]}
        />
      </Section>

      <Section title="Preguntas Frecuentes">
        <FaqList items={faqs} />
      </Section>

      <Section title="Más Sobre Juegos de Palabras">
        <TileGrid
          columns={2}
          variant="paper"
          items={[
            { href: '/es/juego-de-palabras-multijugador', tone: 'pink', title: 'Scrabble Online en Español Multijugador', body: 'Sala con enlace, tiempo real, gratis y sin registro' },
            { href: `/${locale}/best-online-word-games`, tone: 'cyan', title: 'Mejores Juegos de Palabras 2026', body: 'Guía completa de comparación' },
          ]}
        />
      </Section>

      <CtaBand
        tone="pink"
        title="Deja Wordle. Prueba Algo Mejor."
        body={
          <div className="flex flex-col gap-3">
            <p>
              Wordle está bien para un ratito, pero si de verdad te gustan los juegos de palabras, te vas a quedar con ganas
              de más. LexiClash te da partidas ilimitadas, competencia real contra otros jugadores y un sistema de progresión
              que engancha. Todo gratis, todo en tu navegador, todo en español.
            </p>
            <p>
              Ya sea que busques una alternativa a Wordle en español, un juego de palabras online para jugar con amigos, o
              simplemente algo más intenso que adivinar 5 letras — LexiClash es tu respuesta. Dale, que la primera partida es
              en 30 segundos.
            </p>
          </div>
        }
        actions={<LandingButton href={`/${locale}/quick-play`}>Jugar LexiClash Gratis — Sin Descargas</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
