'use client';

/** World view: the run in progress (step, hearts, relics, gold) with a continue button. */
import { Play } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { MAP_ROWS } from '@/lib/adventure/play/runMap';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import { Hearts } from '../RunHud';
import RelicBar from './RelicBar';
import GoldCounter from './GoldCounter';
import { cn } from '@/lib/utils';

export default function RunBanner({ run, onContinue }: { run: PublicRun; onContinue: () => void }) {
  const { t } = useLanguageSafe();
  return (
    <section className="mx-3 mt-3 rounded-2xl border-[3px] border-black bg-[#1b2a5c] p-3 text-neo-cream shadow-[4px_4px_0_#000]" data-testid="run-banner">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-wider text-neo-lime">{t('adventurePlay.loot.currentRun')}</div>
          <div className="font-neo-display text-lg font-bold leading-tight">{t('adventurePlay.loot.runStep', { step: run.step, total: MAP_ROWS })}</div>
        </div>
        <button type="button" onClick={onContinue}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border-[3px] border-black bg-neo-lime px-3 py-2 font-neo-display font-bold text-black shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none">
          <Play className="h-4 w-4 fill-black rtl:rotate-180" /> {t('adventurePlay.loot.continueRun')}
        </button>
      </div>
      <ol className="mt-2 flex gap-1" aria-hidden>
        {Array.from({ length: MAP_ROWS }, (_, i) => i + 1).map((n) => (
          <li key={n} className={cn('h-2 flex-1 rounded-full border-2 border-black',
            n < run.step ? 'bg-neo-lime' : n === run.step ? 'bg-neo-yellow' : 'bg-white/15')} />
        ))}
      </ol>
      <div className="mt-2 flex items-center gap-1.5">
        <Hearts hp={run.hp} maxHp={run.maxHp} />
        <RelicBar relics={run.relics} className="min-w-0 flex-1" />
        <GoldCounter value={run.gold} />
      </div>
    </section>
  );
}
