import Link from 'next/link';

type AnchorVariant = 'words' | 'anagram' | 'daily' | 'leaderboard' | 'blog' | 'home';

interface Props {
  locale: string;
  anchorVariant: AnchorVariant;
}

const ANCHORS: Record<AnchorVariant, { text: string; tagline: string }> = {
  words: {
    text: 'Juega Scrabble en español multijugador online',
    tagline: 'Alternativa gratuita — sin descargas, hasta 20 jugadores en tiempo real',
  },
  anagram: {
    text: 'Alternativa a Scrabble en línea — gratis y sin app',
    tagline: 'Forma palabras con tus amigos en tiempo real, directo desde el navegador',
  },
  daily: {
    text: 'Scrabble online en español — multijugador en tiempo real',
    tagline: 'Partidas rápidas con 2-20 jugadores. Gratis. Sin descarga ni registro',
  },
  leaderboard: {
    text: 'Scrabble competitivo online: sube en el ranking en tiempo real',
    tagline: 'Compite con 2-20 jugadores en español. Rankings diarios, semanales y de todos los tiempos.',
  },
  blog: {
    text: 'Prueba la alternativa a Scrabble multijugador en español',
    tagline: 'Crea sala, invita por enlace y juega gratis en tiempo real — sin descarga ni registro.',
  },
  home: {
    text: 'Jugar Scrabble Online Gratis en Español',
    tagline: 'Multijugador con amigos en tiempo real — sin registro, sin descarga. ¡Empieza ya!',
  },
};

export function EsScrabbleCrossLink({ locale, anchorVariant }: Props) {
  if (locale !== 'es') return null;
  const { text, tagline } = ANCHORS[anchorVariant];
  return (
    <aside className="my-8 rounded-neo border-3 border-neo-pink bg-neo-navy-light p-5 shadow-hard">
      <Link
        href="/es/juego-de-palabras-multijugador"
        className="block group"
      >
        <h3 className="font-neo-display text-lg font-black text-neo-pink underline decoration-2 underline-offset-4 group-hover:text-neo-white transition-colors">
          {text}
        </h3>
        <p className="mt-2 text-sm text-slate-300">{tagline}</p>
      </Link>
    </aside>
  );
}
