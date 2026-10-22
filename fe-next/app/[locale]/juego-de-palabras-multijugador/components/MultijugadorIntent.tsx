import Link from 'next/link';

/**
 * Above-the-fold intent block for the exact GSC query
 * "scrabble online español multijugador". Keep neo-brutalist chrome;
 * no new deps. The H2 + first sentence must contain the query.
 */
export function MultijugadorIntent({ locale }: { locale: string }) {
  return (
    <section className="mb-14 max-w-3xl" data-seo="multijugador-intent">
      <h2 className="mb-3 font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-3xl">
        ¿Qué es scrabble online español multijugador?
      </h2>
      <div className="space-y-3 font-neo-body text-sm leading-relaxed text-neo-white sm:text-base">
        <p>
          <strong className="text-neo-cyan">Scrabble online español multijugador</strong> es
          jugar una partida de palabras en español con otras personas a la vez — no contra
          una IA, no por turnos de horas. En LexiClash todos ven la misma cuadrícula y
          buscan palabras en tiempo real: 2 a 50 jugadores, ronda de 2–3 minutos, en el
          navegador.
        </p>
        <p>
          Minijuegos, JuegoSpot y Locura de Letras son Scrabble contra el ordenador. El
          Club de Scrabble de Internet sí es multijugador, pero pide cuenta y un cliente.
          Aquí: pulsa Crear sala, pega el enlace en WhatsApp, y la sala se llena. Sin app,
          sin registrarse, diccionario español (Ñ incluida).
        </p>
        <p>
          ¿Solo quieres practicar? Hay bots. ¿Quieres la partida de verdad?{' '}
          <Link href={`/${locale}/multiplayer`} className="text-neo-pink underline">
            Abre el modo multijugador
          </Link>{' '}
          y comparte el enlace.
        </p>
      </div>
    </section>
  );
}
