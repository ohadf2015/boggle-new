import Link from 'next/link';

type AnchorVariant = 'words' | 'anagram' | 'leaderboard';

interface Props {
  locale: string;
  anchorVariant: AnchorVariant;
}

const ANCHORS: Record<AnchorVariant, { text: string; tagline: string }> = {
  words: {
    text: 'משחקו סקראבל בעברית אונליין — חינם רב משתתפים',
    tagline: 'אלטרנטיבה לסקראבל היישר מהדפדפן. צרו חדר, הזמינו בקישור והתחרו בזמן אמת.',
  },
  anagram: {
    text: 'אלטרנטיבה לסקראבל בעברית — שחקו עם חברים אונליין',
    tagline: 'בנו מילים יחד בזמן אמת, ללא הרשמה, ללא הורדה.',
  },
  leaderboard: {
    text: 'התחרו בסקראבל בעברית אונליין — טבלאות מובילים עולמיות',
    tagline: 'דירוגים יומיים, שבועיים וכלליים. רב משתתפים חינם לעד 20 שחקנים.',
  },
};

export function HeScrabbleCrossLink({ locale, anchorVariant }: Props) {
  if (locale !== 'he') return null;
  const { text, tagline } = ANCHORS[anchorVariant];
  return (
    <aside
      dir="rtl"
      className="my-8 rounded-neo border-3 border-neo-pink bg-neo-navy-light p-5 shadow-hard"
    >
      <Link
        href="/he/hebrew-multiplayer-word-game"
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
