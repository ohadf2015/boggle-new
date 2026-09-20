'use client';

/** Run recap: level pips, gold, best word, relics carried. */
import { motion, useReducedMotion } from 'framer-motion';
import { Skull, Crown } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { LEVELS_PER_WORLD } from '@/lib/adventure/play/levels';
import type { RunSummary } from './runSummary';
import { COIN_ART } from './art';
import RelicBar from './RelicBar';
import { cn } from '@/lib/utils';

export default function RunStats({ summary, fell }: { summary: RunSummary; fell: boolean }) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const pips = Array.from({ length: LEVELS_PER_WORLD }, (_, i) => i + 1);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-2xl border-[3px] border-black bg-black/40 p-3 shadow-[4px_4px_0_#000]">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">{t('adventurePlay.loot.levelsCleared')}</span>
          <span className="font-neo-display text-2xl font-bold tabular-nums">{summary.levelsCleared}/{LEVELS_PER_WORLD}</span>
        </div>
        <ol className="mt-2 flex gap-1.5">
          {pips.map((n) => {
            const done = n <= summary.levelsCleared;
            const fatal = fell && n === summary.levelsCleared + 1;
            return (
              <motion.li key={n} initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + n * 0.07, type: 'spring', stiffness: 500, damping: 18 }}
                className={cn('grid h-8 flex-1 place-items-center rounded-lg border-[3px] border-black text-xs font-bold',
                  done ? 'bg-neo-lime text-black' : fatal ? 'bg-neo-pink text-black' : 'bg-white/10 text-neo-cream/60')}>
                {fatal ? <Skull className="h-4 w-4" /> : n === LEVELS_PER_WORLD ? <Crown className="h-4 w-4" /> : n}
              </motion.li>
            );
          })}
        </ol>
      </div>

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

      <div className="rounded-2xl border-[3px] border-black bg-black/40 p-3 shadow-[4px_4px_0_#000]">
        <div className="text-xs font-bold uppercase tracking-wider opacity-80">{t('adventurePlay.loot.relicsTitle')}</div>
        {summary.relics.length > 0
          ? <RelicBar relics={summary.relics} size="md" className="mt-1" />
          : <div className="mt-1 text-sm font-semibold opacity-70">{t('adventurePlay.loot.noRelics')}</div>}
      </div>
    </div>
  );
}
