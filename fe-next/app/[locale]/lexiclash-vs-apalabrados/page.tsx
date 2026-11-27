import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckList, CompareTable, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const isSpanish = locale === 'es';
    const pageUrl = `${BASE_URL}/es/lexiclash-vs-apalabrados`;

    return {
        title: 'LexiClash vs Apalabrados — ¿Cuál Juego de Palabras Es Mejor 2026?',
        description: 'LexiClash vs Apalabrados comparados: tiempo real contra por turnos, 90 segundos por partida en lugar de días, 2-20 jugadores, gratis en el navegador sin descargar. La mejor alternativa a Apalabrados para hispanohablantes.',
        keywords: 'lexiclash vs apalabrados, alternativa apalabrados, juego de palabras gratis, juego de palabras multijugador online, juego de palabras tiempo real, mejor juego de palabras 2026, juegos de palabras navegador, words with friends español',
        openGraph: {
            title: 'LexiClash vs Apalabrados — ¿Tiempo Real o Por Turnos?',
            description: 'Apalabrados tarda días por partida. LexiClash es síncrono — 90 segundos, 2-20 jugadores, sin descarga. Comparación completa para fans hispanohablantes.',
            locale: 'es_ES',
            type: 'website',
            url: pageUrl,
            images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Apalabrados comparación' }],
        },
        twitter: {
            card: 'summary_large_image',
            title: 'LexiClash vs Apalabrados — ¿Cuál es mejor?',
            description: 'Juego de palabras multijugador en tiempo real, 2-20 jugadores en el navegador. Comparación completa con Apalabrados.',
            images: [`${BASE_URL}/og-image-en.webp`],
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
        robots: { index: isSpanish, follow: true },
    };
}

const faqs = [
    {
        q: '¿En qué se diferencia LexiClash de Apalabrados?',
        a: 'Apalabrados es por turnos — tú juegas, tu rival juega, a veces con horas o días entre cada movimiento. LexiClash es sincronizado en tiempo real: todos los jugadores ven la misma cuadrícula de letras simultáneamente y buscan palabras a la vez. Una partida completa dura 90 segundos en lugar de días. Ambos son gratuitos, pero el ritmo de juego es completamente distinto.',
    },
    {
        q: '¿Cuántos jugadores pueden jugar a LexiClash a la vez?',
        a: 'De 2 a 20+ jugadores en la misma sala. Apalabrados está limitado a 2 jugadores por partida. LexiClash está pensado para fiestas, aulas, equipos remotos y reuniones familiares — todos en la misma cuadrícula al mismo tiempo.',
    },
    {
        q: '¿Necesito descargar una aplicación?',
        a: 'No — LexiClash funciona en el navegador. Compatible con iPhone, Android, tableta y escritorio sin instalación. Puedes instalarlo como Progressive Web App si quieres tenerlo en la pantalla de inicio, pero es opcional. Apalabrados requiere su app para la experiencia completa.',
    },
    {
        q: '¿Necesito una cuenta?',
        a: 'No, puedes jugar como invitado al instante. Sin cuenta de Google, sin Facebook, sin correo electrónico. La cuenta es opcional y solo necesaria para sincronizar progreso entre dispositivos. Apalabrados requiere registro.',
    },
    {
        q: '¿El diccionario en español es completo?',
        a: 'LexiClash usa un diccionario español alineado con la RAE que acepta variantes ibéricas y latinoamericanas — España, México, Argentina, Colombia, EE. UU. hispanohablante. Apalabrados también tiene diccionario sólido tras más de una década de pulido — sigue siendo referencia. LexiClash añade el formato multijugador masivo y varios idiomas en la misma app.',
    },
    {
        q: '¿Cuánto cuesta LexiClash?',
        a: 'Gratis. Todos los modos de juego, desafíos diarios y salas multijugador están abiertos sin pago. Mostramos anuncios para mantenerlo gratis, pero los anuncios nunca bloquean el juego. Sin mecánicas pay-to-win — todos los potenciadores se ganan jugando, no comprando.',
    },
    {
        q: '¿Puedo jugar específicamente con amigos o solo contra desconocidos?',
        a: 'Ambas opciones. Crea una sala y comparte el código de 6 caracteres por WhatsApp, SMS o código QR — tus amigos entran al instante. También puedes unirte a salas públicas para enfrentarte a jugadores aleatorios. Apalabrados requiere agregar rivales por nombre de usuario o Facebook.',
    },
    {
        q: '¿Hay un modo aula para profesores?',
        a: 'Sí. LexiClash Education es gratuito para profesores, sin registro de alumnos. Crea listas de vocabulario propias, ejecuta duelos de vocabulario, sigue el progreso de los estudiantes en un panel docente. No existe en Apalabrados. Ideal para aulas hispanohablantes, ESL/ELE y enseñanza de idiomas.',
    },
];

const faqJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: 'es-ES',
    url: `${BASE_URL}/es/lexiclash-vs-apalabrados`,
    mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
});

export default async function LexiClashVsApalabradosPage({ params }: PageProps) {
    const { locale } = await params;

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/multiplayer`, label: 'Jugar LexiClash Gratis' }}>
      <script type="application/ld+json">{faqJsonLd}</script>

      <LandingHero
        eyebrow="LexiClash vs Apalabrados"
        title="LexiClash vs Apalabrados — ¿Cuál Juego de Palabras Gana?"
        lead="Apalabrados domina los juegos de palabras en español desde 2012 — por turnos, asíncrono, perfecto para partidas largas entre jugadas."
        actions={
          <>
            <LandingButton href={`/${locale}/multiplayer`}>Jugar LexiClash Gratis</LandingButton>
            <LandingButton href={`/${locale}/daily`} variant="secondary">Desafío Diario</LandingButton>
          </>
        }
        art={LANDING_ART.duel('Dos mascotas de LexiClash en un duelo de palabras')}
        artTone="yellow"
        more={
          <p>
            LexiClash es algo distinto: sincronizado en tiempo real, 2-20+ jugadores en la misma cuadrícula al mismo tiempo, una partida completa en 90 segundos. Ambos son gratis. Ambos son aptos para navegador. Pero la sensación de juego es completamente diferente. Aquí está la comparación honesta para fans hispanohablantes.
          </p>
        }
      >
        <LinkPills items={[{ href: `/${locale}/education`, label: 'Para Profesores' }]} />
      </LandingHero>

      <Section title="La Comparación Honesta">
        <CompareTable
          columns={['Característica', 'LexiClash', 'Apalabrados']}
          rows={[
            ['Ritmo de juego', 'Tiempo real (sincrónico)', 'Por turnos (días)'],
            ['Duración por partida', '~90 segundos', 'Días o semanas'],
            ['Jugadores por sala', '2 a 20+', '2 (fijo)'],
            ['Mecánica de juego', 'Cuadrícula compartida, conectar letras', 'Tablero estilo Scrabble por turnos'],
            ['Diccionario español', 'Alineado con RAE', 'RAE'],
            ['Cuenta requerida', 'No (opcional)', 'Sí'],
            ['Plataformas', 'Web + Android', 'Solo app'],
            ['Juego en navegador', 'Sí', 'Limitado'],
            ['Invitar amigos', 'Código de 6 caracteres / QR / enlace', 'Usuario / Facebook'],
            ['Precio', 'Gratis (con anuncios)', 'Gratis (con anuncios)'],
            ['Pay-to-win', 'No', 'Existen potenciadores de pago'],
            ['Desafío diario', 'Sí (estilo Wordle + Daily Buzz)', 'No es el foco'],
            ['Modo aula', 'Sí, panel docente gratuito', 'No'],
            ['Idiomas disponibles', '5 (EN, HE, SV, JA, ES)', 'Principalmente español'],
            ['Soporte hreflang regional', 'es-ES, es-MX, es-AR, es-CO, es-US', 'Variable'],
          ]}
        />
      </Section>

      <Section title="Por Qué El Tiempo Real Le Gana A Los Turnos">
        <TileGrid
          columns={2}
          items={[
            {
              tone: 'cyan',
              title: 'Apalabrados (Asíncrono Por Turnos)',
              body: 'Tú haces tu jugada, tu rival la suya — quizás en una hora, quizás en tres días. Para jugadores estratégicos la espera es parte del encanto: tienes tiempo para encontrar la palabra perfecta. Para otros se vuelve eterno. Apalabrados es la referencia en juego de palabras pausado y reflexivo en español.',
            },
            {
              tone: 'pink',
              title: 'LexiClash (Sincronizado En Tiempo Real)',
              body: 'Todos los jugadores ven la misma cuadrícula de letras aleatorias. El reloj corre. Buscas palabras conectando letras adyacentes — diagonal, vertical, horizontal. Palabras más largas = más puntos. Los combos multiplican. Tras 90 segundos se acaba la partida. Más adrenalina, más trabajo cognitivo por minuto, menos espera. Genial para fiestas y descansos; menos adecuado para el estilo "respondo cuando tenga tiempo mañana".',
            },
          ]}
        />
      </Section>

      <Section title="Lo Que LexiClash Ofrece Que Apalabrados No">
        <TileGrid
          variant="paper"
          items={[
            { title: 'Desafío Diario Estilo Wordle', body: 'Word Hunt Survival y Daily Buzz — puzles diarios globales con resultados para compartir y seguimiento de rachas. Apalabrados no tiene formato diario equivalente.' },
            { title: 'Multijugador Para 20+ Personas', body: 'Crea una sala, comparte el código, mete a toda la clase o toda la fiesta a la vez en la misma cuadrícula. Apalabrados se limita a 1 contra 1.' },
            { title: 'Modo Aula Para Profesores', body: 'Listas de vocabulario propias del programa, duelos léxicos, panel docente con progreso. Completamente gratis sin registro de alumnos. No existe en Apalabrados.' },
            { title: 'Brain Drills (6 Minijuegos)', body: 'Word Wheel, Anagram Sprint, Connections, Word Detective, Word of the Day, Speed Spell. Ejercicios cognitivos rápidos — no están en Apalabrados.' },
            { title: 'Cobertura Hispanoamericana', body: 'Hreflang configurado para España, México, Argentina, Colombia y EE. UU. hispanohablante. El diccionario acepta variantes ibéricas y latinoamericanas.' },
            { title: 'Sin Registro Obligatorio', body: 'Pulsa Jugar, escribe un alias, listo. La cuenta es opcional — solo para sincronizar entre dispositivos. Apalabrados requiere registro desde el inicio.' },
          ]}
        />
      </Section>

      <Section title="Cuándo Elegir Cada Uno">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="font-neo-display text-xl font-bold text-neo-cyan">Elige Apalabrados Si Quieres:</h3>
            <CheckList
              items={[
                'Jugar estilo Scrabble con planificación táctica',
                'Partidas que duran días — sin presión de tiempo',
                'Enfrentarte a un rival concreto 1 contra 1',
                'Una app establecida con gran base hispanohablante',
                'Una experiencia más pausada y reflexiva',
              ]}
            />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="font-neo-display text-xl font-bold text-neo-lime">Elige LexiClash Si Quieres:</h3>
            <CheckList
              items={[
                'Una partida en 90 segundos, no en días',
                'Reunir a 5-20 personas en la misma fiesta o aula',
                'Jugar directo en el navegador sin descargar',
                'Desafío diario con rachas (estilo Wordle)',
                'Usar modo aula para enseñar vocabulario',
                'Jugar en varios idiomas en la misma app',
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title="Preguntas Frecuentes">
        <FaqList items={faqs} />
      </Section>

      <Section title="Otras Comparaciones">
        <TileGrid
          variant="paper"
          items={[
            { href: `/${locale}/lexiclash-vs-wordle`, title: 'LexiClash vs Wordle', body: 'Multijugador vs un puzle diario' },
            { href: `/${locale}/lexiclash-vs-scrabble`, title: 'LexiClash vs Scrabble GO', body: 'Tiempo real vs por turnos' },
            { href: `/${locale}/lexiclash-vs-cabanagrams`, title: 'LexiClash vs Cabanagrams', body: 'Cuadrícula compartida vs personal' },
          ]}
        />
      </Section>

      <CtaBand
        tone="pink"
        title="Resumen"
        body={
          <div className="flex flex-col gap-3">
            <p>
              Apalabrados es un excelente juego por turnos — el clásico hispanohablante desde 2012. Si te gusta el estilo Scrabble pausado y táctico contra un rival concreto, no hay mejor opción. La gran base de jugadores y el matchmaking pulido son ventajas reales.
            </p>
            <p>
              LexiClash es para quien quiere la misma diversión léxica pero en formato más rápido: partidas síncronas de 90 segundos, 2-20+ jugadores en la misma sala, sin descargas, modo aula, desafío diario. No es un reemplazo de Apalabrados — es un complemento para otros momentos. Apalabrados con el café de la mañana, LexiClash en la fiesta.
            </p>
            <p>Ambos son gratis. Ambos funcionan en español. Ambos tienen diccionarios sólidos. La diferencia está en qué sensación buscas.</p>
          </div>
        }
        actions={<LandingButton href={`/${locale}/multiplayer`}>Jugar LexiClash Ahora — Gratis, Sin Descarga</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
