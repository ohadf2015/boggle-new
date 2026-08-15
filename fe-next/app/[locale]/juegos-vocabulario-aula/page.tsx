import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/juegos-vocabulario-aula';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await params;
  const pageUrl = `${BASE_URL}/es${PAGE_PATH}`;
  return {
    title: 'Juegos de Vocabulario para el Aula - Gratis, Sin Registro | LexiClash',
    description: 'Juegos de palabras educativos gratis para el aula. Duelos de vocabulario 1v1, juego de aula en vivo, sin registro de estudiantes. Soporta 5 idiomas, alineado con el currículo, funciona en cualquier navegador.',
    keywords: 'juegos de vocabulario para el aula, juegos de palabras educativos, juegos de vocabulario gratis, juegos de palabras para el aula, juegos de vocabulario online, juegos de palabras para profesores, juegos de palabras para estudiantes, vocabulario para el aula, juegos educativos sin registro, actividades de vocabulario',
    openGraph: {
      title: 'Juegos de Vocabulario para el Aula - Gratis | LexiClash',
      description: 'Sin registro, 5 idiomas, juego instantáneo en navegador. Multijugador en vivo + duelos 1v1 para cualquier aula.',
      locale: 'es_ES',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-es.webp`, width: 1200, height: 630, alt: 'LexiClash juegos de vocabulario aula' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Juegos de Vocabulario para el Aula | LexiClash',
      description: 'Gratis, sin registro, juego instantáneo.',
      images: [`${BASE_URL}/og-image-es.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        es: pageUrl,
        'es-ES': pageUrl,
        'es-MX': pageUrl,
        'es-AR': pageUrl,
        'es-CO': pageUrl,
        'es-US': pageUrl,
      },
    },
    robots: { index: true, follow: true },
  };
}

const faqs = [
  { q: '¿Cuáles son los mejores juegos de vocabulario gratis para el aula?', a: 'LexiClash está diseñado específicamente para aulas: los estudiantes se unen con un código de 4 dígitos (sin registro), el profesor elige una lista de palabras, y toda la clase juega multijugador en vivo durante 5-10 minutos. Funciona en cualquier navegador y soporta español, inglés, hebreo, sueco y japonés — útil para clases ESL e inmersión bilingüe.' },
  { q: '¿Necesitan los estudiantes crear cuentas?', a: 'No. Los estudiantes introducen un código de 4 dígitos que el profesor muestra y juegan al instante. Solo los profesores crean cuentas (gratis) para guardar listas de palabras y ver paneles de progreso.' },
  { q: '¿Puedo importar mi propia lista de vocabulario?', a: 'Sí. Los profesores pueden subir listas personalizadas de cualquier unidad, libro de texto o currículo. Úsalas en duelos 1v1, juegos de palabras para toda la clase o práctica asignada.' },
  { q: '¿En qué se diferencia de Quizlet, Kahoot o Wordwall?', a: 'Esas herramientas se basan en tarjetas didácticas o cuestionarios. LexiClash es un juego de formación de palabras: los estudiantes buscan palabras en una cuadrícula estilo Boggle, rueda de letras desordenadas o tablero de anagramas. Mejor para ortografía, recuerdo y reconocimiento de patrones que los cuestionarios de opción múltiple. Además, sin cuentas de estudiante y nivel gratuito completo.' },
  { q: '¿Cuánto dura una sesión de aula?', a: 'Un duelo de vocabulario 1v1 dura 2-3 minutos. Una ronda multijugador para toda la clase dura 5-10 minutos. La mayoría de los profesores lo usan como calentamiento de 5 minutos, descanso mental a mitad de lección o repaso al final de la clase.' },
  { q: '¿Es adecuado para primaria, secundaria o bachillerato?', a: 'Para los tres. La dificultad, el límite de tiempo y la lista de palabras se configuran por sesión. Los estudiantes más jóvenes juegan con palabras más cortas y listas más fáciles; los de bachillerato pueden ejecutar duelos de vocabulario avanzado cronometrados.' },
  { q: '¿Funciona para clases ESL o programas bilingües?', a: 'Sí — cinco diccionarios integrados (español, inglés, hebreo con RTL, sueco, japonés) hacen de LexiClash una opción sólida para ESL/EFL, programas bilingües español-inglés y aulas multilingües. Los estudiantes practican ortografía y recuerdo en su idioma objetivo.' },
  { q: '¿Puedo seguir qué palabras dominaron los estudiantes?', a: 'Sí. El panel del profesor muestra precisión por estudiante, palabras perdidas y patrones de toda la clase (qué palabras hicieron tropezar a más estudiantes). Úsalo para evaluación formativa.' },
];

const features = [
  { icon: '⚡', text: 'Los estudiantes se unen en 5 segundos con un código de 4 dígitos — sin inicio de sesión, sin email' },
  { icon: '🎯', text: 'Tres modos de juego: cuadrícula Boggle, Búsqueda de Palabras, Rueda de Palabras' },
  { icon: '👥', text: 'Multijugador en vivo hasta 30 estudiantes por sesión' },
  { icon: '⚔️', text: 'Duelos de vocabulario 1v1 para práctica en parejas o rondas de subgrupo' },
  { icon: '📚', text: 'Sube tus propias listas de vocabulario del currículo — cualquier unidad, materia' },
  { icon: '🌍', text: 'Cinco idiomas: español, inglés, hebreo (RTL), sueco, japonés' },
  { icon: '📊', text: 'Panel del profesor: precisión por estudiante + patrones de palabras perdidas' },
  { icon: '💸', text: 'Nivel gratuito cubre todo — sin venta adicional premium' },
];

const useCases = [
  { tag: 'CALENT.', title: 'Apertura de 5 min', desc: 'Lanza una rueda rápida con el vocabulario de ayer para despertar a la clase.' },
  { tag: 'REPASO', title: 'Recapitulación de unidad', desc: 'Ronda Boggle de toda la clase sobre las 30 palabras de la unidad; el panel revela las brechas.' },
  { tag: 'ESL', title: 'Práctica en idioma objetivo', desc: 'Cambia entre diccionarios EN, ES, HE, SV, JA por ronda para ESL o programas bilingües.' },
  { tag: 'SUSTITUTO', title: 'Día de profesor sustituto', desc: 'Cero preparación — el sustituto elige una lista, proyecta el código, los estudiantes juegan.' },
];

export default async function Page({ params }: PageProps) {
  const { locale } = await params;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/es${PAGE_PATH}#faq`,
    inLanguage: 'es',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const learningResourceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${BASE_URL}/es${PAGE_PATH}#resource`,
    name: 'Juegos de Vocabulario para el Aula',
    url: `${BASE_URL}/es${PAGE_PATH}`,
    inLanguage: 'es',
    learningResourceType: 'Game',
    educationalUse: ['Vocabulary Building', 'Classroom Activity', 'Spanish Language Learning', 'Bilingual Programs', 'Formative Assessment'],
    educationalLevel: ['Primary', 'Secondary', 'Adult Education'],
    typicalAgeRange: '8-99',
    isAccessibleForFree: true,
    teaches: 'Vocabulario, ortografía, reconocimiento de palabras, uso contextual',
    audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
    provider: {
      '@type': 'EducationalOrganization',
      '@id': `${BASE_URL}/es/education#org`,
      name: 'LexiClash Education',
      url: `${BASE_URL}/es/education`,
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Educación', item: `${BASE_URL}/${locale}/education` },
      { '@type': 'ListItem', position: 3, name: 'Juegos de Vocabulario para el Aula', item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <Script id="ld-es-jva-faq" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <Script id="ld-es-jva-resource" type="application/ld+json">{JSON.stringify(learningResourceJsonLd)}</Script>
      <Script id="ld-es-jva-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</Script>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <TopBackLink className="mb-4" />

        <section className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <span className="inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">
              ★ Para Profesores ★ Gratis Para Siempre ★
            </span>
            <h1 className="mt-5 font-neo-display text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
              Juegos de <span className="inline-block rotate-[-2deg] bg-neo-lime px-3 text-neo-navy shadow-hard">Vocabulario</span>
              <br />para el Aula. <span className="text-neo-pink">Gratis.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neo-gray-200 sm:text-xl">
              El juego de vocabulario que los profesores realmente usan. Multijugador en vivo, duelos 1v1, tus listas de palabras, cinco idiomas — y los estudiantes nunca necesitan una cuenta.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-yellow px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl">
                <span className="block text-base sm:text-lg">▶ Iniciar Juego de Aula</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">Gratis · Sin registro de estudiantes</span>
              </Link>
              <Link href={`/${locale}/education/duels`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:px-7">
                <span className="block text-base sm:text-lg">⚔ Duelo 1v1</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-80">Estudiantes cara a cara</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            Lo que <span className="text-neo-lime">obtienes</span>.
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {features.map((f, i) => (
              <li key={f.text} className="flex items-start gap-4 rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard"
                  style={{ transform: i % 3 === 0 ? 'rotate(-0.4deg)' : i % 3 === 1 ? 'rotate(0.3deg)' : 'rotate(0deg)' }}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-neo border-3 border-neo-black bg-neo-lime text-xl shadow-hard-sm" aria-hidden="true">{f.icon}</span>
                <p className="pt-1.5 text-sm sm:text-base">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            Cómo lo <span className="text-neo-cyan">usan los profesores</span>.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((u) => (
              <div key={u.title} className="relative rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard">
                <span className="absolute -top-3 left-3 border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-navy">{u.tag}</span>
                <h3 className="mt-2 font-neo-display text-base font-black">{u.title}</h3>
                <p className="mt-2 text-sm text-neo-gray-200">{u.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            Preguntas <span className="text-neo-cyan">de profesores</span>.
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <details key={`faq-${idx}`} className="group rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard transition-all open:shadow-hard-lg">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-neo-display font-black uppercase tracking-wide sm:px-6">
                  <span>{faq.q}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded border-2 border-neo-black bg-neo-yellow text-neo-navy transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="border-t-3 border-neo-black bg-neo-navy/40 px-5 py-4 text-sm text-neo-gray-200 sm:px-6 sm:text-base">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-20 mb-12 rounded-neo border-4 border-neo-black bg-neo-yellow p-8 text-neo-navy shadow-hard-xl sm:p-12">
          <h2 className="font-neo-display text-4xl font-black leading-[0.95] sm:text-5xl">
            ¿Diez minutos antes de salir?
            <br /><span className="bg-neo-navy px-3 text-neo-yellow">Lanza un juego de vocabulario.</span>
          </h2>
          <p className="mt-4 max-w-xl text-base font-bold sm:text-lg">Elige una lista. Comparte el código. Juega. Revisa el panel. Eso es todo el bucle.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={`/${locale}/education/classroom-game`} className="rounded-neo border-4 border-neo-black bg-neo-navy px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-yellow shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl sm:text-lg">
              ▶ Iniciar Juego de Aula
            </Link>
            <Link href={`/${locale}/education`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg">
              Ver Hub Educativo
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
