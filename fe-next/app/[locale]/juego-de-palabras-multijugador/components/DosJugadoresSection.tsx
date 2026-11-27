import Link from 'next/link';
import { Prose, Section } from '@/components/landing/kit';

export function DosJugadoresSection({ locale }: { locale: string }) {
  return (
    <Section title="Scrabble online 2 jugadores: una partida solo con un amigo">
      <Prose>
        <p>
          Para jugar <strong>scrabble online 2 jugadores</strong> no hace falta llenar una sala: con dos basta.
          Creas la sala, le mandas el enlace (o el código, o el QR) a tu amigo y, en cuanto entra, le das a
          empezar. Uno puede estar en el móvil y el otro en el ordenador, en el mismo sofá o en otro país.
        </p>
        <ol>
          <li>
            <Link href={`/${locale}/multiplayer`}>Abre el modo multijugador</Link> y pulsa Crear sala.
          </li>
          <li>Pásale el enlace por WhatsApp. Tu amigo entra con un apodo, sin registrarse.</li>
          <li>
            Los dos ven la misma cuadrícula y buscan palabras a la vez. Nada de esperar turno: la ronda dura 90
            segundos por defecto y al final el marcador dice quién ganó.
          </li>
        </ol>
        <p>
          ¿Se suma más gente? La misma sala admite hasta 50 jugadores; el enlace sirve igual. ¿No hay nadie libre
          ahora? Practica contra los bots y guarda el duelo para luego.
        </p>
        <p>
          Como todo pasa en el navegador, funciona desde Argentina, México, España o cualquier otro país, con el
          diccionario en español (Ñ incluida). Si tu amigo prefiere otro idioma, LexiClash también se juega en
          inglés y en otros cuatro idiomas.
        </p>
      </Prose>
    </Section>
  );
}
