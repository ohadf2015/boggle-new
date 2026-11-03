import Link from 'next/link';

export function DosJugadoresSection({ locale }: { locale: string }) {
  return (
    <section className="mb-14 max-w-3xl" data-seo="dos-jugadores">
      <h2 className="mb-3 font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-3xl">
        Scrabble online 2 jugadores: una partida solo con un amigo
      </h2>
      <div className="space-y-3 font-neo-body text-sm leading-relaxed text-neo-white sm:text-base">
        <p>
          Para jugar <strong className="text-neo-cyan">scrabble online 2 jugadores</strong> no hace
          falta llenar una sala: con dos basta. Creas la sala, le mandas el enlace (o el código, o el
          QR) a tu amigo y, en cuanto entra, empieza la partida. Uno puede estar en el móvil y el otro en el
          ordenador, en el mismo sofá o en otro país.
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            <Link href={`/${locale}/multiplayer`} className="text-neo-pink underline">
              Abre el modo multijugador
            </Link>{' '}
            y pulsa Crear sala.
          </li>
          <li>Pásale el enlace por WhatsApp. Tu amigo entra con un apodo, sin registrarse.</li>
          <li>
            Los dos ven la misma cuadrícula y buscan palabras a la vez. Nada de esperar turno: la
            ronda dura 2–3 minutos y al final el marcador dice quién ganó.
          </li>
        </ol>
        <p>
          ¿Se suma más gente? La misma sala admite hasta 50 jugadores; el enlace sirve igual. ¿No hay
          nadie libre ahora? Practica contra los bots y guarda el duelo para luego.
        </p>
        <p>
          Como todo pasa en el navegador, funciona desde Argentina, México, España o cualquier otro
          país, con el diccionario en español (Ñ incluida). Si tu amigo prefiere otro idioma, LexiClash
          también se juega en inglés y en otros cuatro idiomas.
        </p>
      </div>
    </section>
  );
}
