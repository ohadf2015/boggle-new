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
    <aside className="my-8 rounded-neo-lg border-3 border-neo-black bg-neo-cream p-5 text-neo-black shadow-hard-xl">
      <Link
        href="/sv/swedish-multiplayer-word-game"
        className="block group"
      >
        <h3 className="font-neo-display text-lg font-black text-neo-black underline decoration-neo-pink decoration-4 underline-offset-4">
          {text}
        </h3>
        <p className="mt-2 text-sm text-neo-black/80">{tagline}</p>
      </Link>
    </aside>
  );
}
