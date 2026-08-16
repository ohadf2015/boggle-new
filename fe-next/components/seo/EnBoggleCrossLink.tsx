import Link from 'next/link';

type AnchorVariant = 'words' | 'anagram' | 'daily' | 'leaderboard' | 'blog' | 'home';

interface Props {
  locale: string;
  anchorVariant: AnchorVariant;
}

const ANCHORS: Record<AnchorVariant, { text: string; tagline: string }> = {
  words: {
    text: 'Play Boggle Online Free — Solo or Multiplayer',
    tagline: 'No download, no signup. Real-time word grid with 2-50 players, right in your browser.',
  },
  anagram: {
    text: 'Boggle Online — Find Words, Score, Win',
    tagline: 'Same word-grid brain, faster pace — free browser Boggle with friends or bots.',
  },
  daily: {
    text: 'Play Boggle Online Free — New Grid Every Time',
    tagline: 'Real-time multiplayer or solo challenge. No account, no download.',
  },
  leaderboard: {
    text: 'Boggle Online — Climb the Leaderboard',
    tagline: 'Free real-time word grid battles, 2-50 players, daily and all-time rankings.',
  },
  blog: {
    text: 'Try Boggle Online Free — No Download',
    tagline: 'Create a room in seconds, invite friends, play in your browser.',
  },
  home: {
    text: 'Play Boggle Online Free',
    tagline: 'Solo vs bots or real-time multiplayer — no signup, no download. Start now.',
  },
};

export function EnBoggleCrossLink({ locale, anchorVariant }: Props) {
  if (locale !== 'en') return null;
  const { text, tagline } = ANCHORS[anchorVariant];
  return (
    <aside className="my-8 rounded-neo border-3 border-neo-cyan bg-neo-navy-light p-5 shadow-hard">
      <Link
        href="/en/play-boggle-online-free"
        className="block group"
      >
        <h3 className="font-neo-display text-lg font-black text-neo-cyan underline decoration-2 underline-offset-4 group-hover:text-neo-white transition-colors">
          {text}
        </h3>
        <p className="mt-2 text-sm text-slate-300">{tagline}</p>
      </Link>
    </aside>
  );
}
