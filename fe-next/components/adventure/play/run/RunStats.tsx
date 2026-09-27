'use client';

/**
 * Run recap: a pip per NODE of the act map, gold, best word, relics carried.
 *
 * The depth is the map's (`MAP_ROWS`), not the world's old level list — a run
 * walks one node per row, so a completed world used to read "8/7".
 */
import { motion, useReducedMotion } from 'framer-motion';
import { Skull, Crown } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { MAP_ROWS } from '@/lib/adventure/play/runMap';
import type { RunSummary } from './runSummary';
import { COIN_ART } from './art';
import RelicBar from './RelicBar';
import { cn } from '@/lib/utils';

interface Props {
  summary: RunSummary;
  fell: boolean;
  /**
   * Split for the screens that also show `RunLedger`: `'ledger'` is the pip row
   * alone and `'relics'` the relic shelf alone, so the ledger can sit BETWEEN
   * them. Printing gold / best word twice — once with a point value and once
   * without — is the drift Class 3 warns about, so those cards are `'full'`
   * only, and at 390px the two dropped cards are what kept the final score
   * above the fold.
   */
  variant?: 'full' | 'ledger' | 'relics';
  /**
   * World + step, so tapping a relic on the recap answers the same question it
   * answers in the HUD — what did this thing pay me THIS RUN? Without it the
   * shelf is art with a dead tooltip.
   */
  runCtx?: { world?: number | null; step?: number | null } | null;
}

/**
 * One pip per node of the act map — how deep the run went, and (on a death)
 * which node ended it. Exported because `RunLedger` hosts the same row inside
 * its own card on the result screens: both endings must answer "how far did I
 * get?" in one shape (Class 3), and at 390px a SECOND card around this row was
 * what pushed the final score under the action bar.
 */
export function RunPips({ cleared, fell }: { cleared: number; fell: boolean }) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const pips = Array.from({ length: MAP_ROWS }, (_, i) => i + 1);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-wider opacity-80">{t('adventurePlay.loot.levelsCleared')}</span>
        <span className="font-neo-display text-xl font-bold tabular-nums">{cleared}/{MAP_ROWS}</span>
      </div>
      <ol className="mt-1.5 flex gap-1.5">
        {pips.map((n) => {
          const done = n <= cleared;
          const fatal = fell && n === cleared + 1;
          return (
            <motion.li key={n} initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + n * 0.07, type: 'spring', stiffness: 500, damping: 18 }}
              className={cn('grid h-7 flex-1 place-items-center rounded-lg border-[3px] border-black text-xs font-bold',
                done ? 'bg-neo-lime text-black' : fatal ? 'bg-neo-pink text-black' : 'bg-white/10 text-neo-cream/60')}>
              {fatal ? <Skull className="h-4 w-4" /> : n === MAP_ROWS ? <Crown className="h-4 w-4" /> : n}
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

export default function RunStats({ summary, fell, variant = 'full', runCtx }: Props) {
  const { t } = useLanguageSafe();
  return (
    <div className="flex flex-col gap-2.5">
      {variant !== 'relics' && (
      <div className="rounded-2xl border-[3px] border-black bg-black/40 p-3 shadow-[4px_4px_0_#000]">
        <RunPips cleared={summary.levelsCleared} fell={fell} />
      </div>
      )}

      {variant === 'full' && (
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border-[3px] border-black bg-black/40 p-3 shadow-[4px_4px_0_#000]">
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">{t('adventurePlay.loot.goldEarned')}</div>
          <div className="mt-1 inline-flex items-center gap-1.5 font-neo-display text-2xl font-bold tabular-nums text-neo-yellow">
            {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
            <img src={COIN_ART} alt="" className="h-7 w-7" /> {summary.gold}
          </div>
        </div>
        <div className="min-w-0 rounded-2xl border-[3px] border-black bg-black/40 p-3 shadow-[4px_4px_0_#000]">
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">{t('adventurePlay.loot.bestWord')}</div>
          {summary.bestWord ? (
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="truncate font-neo-display text-xl font-bold uppercase">{summary.bestWord.word}</span>
              <span className="shrink-0 text-sm font-bold text-neo-lime tabular-nums">+{summary.bestWord.pts}</span>
            </div>
          ) : <div className="mt-1 font-neo-display text-xl font-bold opacity-50">—</div>}
        </div>
      </div>
      )}

      {/* The relic SHELF, never a sentence. The bar keeps an icon strip pinned
          from the first floor into its victory screen; swapping ours for the
          grey line "No relics this run" both broke that shape and read as an
          apology. An empty run shows the sockets it walked past. */}
      {variant !== 'ledger' && (
      <div data-testid="relic-shelf" className="rounded-2xl border-[3px] border-black bg-black/40 px-3 py-2 shadow-[4px_4px_0_#000]">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">{t('adventurePlay.loot.relicsTitle')}</span>
          <span className="font-neo-display text-base font-bold tabular-nums opacity-90">{summary.relics.length}</span>
        </div>
        {summary.relics.length > 0
          ? <RelicBar relics={summary.relics} size="md" className="-mt-1" runCtx={runCtx} />
          : (
            <ul className="mt-1.5 flex gap-1.5" aria-label={t('adventurePlay.loot.emptySlot')}>
              {[0, 1, 2, 3].map((i) => (
                <li key={i} data-testid="relic-socket"
                  className="h-9 flex-1 rounded-lg border-[3px] border-dashed border-neo-cream/30 bg-black/30" />
              ))}
            </ul>
          )}
      </div>
      )}
    </div>
  );
}
