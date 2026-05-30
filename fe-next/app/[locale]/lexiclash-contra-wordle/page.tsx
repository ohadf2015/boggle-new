import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBackLink } from '@/components/navigation/TopBackLink';

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
          url: `${BASE_URL}/og-image-es.webp`,
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
      images: [`${BASE_URL}/og-image-es.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/lexiclash-vs-wordle`,
        en: `${BASE_URL}/en/lexiclash-vs-wordle`,
        es: `${BASE_URL}/es/lexiclash-contra-wordle`,
        he: `${BASE_URL}/he/lexiclash-neged-wordle`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
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
    a: 'Sí, LexiClash está disponible en español, inglés, hebreo, sueco y japonés. La interfaz, las instrucciones y el diccionario de palabras válidas — todo funciona en tu idioma. Solo selecciona español en los ajustes y listo.',
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
    <main className="min-h-screen bg-neo-navy text-neo-white">
      {/* JSON-LD structured data for FAQ rich results — static content only, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />
        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          LexiClash vs Wordle — ¿Por Qué Cambiarte a Algo Mejor?
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Ya te sabes la rutina: abres Wordle, adivinas la palabra en 4 intentos, compartes tu cuadradito verde
          en Twitter y... ya. Hasta mañana. ¿Y si te dijéramos que hay un juego de palabras que puedes jugar
          cuando quieras, contra tus amigos en tiempo real, con combos, jefes y desafíos diarios? Eso es
          LexiClash — la alternativa a Wordle que no sabías que necesitabas.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href={`/${locale}/singleplayer`}
            className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4"
          >
            Jugar Solo — Gratis
          </Link>
          <Link
            href={`/${locale}/multiplayer`}
            className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4"
          >
            Jugar con Amigos
          </Link>
          <Link
            href={`/${locale}/daily`}
            className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4"
          >
            Desafío Diario
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            LexiClash vs Wordle — Comparación Completa
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-neo border-3 border-neo-gray-400 text-sm sm:text-base">
              <thead>
                <tr className="border-b-3 border-neo-gray-400 bg-neo-navy/80">
                  <th className="px-4 py-3 text-left font-bold text-neo-lime">Característica</th>
                  <th className="px-4 py-3 text-center font-bold text-neo-cyan">LexiClash</th>
                  <th className="px-4 py-3 text-center text-neo-gray-300">Wordle</th>
                </tr>
              </thead>
              <tbody>
                {[
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
                ].map(([feature, lexi, wordle]) => (
                  <tr key={feature} className="border-b border-neo-gray-400/50">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{wordle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            ¿Por Qué LexiClash Es la Mejor Alternativa a Wordle?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              'Juega cuantas veces quieras — sin esperar al día siguiente',
              'Multijugador en tiempo real: reta a tus amigos al instante',
              'Sistema de combos que premia la velocidad y consistencia',
              'Modo aventura con jefes, upgrades y progresión tipo RPG',
              'Desafío diario global — compite contra el mundo entero',
              'Grillas de 4×4, 5×5 y 6×6 para todos los niveles',
              'Funciona en celular, tablet y computadora sin descargar nada',
              'Disponible en español latino con diccionario completo',
            ].map((feature) => (
              <div
                key={feature}
                className="flex gap-3 rounded-neo border-3 border-neo-lime bg-neo-navy/50 p-4 shadow-hard"
              >
                <span className="shrink-0 text-neo-lime">✓</span>
                <p className="text-sm sm:text-base">{feature}</p>
              </div>
            ))}
          </div>
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
                  <span className="text-neo-lime transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">Más Sobre Juegos de Palabras</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/es/juego-de-palabras-multijugador" className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-pink/40">
              <h3 className="font-bold text-neo-pink">Scrabble Online en Español Multijugador</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Sala con enlace, tiempo real, gratis y sin registro</p>
            </Link>
            <Link href={`/${locale}/best-online-word-games`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-cyan/40">
              <h3 className="font-bold text-neo-cyan">Mejores Juegos de Palabras 2026</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Guía completa de comparación</p>
            </Link>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Deja Wordle. Prueba Algo Mejor.</h2>
          <p className="mt-4 text-neo-gray-200">
            Wordle está bien para un ratito, pero si de verdad te gustan los juegos de palabras, te vas a quedar
            con ganas de más. LexiClash te da partidas ilimitadas, competencia real contra otros jugadores y un
            sistema de progresión que engancha. Todo gratis, todo en tu navegador, todo en español.
          </p>
          <p className="mt-4 text-neo-gray-200">
            Ya sea que busques una alternativa a Wordle en español, un juego de palabras online para jugar con
            amigos, o simplemente algo más intenso que adivinar 5 letras — LexiClash es tu respuesta. Dale,
            que la primera partida es en 30 segundos.
          </p>
          <div className="mt-6">
            <Link
              href={`/${locale}/singleplayer`}
              className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
            >
              Jugar LexiClash Gratis — Sin Descargas
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
