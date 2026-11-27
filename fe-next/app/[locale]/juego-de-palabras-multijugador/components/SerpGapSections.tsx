import Link from 'next/link';
import { Plus } from 'lucide-react';
import { CheckList, CompareTable, LinkPills, Prose, Section, TileGrid } from '@/components/landing/kit';
import {
  BONUS_SQUARES,
  CONTROLS,
  ES_DICT_FLOOR,
  EXAMPLE_GRID,
  EXAMPLE_TOTAL_POINTS,
  EXAMPLE_WORDS,
  LENGTH_SCORES,
  SIMILAR_GAMES,
  SPANISH_BAG,
  SPANISH_BAG_TOTAL,
  SPANISH_TILES,
  TIPS,
} from '../data';

const H3 = 'font-neo-display text-xl font-bold';

/** Headings the top SERP pages rank with that this landing lacked; the whole-class room is the unique asset. */
export function SerpGapSections({ locale }: { locale: string }) {
  return (
    <>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <Section title="Cómo jugar a Scrabble online en español multijugador">
          <Prose>
            <p>
              No hay atril de 7 fichas ni turnos. En LexiClash todos ven la misma cuadrícula y buscan a la vez. Eso
              es <strong>scrabble online español multijugador</strong> sin la espera: 2 a 50 jugadores, rondas de 90
              segundos, navegador.
            </p>
            <ol>
              <li>
                Entra a <Link href={`/${locale}/multiplayer`}>la sala multijugador</Link> y pulsa Crear sala — cero
                formularios.
              </li>
              <li>Comparte el enlace por WhatsApp. Tus amigos entran con el código, sin cuenta.</li>
              <li>
                Desliza letras adyacentes (también en diagonal). Mínimo 3 letras. Las más largas pagan más — mira la
                tabla de abajo.
              </li>
            </ol>
          </Prose>
        </Section>
        <Section title="¿Cuáles son las características del juego?">
          <CheckList
            items={[
              'Tiempo real, no por turnos',
              '2–50 jugadores en una sala',
              `Diccionario ES ${ES_DICT_FLOOR}+ palabras`,
              '8 modos, 6 idiomas, 0€',
              'Móvil y PC, sin app',
              'Ronda por defecto: 90 segundos',
            ]}
          />
        </Section>
      </div>

      <Section
        title="Ejemplo de ronda real (cuadrícula 4×4)"
        intro={
          <>
            Una partida clásica de LexiClash, no un tablero de Scrabble 15×15. Palabras comprobadas en nuestro
            diccionario español. Puntos = reglas clásicas de longitud (las mismas que en{' '}
            <Link href={`/${locale}/rules`} className="font-bold text-neo-cyan underline">
              las reglas
            </Link>
            ). Total de esta ronda de ejemplo: <strong className="text-neo-lime">{EXAMPLE_TOTAL_POINTS} puntos</strong>{' '}
            en una sola ronda de 90 segundos.
          </>
        }
      >
        <div className="grid items-start gap-6 lg:grid-cols-[auto_1fr] lg:gap-10">
          <div className="mx-auto grid w-fit -rotate-2 grid-cols-4 gap-1.5 rounded-neo-lg border-3 border-neo-black bg-neo-purple p-3 shadow-hard-xl">
            {EXAMPLE_GRID.flatMap((row, r) =>
              row.map((ch, c) => (
                <span
                  key={`${r}-${c}-${ch}`}
                  className="grid h-14 w-14 place-items-center rounded-neo border-3 border-neo-black bg-neo-yellow font-neo-display text-2xl font-bold text-neo-black sm:h-16 sm:w-16"
                >
                  {ch}
                </span>
              )),
            )}
          </div>
          <CompareTable
            highlight={2}
            columns={['Palabra', 'Letras', 'Puntos', 'Recorrido']}
            rows={[
              ...EXAMPLE_WORDS.map((row) => [row.word, row.letters, row.points, row.path]),
              ['Total', '—', EXAMPLE_TOTAL_POINTS, '8 palabras, una ronda'],
            ]}
            captionHidden
            caption="Palabras encontradas en la cuadrícula de ejemplo y su puntuación LexiClash."
          />
        </div>
      </Section>

      <Section
        title="Puntuación: longitud LexiClash vs fichas de Scrabble"
        intro="El Scrabble clásico paga por ficha (la Ñ vale 8, la Z vale 10). LexiClash paga por longitud para que la ronda quepa en 90 segundos. Misma familia de palabras; ritmo distinto."
      >
        <div className="max-w-md">
          <CompareTable
            columns={['Letras', 'Puntos LexiClash']}
            rows={LENGTH_SCORES.map((row) => [row.letters, row.points])}
            captionHidden
            caption="Puntos por longitud de palabra en el modo clásico de LexiClash."
          />
        </div>
      </Section>

      <Section title="Consejos y trucos">
        <TileGrid columns={4} items={TIPS.map((tip) => ({ title: tip.title, body: tip.body }))} />
      </Section>

      <Prose paper className="max-w-none md:columns-2 md:gap-10 md:[&>*]:break-inside-avoid">
        <div className="space-y-2">
          <h2>Cómo se validan las palabras</h2>
          <p>
            Cada envío se compara con el diccionario español en vivo. Acentos fuera, ñ dentro. Si CASA está, cuenta
            para ti y aparece en el feed de la sala. Si inventas CASX, 0 puntos — igual para el rival. Puedes
            consultar el <Link href={`/${locale}/words`}>diccionario de palabras</Link> o el{' '}
            <Link href={`/${locale}/anagram`}>resolvedor de anagramas</Link> antes de la partida.
          </p>
        </div>
        <div className="space-y-2 pt-4 md:pt-0">
          <h2>Objetivo</h2>
          <p>
            En el Scrabble clásico el objetivo es colocar fichas en un tablero 15×15 y vaciar el atril. En{' '}
            <strong>scrabble online español multijugador</strong> en LexiClash el objetivo es otro: encontrar más
            palabras válidas que el resto de la sala en la misma cuadrícula, en 90 segundos. Gana el marcador más
            alto, no la última ficha.
          </p>
        </div>
        <div className="space-y-2 pt-4">
          <h2>Dificultad</h2>
          <p>
            Contra humanos no hay niveles: el tablero es el mismo. Si practicas solo, hay bots fácil / medio /
            difícil en <Link href={`/${locale}/quick-play`}>modo individual</Link>. No es una IA de Scrabble 15×15
            (Minijuegos, Locura de Letras): busca en la misma rejilla que tú, a distinta velocidad.
          </p>
        </div>
        <div className="space-y-2 pt-4">
          <h2>Fin de la partida</h2>
          <p>
            Se acaba el reloj (90 s por defecto en Clásico) y el marcador se congela. No se vacía una bolsa ni se restan las
            fichas del atril. Empate: mismo tablero, misma ronda — gana quien encontró más. Luego creas otra sala o
            cambias de modo.
          </p>
        </div>
        <div className="space-y-2 pt-4">
          <h2>Gameplays: la partida es en vivo</h2>
          <p>
            Minijuegos tiene un apartado de gameplays para su Scrabble contra la computadora. Aquí no hay vídeo
            embebido ni grabación que mirar. La partida multijugador es la sala: abres{' '}
            <Link href={`/${locale}/multiplayer`}>Crear sala</Link>, pegas el enlace y ves el marcador de tus amigos
            en la misma cuadrícula. No es un gameplay de un extraño contra una IA.
          </p>
        </div>
        <div className="space-y-2 pt-4">
          <h2>Diccionario medido (dato propio)</h2>
          <p>
            Minijuegos, JuegoSpot y Locura de Letras no publican el tamaño real de su léxico. El nuestro se mide
            igual que el validador en vivo:{' '}
            <Link href={`/${locale}/words`}>más de {ES_DICT_FLOOR} palabras en español</Link>, Set deduplicado, no
            un <code>wc -l</code> del archivo fuente. Suelo redondeado: el Set crece cuando se aprueban palabras de
            la comunidad.
          </p>
          <p>
            Cifra: <strong>{ES_DICT_FLOOR}+</strong> en español. Inglés, hebreo, sueco, japonés y ruso tienen su
            propio Set — seis diccionarios, no uno traducido.
          </p>
        </div>
      </Prose>

      <Section
        title="Fichas de letras"
        intro="El Scrabble en español (FISE) paga por ficha: la Ñ vale 8, la Z vale 10, CH/LL/RR son fichas propias. LexiClash no tiene atril. La Ñ es una letra más; lo que paga es la longitud (tabla de arriba)."
      >
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <CompareTable
              highlight={2}
              columns={['Letra', 'Scrabble ES', 'LexiClash']}
              rows={SPANISH_TILES.map((row) => [row.tile, row.scrabble, row.lexiclash])}
              captionHidden
              caption="Valor de las fichas del Scrabble en español frente a LexiClash."
            />
          </div>
          <div className="flex flex-col gap-3">
            <details className="group rounded-neo-lg border-3 border-neo-black bg-neo-cream text-neo-black shadow-hard-lg">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <h3 className={H3}>Distribución de las {SPANISH_BAG_TOTAL} fichas en español</h3>
                <Plus aria-hidden className="h-8 w-8 shrink-0 rounded-md border-2 border-neo-black bg-neo-yellow p-1 group-open:rotate-45 motion-safe:transition-transform" strokeWidth={3} />
              </summary>
              <div className="flex flex-col gap-3 px-4 pb-4">
            <p className="leading-relaxed">
              Locura de Letras publica la bolsa del Scrabble de tablero. Esta es la edición castellana de 100 fichas
              (fuera de Norteamérica): la A sale 12 veces y vale 1; la Z sale una vez y vale 10; hay 2 comodines. No
              es la bolsa de LexiClash — aquí no se reparten fichas. Sirve para comparar, no para jugar nuestra
              ronda.
            </p>
            <CompareTable
              highlight={-1}
              columns={['Ficha', 'Cuántas', 'Puntos Scrabble']}
              rows={SPANISH_BAG.map((row) => [row.tile, row.count, row.points])}
              caption="Distribución pública de las 100 fichas del Scrabble en español. No es el atril de LexiClash."
            />
              </div>
            </details>
          </div>
        </div>
      </Section>

      <Section
        title="Casillas de bonificación"
        intro="En el tablero 15×15 de Locura de Letras y de Minijuegos la puntuación no es solo la ficha: hay casillas que doblan o triplican. Por eso su sección de puntuación habla de colocación, no de longitud."
      >
        <TileGrid columns={4} items={BONUS_SQUARES.map((sq) => ({ title: `${sq.name} (${sq.mark})`, body: sq.effect }))} />
        <Prose>
          <p>
            En <strong>scrabble online español multijugador</strong> en LexiClash esas casillas no existen. Todos
            juegan a la vez sobre la misma cuadrícula: una casilla doble sería una carrera al mismo recuadro, no una
            decisión. Lo que paga es la longitud (tabla de arriba). Las reglas están en{' '}
            <Link href={`/${locale}/rules`}>las reglas</Link>.
          </p>
        </Prose>
      </Section>

      <section
        data-seo="teacher-room"
        className="grid gap-6 rounded-neo-lg border-3 border-neo-black bg-neo-yellow p-6 text-neo-black shadow-hard-xl sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end"
      >
        <div className="flex flex-col gap-3 leading-relaxed">
          <h2 className="font-neo-display text-2xl font-bold leading-tight sm:text-3xl">
            Para profesores: una clase entera en una sala
          </h2>
          <p>
            Locura de Letras y Minijuegos enfrentan a un alumno contra el ordenador. El Internet Scrabble Club es
            multijugador, pero pide cuenta y un cliente. Ninguno sienta a una clase.
          </p>
          <p>
            En LexiClash el profesor pulsa Crear sala y proyecta el enlace o el QR. Hasta 50 estudiantes entran en la
            misma cuadrícula, en español (ñ incluida), sin email de alumno y sin app — vale en el navegador del
            Chromebook o del móvil. La ronda dura 90 segundos, así que cabe entre dos explicaciones.
          </p>
          <p>
            El Internet Scrabble Club publica un contador de jugadores conectados a su lobby. Una sala de LexiClash es
            privada: la prueba es el marcador en vivo de quien abrió tu enlace, no un número de un club ajeno.
          </p>
        </div>
        <LinkPills
          items={[
            { href: `/${locale}/multiplayer`, label: 'Crear la sala de la clase' },
            { href: `/${locale}/education`, label: 'Centro para profesores' },
          ]}
        />
      </section>

      <Section title="Controles del juego">
        <TileGrid variant="paper" items={CONTROLS.map((c) => ({ title: c.device, body: c.how }))} />
      </Section>

      <Section title="¿Qué juegos son parecidos a Scrabble Online?">
        <TileGrid variant="paper" columns={4} items={SIMILAR_GAMES.map((g) => ({ title: g.name, body: g.vs }))} />
      </Section>
    </>
  );
}
