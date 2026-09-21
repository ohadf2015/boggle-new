'use client';

/**
 * Found-word chips: each new word pops in, coloured by how hard it hit (normal / BIG / CRIT).
 * The newest chip is bigger and glows; the level's longest word (6+ letters) keeps a crown.
 */
import { memo } from 'react';
import { Crown } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { hitTier } from './hitTier';

const CHIP: Record<ReturnType<typeof hitTier>, string> = {
  hit: 'bg-neo-cream',
  big: 'bg-neo-cyan',
  crit: 'bg-neo-yellow',
};

const BEST_MIN = 6;
const len = (w: string) => Array.from(w).length;

function FoundWords({ words, points }: { words: string[]; points: number[] }) {
  const { t } = useLanguageSafe();
  // First word to reach the longest length wins the crown.
  const best = words.reduce<string | null>((b, w) => (len(w) >= BEST_MIN && len(w) > (b ? len(b) : 0) ? w : b), null);
  // One row, newest first: a growing list must never push the board (or spill off-screen).
  const start = Math.max(0, words.length - 10);
  const recent = words.slice(start).map((w, i) => ({ w, pts: points[start + i] ?? 0 })).reverse();
  return (
    <ul className="mt-2 flex flex-nowrap items-center gap-1.5 [justify-content:safe_center] overflow-hidden h-8 shrink-0" aria-label={t('adventurePlay.foundWords')}>
      {recent.map(({ w, pts }, i) => {
        const latest = i === 0;
        return (
          <li key={w} data-latest={latest ? 'true' : undefined}
            className={cn('adv-chip-in shrink-0 inline-flex items-center gap-1 rounded-full border-2 border-black text-black font-bold uppercase shadow-[2px_2px_0_#000]',
              latest ? 'adv-chip-latest text-sm px-2.5 py-0.5' : 'text-xs px-2 py-0.5 opacity-90', CHIP[hitTier(w, pts)])}>
            {w === best && <Crown data-testid="adv-best-word" className="w-3.5 h-3.5 fill-neo-pink" aria-label={t('adventurePlay.juice.newBest')} />}
            {w} <span dir="ltr" className="opacity-70 tabular-nums">+{pts}</span>
          </li>
        );
      })}
    </ul>
  );
}

// memo: the fight re-renders the level 5x/s; this only changes when a word lands.
export default memo(FoundWords);
