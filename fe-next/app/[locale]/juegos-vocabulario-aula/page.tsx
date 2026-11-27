import type { Metadata } from 'next';
import { CheckList, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, Mark, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

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
    description: 'Juegos de palabras educativos gratis para el aula. Duelos de vocabulario 1v1, juego de aula en vivo, sin registro de estudiantes. Soporta 6 idiomas, alineado con el currículo, funciona en cualquier navegador.',
    keywords: 'juegos de vocabulario para el aula, juegos de palabras educativos, juegos de vocabulario gratis, juegos de palabras para el aula, juegos de vocabulario online, juegos de palabras para profesores, juegos de palabras para estudiantes, vocabulario para el aula, juegos educativos sin registro, actividades de vocabulario',
    openGraph: {
      title: 'Juegos de Vocabulario para el Aula - Gratis | LexiClash',
      description: 'Sin registro, 6 idiomas, juego instantáneo en navegador. Multijugador en vivo + duelos 1v1 para cualquier aula.',
      locale: 'es_ES',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-es.webp?v=2`, width: 1200, height: 630, alt: 'LexiClash juegos de vocabulario aula' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Juegos de Vocabulario para el Aula | LexiClash',
      description: 'Gratis, sin registro, juego instantáneo.',
      images: [`${BASE_URL}/og-image-es.webp?v=2`],
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
  { q: '¿Cuáles son los mejores juegos de vocabulario gratis para el aula?', a: 'LexiClash está diseñado específicamente para aulas: los estudiantes se unen con un código de 6 caracteres (sin registro), el profesor elige una lista de palabras, y toda la clase juega multijugador en vivo durante 5-10 minutos. Funciona en cualquier navegador y soporta español, inglés, hebreo, sueco, japonés y ruso — útil para clases ESL e inmersión bilingüe.' },
  { q: '¿Necesitan los estudiantes crear cuentas?', a: 'No. Los estudiantes introducen un código de 6 caracteres que el profesor muestra y juegan al instante. Solo los profesores crean cuentas (gratis) para guardar listas de palabras y ver paneles de progreso.' },
  { q: '¿Puedo importar mi propia lista de vocabulario?', a: 'Sí. Los profesores pueden subir listas personalizadas de cualquier unidad, libro de texto o currículo. Úsalas en duelos 1v1, juegos de palabras para toda la clase o práctica asignada.' },
  { q: '¿En qué se diferencia de Quizlet, Kahoot o Wordwall?', a: 'Esas herramientas se basan en tarjetas didácticas o cuestionarios. LexiClash es un juego de formación de palabras: los estudiantes buscan palabras en una cuadrícula estilo Boggle, rueda de letras desordenadas o tablero de anagramas. Mejor para ortografía, recuerdo y reconocimiento de patrones que los cuestionarios de opción múltiple. Además, sin cuentas de estudiante y nivel gratuito completo.' },
  { q: '¿Cuánto dura una sesión de aula?', a: 'Un duelo de vocabulario 1v1 dura 2-3 minutos. Una ronda multijugador para toda la clase dura 5-10 minutos. La mayoría de los profesores lo usan como calentamiento de 5 minutos, descanso mental a mitad de lección o repaso al final de la clase.' },
  { q: '¿Es adecuado para primaria, secundaria o bachillerato?', a: 'Para los tres. La dificultad, el límite de tiempo y la lista de palabras se configuran por sesión. Los estudiantes más jóvenes juegan con palabras más cortas y listas más fáciles; los de bachillerato pueden ejecutar duelos de vocabulario avanzado cronometrados.' },
  { q: '¿Funciona para clases ESL o programas bilingües?', a: 'Sí — seis diccionarios integrados (español, inglés, hebreo con RTL, sueco, japonés) hacen de LexiClash una opción sólida para ESL/EFL, programas bilingües español-inglés, ruso y aulas multilingües. Los estudiantes practican ortografía y recuerdo en su idioma objetivo.' },
  { q: '¿Puedo seguir qué palabras dominaron los estudiantes?', a: 'Sí. El panel del profesor muestra precisión por estudiante, palabras perdidas y patrones de toda la clase (qué palabras hicieron tropezar a más estudiantes). Úsalo para evaluación formativa.' },
];

const features = [
  { icon: '⚡', text: 'Los estudiantes se unen en 5 segundos con un código de 6 caracteres — sin inicio de sesión, sin email' },
  { icon: '🎯', text: 'Tres modos de juego: cuadrícula Boggle, Búsqueda de Palabras, Rueda de Palabras' },
  { icon: '👥', text: 'Multijugador en vivo hasta 30 estudiantes por sesión' },
  { icon: '⚔️', text: 'Duelos de vocabulario 1v1 para práctica en parejas o rondas de subgrupo' },
  { icon: '📚', text: 'Sube tus propias listas de vocabulario del currículo — cualquier unidad, materia' },
  { icon: '🌍', text: 'Seis idiomas: español, inglés, hebreo (RTL), sueco, japonés, ruso' },
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
    <LandingPage locale={locale} play={{ href: `/${locale}/education/classroom-game`, label: '▶ Iniciar Juego de Aula' }}>
      <script id="ld-es-jva-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script id="ld-es-jva-resource" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(learningResourceJsonLd) }} />
      <script id="ld-es-jva-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <LandingHero
        eyebrow="★ Para Profesores ★ Empieza Gratis ★"
        title={
          <>
            Juegos de <Mark>Vocabulario</Mark>
            <br />para el Aula. <span className="text-neo-pink">Gratis.</span>
          </>
        }
        lead="El juego de vocabulario que los profesores realmente usan. Multijugador en vivo, duelos 1v1, tus listas de palabras, seis idiomas — y los estudiantes nunca necesitan una cuenta."
        actions={
          <>
            <LandingButton href={`/${locale}/education/classroom-game`} className="flex-col gap-0">
              <span className="block">▶ Iniciar Juego de Aula</span>
              <span className="block text-xs font-bold opacity-70">Gratis · Sin registro de estudiantes</span>
            </LandingButton>
            <LandingButton href={`/${locale}/education/duels`} variant="secondary" className="flex-col gap-0">
              <span className="block">⚔ Duelo 1v1</span>
              <span className="block text-xs font-bold opacity-70">Estudiantes cara a cara</span>
            </LandingButton>
          </>
        }
        art={LANDING_ART.reading('Mascota de LexiClash leyendo un libro')}
        artTone="yellow"
      />

      <Section
        title={
          <>
            Lo que <span className="text-neo-lime">obtienes</span>.
          </>
        }
      >
        <CheckList items={features.map((f) => f.text)} />
      </Section>

      <Section
        title={
          <>
            Cómo lo <span className="text-neo-cyan">usan los profesores</span>.
          </>
        }
      >
        <TileGrid
          variant="paper"
          columns={4}
          items={useCases.map((u) => ({
            icon: (
              <span className="self-start rounded-full border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-[11px] font-bold uppercase tracking-wide">
                {u.tag}
              </span>
            ),
            title: u.title,
            body: u.desc,
          }))}
        />
      </Section>

      <Section
        title={
          <>
            Preguntas <span className="text-neo-cyan">de profesores</span>.
          </>
        }
      >
        <FaqList items={faqs} />
      </Section>

      <CtaBand
        tone="yellow"
        title={
          <>
            ¿Diez minutos antes de salir?
            <br />
            <span className="box-decoration-clone bg-neo-navy px-2 text-neo-yellow">Lanza un juego de vocabulario.</span>
          </>
        }
        body="Elige una lista. Comparte el código. Juega. Revisa el panel. Eso es todo el bucle."
        actions={
          <>
            <LandingButton href={`/${locale}/education/classroom-game`}>▶ Iniciar Juego de Aula</LandingButton>
            <LandingButton href={`/${locale}/education`} variant="secondary">
              Ver Hub Educativo
            </LandingButton>
          </>
        }
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
