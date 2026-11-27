import Link from 'next/link';
import { Prose, Section } from '@/components/landing/kit';

/** The H2 and first sentence must contain the exact GSC query "scrabble online español multijugador". */
export function MultijugadorIntent({ locale }: { locale: string }) {
  return (
    <Section title="¿Qué es scrabble online español multijugador?">
      <Prose>
        <p>
          <strong>Scrabble online español multijugador</strong> es jugar una partida de palabras en español con
          otras personas a la vez — no contra una IA, no por turnos de horas. En LexiClash todos ven la misma
          cuadrícula y buscan palabras en tiempo real: 2 a 50 jugadores, rondas de 90 segundos, en el navegador.
        </p>
        <p>
          Minijuegos, JuegoSpot y Locura de Letras son Scrabble contra el ordenador. El Club de Scrabble de
          Internet sí es multijugador, pero pide cuenta y un cliente. Aquí: pulsa Crear sala, pega el enlace en
          WhatsApp, y la sala se llena. Sin app, sin registrarse, diccionario español (Ñ incluida).
        </p>
        <p>
          ¿Solo quieres practicar? Hay bots. ¿Quieres la partida de verdad?{' '}
          <Link href={`/${locale}/multiplayer`}>Abre el modo multijugador</Link> y comparte el enlace.
        </p>
      </Prose>
    </Section>
  );
}
