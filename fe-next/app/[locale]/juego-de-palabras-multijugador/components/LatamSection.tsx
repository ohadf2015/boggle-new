import Link from 'next/link';
import { Link2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const COUNTRIES: { name: string; tone: string }[] = [
  { name: 'México', tone: 'bg-neo-lime' },
  { name: 'Argentina', tone: 'bg-neo-cyan' },
  { name: 'Colombia', tone: 'bg-neo-yellow' },
  { name: 'Chile', tone: 'bg-neo-pink' },
  { name: 'Perú', tone: 'bg-neo-orange' },
  { name: 'Ecuador', tone: 'bg-neo-lime' },
  { name: 'Uruguay', tone: 'bg-neo-cyan' },
  { name: 'España', tone: 'bg-neo-yellow' },
];

function GroupChat() {
  return (
    <div
      data-group-chat
      aria-hidden="true"
      className="mx-auto w-full max-w-sm rotate-1 overflow-hidden rounded-neo-lg border-3 border-neo-black bg-neo-navy shadow-hard-xl"
    >
      <div className="flex items-center gap-2 border-b-3 border-neo-black bg-brand-whatsapp px-4 py-3 text-neo-black">
        <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-neo-black bg-neo-cream">
          <MessageCircle className="h-4 w-4" />
        </span>
        <span className="font-neo-display text-sm font-black">El grupo</span>
      </div>
      <div className="space-y-3 p-4 font-neo-body text-sm sm:p-5 sm:text-base">
        <div className="ms-auto max-w-[85%] rounded-neo border-2 border-neo-black bg-neo-cream p-2.5 text-neo-black shadow-hard-sm">
          <p className="font-bold">¿Una partida rápida? Entren con su apodo</p>
          <p className="mt-1.5 flex items-center gap-1.5 rounded border-2 border-neo-black bg-neo-lime px-2 py-1 font-black">
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            lexiclash.live
          </p>
        </div>
        <p className="max-w-[70%] rounded-neo border-2 border-neo-black bg-neo-navy-light p-2.5 font-bold text-neo-white shadow-hard-sm">
          ¡Voy!
        </p>
        <p className="max-w-[70%] rounded-neo border-2 border-neo-black bg-neo-navy-light p-2.5 font-bold text-neo-white shadow-hard-sm">
          Yo también, ya entré
        </p>
      </div>
    </div>
  );
}

export function LatamSection({ locale }: { locale: string }) {
  return (
    <section
      className="relative rounded-neo-lg border-3 border-neo-black bg-neo-cream p-5 pt-8 text-neo-black shadow-hard-xl sm:p-8 sm:pt-10"
      data-seo="latam"
    >
      <span
        aria-hidden="true"
        className="absolute -top-4 start-5 inline-block -rotate-2 rounded-neo border-3 border-neo-black bg-brand-whatsapp px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-black shadow-hard"
      >
        Latinoamérica y España
      </span>
      <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
        <div>
          <h2 className="mb-4 font-neo-display text-2xl font-bold leading-tight text-balance sm:text-3xl">
            Juegos de palabras con amigos, desde el celular y sin descargar nada
          </h2>
          <ul data-country-chips aria-hidden="true" className="mb-5 flex flex-wrap gap-2">
            {COUNTRIES.map((c, i) => (
              <li
                key={c.name}
                className={cn(
                  'rounded-neo border-2 border-neo-black px-2.5 py-1 font-neo-display text-xs font-bold uppercase tracking-wide text-neo-black',
                  c.tone,
                  i % 2 === 0 ? '-rotate-1' : 'rotate-1'
                )}
              >
                {c.name}
              </li>
            ))}
          </ul>
          <div className="space-y-3 leading-relaxed [&_a]:font-bold [&_a]:underline [&_a]:decoration-neo-pink [&_a]:decoration-2 [&_a]:underline-offset-2">
            <p>
              Si buscabas algo como <strong>Palabras con amigos</strong> pero sin
              esperar un día entero a que el otro haga su jugada, aquí todo pasa en vivo. Todos ven la misma
              cuadrícula al mismo tiempo y la ronda se termina en dos o tres minutos. Se abre en el navegador
              del celular o de la compu, así que no hace falta bajar ninguna app ni crearse una cuenta.
            </p>
            <p>
              Juega gente de México, Argentina, Colombia, Chile, Perú, Ecuador, Uruguay y España. Lo más común es armar una partida rápida con el grupo: creas la sala, mandas el enlace
              al grupo de WhatsApp y cada quien entra con un apodo. También funciona en una videollamada,
              compartiendo pantalla para que todos vean el marcador.
            </p>
            <p>
              <Link href={`/${locale}/multiplayer`}>
                Arma una sala para tu grupo
              </Link>{' '}
              o, si hoy juegas solo, prueba{' '}
              <Link href={`/${locale}/daily`}>
                el reto diario
              </Link>
              , que es el mismo tablero para todos los jugadores del mundo.
            </p>
          </div>
        </div>
        <GroupChat />
      </div>
    </section>
  );
}
