import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBackLink } from '@/components/navigation/TopBackLink';

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
        <main className="min-h-screen bg-neo-navy text-neo-white">
            <script type="application/ld+json">{faqJsonLd}</script>

            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                <TopBackLink className="mb-4" />
                <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
                    LexiClash vs Apalabrados — ¿Cuál Juego de Palabras Gana?
                </h1>

                <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
                    Apalabrados domina los juegos de palabras en español desde 2012 — por turnos, asíncrono, perfecto para partidas largas entre jugadas. LexiClash es algo distinto: sincronizado en tiempo real, 2-20+ jugadores en la misma cuadrícula al mismo tiempo, una partida completa en 90 segundos. Ambos son gratis. Ambos son aptos para navegador. Pero la sensación de juego es completamente diferente. Aquí está la comparación honesta para fans hispanohablantes.
                </p>

                <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
                    <Link href={`/${locale}/multiplayer`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
                        Jugar LexiClash Gratis
                    </Link>
                    <Link href={`/${locale}/daily`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
                        Desafío Diario
                    </Link>
                    <Link href={`/${locale}/education`} className="rounded-neo border-4 border-neo-purple bg-transparent px-6 py-3 text-center font-bold text-neo-purple shadow-hard transition-all hover:bg-neo-purple/10 sm:px-8 sm:py-4">
                        Para Profesores
                    </Link>
                </section>

                <section className="mb-12">
                    <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">La Comparación Honesta</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse rounded-neo border-3 border-neo-gray-400 text-sm sm:text-base">
                            <thead>
                                <tr className="border-b-3 border-neo-gray-400 bg-neo-navy/80">
                                    <th className="px-4 py-3 text-left font-bold text-neo-lime">Característica</th>
                                    <th className="px-4 py-3 text-center font-bold text-neo-cyan">LexiClash</th>
                                    <th className="px-4 py-3 text-center text-neo-gray-300">Apalabrados</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
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
                                ].map(([feature, lexi, apa]) => (
                                    <tr key={feature} className="border-b border-neo-gray-400/50">
                                        <td className="px-4 py-3 font-medium">{feature}</td>
                                        <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                                        <td className="px-4 py-3 text-center text-neo-gray-300">{apa}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Por Qué El Tiempo Real Le Gana A Los Turnos</h2>
                    <div className="rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 p-6 shadow-hard">
                        <div className="mb-6">
                            <h3 className="mb-2 font-bold text-neo-cyan">Apalabrados (Asíncrono Por Turnos)</h3>
                            <p className="text-neo-gray-200">
                                Tú haces tu jugada, tu rival la suya — quizás en una hora, quizás en tres días. Para jugadores estratégicos la espera es parte del encanto: tienes tiempo para encontrar la palabra perfecta. Para otros se vuelve eterno. Apalabrados es la referencia en juego de palabras pausado y reflexivo en español.
                            </p>
                        </div>
                        <div>
                            <h3 className="mb-2 font-bold text-neo-pink">LexiClash (Sincronizado En Tiempo Real)</h3>
                            <p className="text-neo-gray-200">
                                Todos los jugadores ven la misma cuadrícula de letras aleatorias. El reloj corre. Buscas palabras conectando letras adyacentes — diagonal, vertical, horizontal. Palabras más largas = más puntos. Los combos multiplican. Tras 90 segundos se acaba la partida. Más adrenalina, más trabajo cognitivo por minuto, menos espera. Genial para fiestas y descansos; menos adecuado para el estilo &quot;respondo cuando tenga tiempo mañana&quot;.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Lo Que LexiClash Ofrece Que Apalabrados No</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {[
                            { title: 'Desafío Diario Estilo Wordle', desc: 'Word Hunt Survival y Daily Buzz — puzles diarios globales con resultados emoji compartibles y seguimiento de rachas. Apalabrados no tiene formato diario equivalente.' },
                            { title: 'Multijugador Para 20+ Personas', desc: 'Crea una sala, comparte el código, mete a toda la clase o toda la fiesta a la vez en la misma cuadrícula. Apalabrados se limita a 1 contra 1.' },
                            { title: 'Modo Aula Para Profesores', desc: 'Listas de vocabulario propias del programa, duelos léxicos, panel docente con progreso. Completamente gratis sin registro de alumnos. No existe en Apalabrados.' },
                            { title: 'Brain Drills (6 Minijuegos)', desc: 'Word Wheel, Anagram Sprint, Connections, Word Detective, Word of the Day, Speed Spell. Ejercicios cognitivos rápidos — no están en Apalabrados.' },
                            { title: 'Cobertura Hispanoamericana', desc: 'Hreflang configurado para España, México, Argentina, Colombia y EE. UU. hispanohablante. El diccionario acepta variantes ibéricas y latinoamericanas.' },
                            { title: 'Sin Registro Obligatorio', desc: 'Pulsa Jugar, escribe un alias, listo. La cuenta es opcional — solo para sincronizar entre dispositivos. Apalabrados requiere registro desde el inicio.' },
                        ].map((item) => (
                            <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                                <p className="text-sm text-neo-gray-200">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Cuándo Elegir Cada Uno</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-neo border-3 border-neo-cyan bg-neo-navy/50 p-6 shadow-hard">
                            <h3 className="mb-3 font-bold text-neo-cyan">Elige Apalabrados Si Quieres:</h3>
                            <ul className="space-y-2 text-sm text-neo-gray-200">
                                <li>Jugar estilo Scrabble con planificación táctica</li>
                                <li>Partidas que duran días — sin presión de tiempo</li>
                                <li>Enfrentarte a un rival concreto 1 contra 1</li>
                                <li>Una app establecida con gran base hispanohablante</li>
                                <li>Una experiencia más pausada y reflexiva</li>
                            </ul>
                        </div>
                        <div className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-6 shadow-hard">
                            <h3 className="mb-3 font-bold text-neo-lime">Elige LexiClash Si Quieres:</h3>
                            <ul className="space-y-2 text-sm text-neo-gray-200">
                                <li>Una partida en 90 segundos, no en días</li>
                                <li>Reunir a 5-20 personas en la misma fiesta o aula</li>
                                <li>Jugar directo en el navegador sin descargar</li>
                                <li>Desafío diario con rachas (estilo Wordle)</li>
                                <li>Usar modo aula para enseñar vocabulario</li>
                                <li>Jugar en varios idiomas en la misma app</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Preguntas Frecuentes</h2>
                    <div className="space-y-4">
                        {faqs.map((faq, idx) => (
                            <details key={`faq-${idx}-${faq.q}`} className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard">
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
                    <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">Otras Comparaciones</h2>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Link href={`/${locale}/lexiclash-vs-wordle`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
                            <h3 className="font-bold text-neo-cyan">LexiClash vs Wordle</h3>
                            <p className="mt-1 text-xs text-neo-gray-200">Multijugador vs un puzle diario</p>
                        </Link>
                        <Link href={`/${locale}/lexiclash-vs-scrabble`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
                            <h3 className="font-bold text-neo-cyan">LexiClash vs Scrabble GO</h3>
                            <p className="mt-1 text-xs text-neo-gray-200">Tiempo real vs por turnos</p>
                        </Link>
                        <Link href={`/${locale}/lexiclash-vs-cabanagrams`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
                            <h3 className="font-bold text-neo-cyan">LexiClash vs Cabanagrams</h3>
                            <p className="mt-1 text-xs text-neo-gray-200">Cuadrícula compartida vs personal</p>
                        </Link>
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Resumen</h2>
                    <p className="mt-4 text-neo-gray-200">
                        Apalabrados es un excelente juego por turnos — el clásico hispanohablante desde 2012. Si te gusta el estilo Scrabble pausado y táctico contra un rival concreto, no hay mejor opción. La gran base de jugadores y el matchmaking pulido son ventajas reales.
                    </p>
                    <p className="mt-4 text-neo-gray-200">
                        LexiClash es para quien quiere la misma diversión léxica pero en formato más rápido: partidas síncronas de 90 segundos, 2-20+ jugadores en la misma sala, sin descargas, modo aula, desafío diario. No es un reemplazo de Apalabrados — es un complemento para otros momentos. Apalabrados con el café de la mañana, LexiClash en la fiesta.
                    </p>
                    <p className="mt-4 text-neo-gray-200">
                        Ambos son gratis. Ambos funcionan en español. Ambos tienen diccionarios sólidos. La diferencia está en qué sensación buscas.
                    </p>
                    <div className="mt-6">
                        <Link href={`/${locale}/multiplayer`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
                            Jugar LexiClash Ahora — Gratis, Sin Descarga
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
