import Link from 'next/link';

type AnchorVariant = 'words' | 'anagram' | 'leaderboard' | 'home';

interface Props {
  locale: string;
  anchorVariant: AnchorVariant;
}

const ANCHORS: Record<AnchorVariant, { text: string; tagline: string }> = {
  words: {
    text: 'Spela Scrabble online på svenska — gratis multiplayer',
    tagline: 'Wordfeud-alternativ direkt i webbläsaren. Skapa rum, bjud in med länk, tävla i realtid.',
  },
  anagram: {
    text: 'Scrabble-alternativ på svenska: spela med vänner online',
    tagline: 'Bygg ord tillsammans i realtid — utan registrering, utan nedladdning.',
  },
  leaderboard: {
    text: 'Tävla i Scrabble online på svenska — globala topplistor',
    tagline: 'Dagliga, veckovisa och alltime-rankningar. Gratis multiplayer för 2-20 spelare.',
  },
  home: {
    text: 'Spela Scrabble Online Svenska Gratis',
    tagline: 'Multiplayer ordspel med vänner i realtid — utan registrering, utan nedladdning.',
  },
};

export function SvScrabbleCrossLink({ locale, anchorVariant }: Props) {
  if (locale !== 'sv') return null;
  const { text, tagline } = ANCHORS[anchorVariant];
  return (
    <aside className="my-8 rounded-neo border-3 border-neo-pink bg-neo-navy-light p-5 shadow-hard">
      <Link
        href="/sv/swedish-multiplayer-word-game"
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
