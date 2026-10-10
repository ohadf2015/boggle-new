import Link from 'next/link';
import {
  EXAMPLE_GRID,
  EXAMPLE_TOTAL_POINTS,
  EXAMPLE_WORDS,
  LENGTH_SCORES,
  SIMILAR_GAMES,
  TIPS,
} from '../data';

/**
 * Headings the top-3 SERP pages rank with that this landing lacked
 * (minijuegos: cómo jugar / características / similares;
 *  solitaireparadise: consejos, fichas, validación).
 * Unique asset: a scored Spanish 4×4 from our own Classic rules + dictionary.
 */
export function SerpGapSections({ locale }: { locale: string }) {
  return (
    <>
      <section className="mb-14 max-w-3xl">
        <h2 className="mb-3 font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-3xl">
          Cómo jugar a Scrabble online en español multijugador
        </h2>
        <p className="mb-4 font-neo-body text-sm leading-relaxed text-neo-white sm:text-base">
          No hay atril de 7 fichas ni turnos. En LexiClash todos ven la misma
          cuadrícula y buscan a la vez. Eso es{' '}
          <strong className="text-neo-cyan">scrabble online español multijugador</strong>{' '}
          sin la espera: 2 a 50 jugadores, ronda de 2–3 minutos, navegador.
        </p>
        <ol className="list-decimal space-y-2 ps-5 font-neo-body text-sm leading-relaxed text-neo-white sm:text-base">
          <li>
            Entra a{' '}
            <Link href={`/${locale}/multiplayer`} className="text-neo-cyan underline">
              la sala multijugador
            </Link>{' '}
            y pulsa Crear sala — cero formularios.
          </li>
          <li>Comparte el enlace por WhatsApp. Tus amigos entran con el código, sin cuenta.</li>
          <li>
            Desliza letras adyacentes (también en diagonal). Mínimo 3 letras. Las
            más largas pagan más — mira la tabla de abajo.
          </li>
        </ol>
      </section>

      <section className="mb-14 max-w-3xl">
        <h2 className="mb-3 font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-3xl">
          ¿Cuáles son las características del juego?
        </h2>
        <ul className="grid gap-2 font-neo-body text-sm text-neo-white sm:grid-cols-2 sm:text-base">
          <li className="rounded-neo border-2 border-neo-cyan/40 bg-neo-navy-light/40 p-3">Tiempo real, no por turnos</li>
          <li className="rounded-neo border-2 border-neo-pink/40 bg-neo-navy-light/40 p-3">2–50 jugadores en una sala</li>
          <li className="rounded-neo border-2 border-neo-lime/40 bg-neo-navy-light/40 p-3">Diccionario ES 10.000+ palabras</li>
          <li className="rounded-neo border-2 border-neo-yellow/40 bg-neo-navy-light/40 p-3">8 modos, 6 idiomas, 0€</li>
          <li className="rounded-neo border-2 border-neo-purple/40 bg-neo-navy-light/40 p-3">Móvil y PC, sin app</li>
          <li className="rounded-neo border-2 border-neo-cyan/40 bg-neo-navy-light/40 p-3">Ronda media: 180 segundos</li>
        </ul>
      </section>

      <section className="mb-14">
        <h2 className="mb-2 font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-3xl">
          Ejemplo de ronda real (cuadrícula 4×4)
        </h2>
        <p className="mb-6 max-w-3xl font-neo-body text-sm leading-relaxed text-neo-white sm:text-base">
          Una partida clásica de LexiClash, no un tablero de Scrabble 15×15.
          Palabras comprobadas en nuestro diccionario español. Puntos = reglas
          clásicas de longitud (las mismas que en{' '}
          <Link href={`/${locale}/rules`} className="text-neo-yellow underline">
            las reglas
          </Link>
          ). Total de esta ronda de ejemplo:{' '}
          <strong className="text-neo-lime">{EXAMPLE_TOTAL_POINTS} puntos</strong> en
          menos de tres minutos de reloj.
        </p>

        <div className="mb-6 inline-grid grid-cols-4 gap-1 rounded-neo border-3 border-neo-black bg-neo-navy-light p-2 shadow-hard-lg">
          {EXAMPLE_GRID.flatMap((row, r) =>
            row.map((ch, c) => (
              <span
                key={`${r}-${c}-${ch}`}
                className="grid h-12 w-12 place-items-center rounded-neo border-2 border-neo-black bg-neo-yellow font-neo-display text-xl font-black text-neo-navy sm:h-14 sm:w-14 sm:text-2xl"
              >
                {ch}
              </span>
            )),
          )}
        </div>

        <div className="overflow-x-auto rounded-neo border-3 border-neo-black shadow-hard-lg">
          <table className="w-full min-w-[28rem] border-collapse bg-neo-navy-light/40 text-left">
            <caption className="sr-only">
              Palabras encontradas en la cuadrícula de ejemplo y su puntuación LexiClash.
            </caption>
            <thead>
              <tr className="border-b-3 border-neo-black">
                <th scope="col" className="p-3 font-neo-display text-xs font-black uppercase text-neo-cyan sm:p-4">
                  Palabra
                </th>
                <th scope="col" className="p-3 text-center font-neo-display text-xs font-black uppercase text-neo-white sm:p-4">
                  Letras
                </th>
                <th scope="col" className="p-3 text-center font-neo-display text-xs font-black uppercase text-neo-lime sm:p-4">
                  Puntos
                </th>
                <th scope="col" className="p-3 font-neo-display text-xs font-black uppercase text-neo-white sm:p-4">
                  Recorrido
                </th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLE_WORDS.map((row) => (
                <tr key={row.word} className="border-b-2 border-neo-white/10">
                  <th scope="row" className="p-3 font-neo-display text-sm font-black text-neo-yellow sm:p-4">
                    {row.word}
                  </th>
                  <td className="p-3 text-center font-neo-body text-sm text-neo-white sm:p-4">{row.letters}</td>
                  <td className="p-3 text-center font-neo-display text-sm font-black text-neo-lime sm:p-4">
                    {row.points}
                  </td>
                  <td className="p-3 font-neo-body text-xs text-slate-300 sm:p-4 sm:text-sm">{row.path}</td>
                </tr>
              ))}
              <tr>
                <th scope="row" className="p-3 font-neo-display text-sm font-black text-neo-white sm:p-4">
                  Total
                </th>
                <td className="p-3 text-center font-neo-body text-sm text-neo-white sm:p-4">—</td>
                <td className="p-3 text-center font-neo-display text-lg font-black text-neo-lime sm:p-4">
                  {EXAMPLE_TOTAL_POINTS}
                </td>
                <td className="p-3 font-neo-body text-xs text-slate-300 sm:p-4">8 palabras, una ronda</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-14 max-w-3xl">
        <h2 className="mb-3 font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-3xl">
          Puntuación: longitud LexiClash vs fichas de Scrabble
        </h2>
        <p className="mb-6 font-neo-body text-sm leading-relaxed text-neo-white sm:text-base">
          El Scrabble clásico paga por ficha (la Ñ vale 8, la Z vale 10). LexiClash
          paga por longitud para que la ronda quepa en 3 minutos. Misma familia de
          palabras; ritmo distinto.
        </p>
        <div className="overflow-x-auto rounded-neo border-3 border-neo-black shadow-hard-lg">
          <table className="w-full min-w-[22rem] border-collapse bg-neo-navy-light/40 text-left">
            <caption className="sr-only">
              Puntos por longitud de palabra en el modo clásico de LexiClash.
            </caption>
            <thead>
              <tr className="border-b-3 border-neo-black">
                <th scope="col" className="p-3 font-neo-display text-xs font-black uppercase text-neo-white sm:p-4">
                  Letras
                </th>
                <th scope="col" className="p-3 text-center font-neo-display text-xs font-black uppercase text-neo-lime sm:p-4">
                  Puntos LexiClash
                </th>
              </tr>
            </thead>
            <tbody>
              {LENGTH_SCORES.map((row) => (
                <tr key={row.letters} className="border-b-2 border-neo-white/10 last:border-b-0">
                  <th scope="row" className="p-3 font-neo-body text-sm font-bold text-neo-white sm:p-4">
                    {row.letters}
                  </th>
                  <td className="p-3 text-center font-neo-display text-sm font-black text-neo-lime sm:p-4">
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-14 max-w-3xl">
        <h2 className="mb-6 font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-3xl">
          Consejos y trucos
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {TIPS.map((tip) => (
            <li
              key={tip.title}
              className="rounded-neo border-3 border-neo-black bg-neo-navy-light/50 p-4 shadow-hard-sm"
            >
              <h3 className="font-neo-display text-base font-black uppercase text-neo-pink">{tip.title}</h3>
              <p className="mt-2 font-neo-body text-sm leading-relaxed text-neo-white">{tip.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-14 max-w-3xl">
        <h2 className="mb-3 font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-3xl">
          Cómo se validan las palabras
        </h2>
        <p className="font-neo-body text-sm leading-relaxed text-neo-white sm:text-base">
          Cada envío se compara con el diccionario español en vivo. Acentos
          fuera, ñ dentro. Si CASA está, cuenta para ti y aparece en el feed de
          la sala. Si inventas CASX, 0 puntos — igual para el rival. Puedes
          consultar el{' '}
          <Link href={`/${locale}/words`} className="text-neo-cyan underline">
            diccionario de palabras
          </Link>{' '}
          o el{' '}
          <Link href={`/${locale}/anagram`} className="text-neo-pink underline">
            resolvedor de anagramas
          </Link>{' '}
          antes de la partida.
        </p>
      </section>

      <section className="mb-14 max-w-3xl">
        <h2 className="mb-6 font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-3xl">
          ¿Qué juegos son parecidos a Scrabble Online?
        </h2>
        <ul className="space-y-3">
          {SIMILAR_GAMES.map((g) => (
            <li key={g.name} className="rounded-neo border-2 border-neo-white/15 bg-neo-navy-light/40 p-4">
              <h3 className="font-neo-display text-sm font-black uppercase text-neo-cyan">{g.name}</h3>
              <p className="mt-1 font-neo-body text-sm text-neo-white">{g.vs}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
