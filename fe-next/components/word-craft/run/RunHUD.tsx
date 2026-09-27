'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PowerCard } from '@/lib/word-craft/run/powerCards';
import { ROUND_COUNT } from '@/lib/word-craft/run/runTargets';
import RunProgressMeter from './RunProgressMeter';

interface RunHUDProps {
  round: number;
  target: number;
  score: number;
  runTotal: number;
  activeCards: PowerCard[];
  tilesRemaining: number;
}

export function RunHUD({ round, target, score, runTotal, activeCards, tilesRemaining }: RunHUDProps) {
  const { t } = useLanguage();
  // Mid-round a player has no way to recall what an active power does short of
  // losing their board — tap the chip to reveal the same desc CardPickScreen showed.
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2 rounded-neo border-neo bg-neo-navy-light p-3 shadow-hard">
      <div className="flex items-center justify-between font-neo-display text-neo-white">
        <span>{t('wordcraft.run.round', { n: round, total: ROUND_COUNT })}</span>
        <span className="text-sm">{t('wordcraft.run.runTotal')}: {runTotal}</span>
      </div>
      <div data-wc-run-score>
        <RunProgressMeter score={score} target={target} t={t} />
      </div>
      <div className="flex items-center justify-end text-sm font-neo-body text-neo-white">
        <span>{t('wordcraft.tilesLeft')}: {tilesRemaining}</span>
      </div>
      {activeCards.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {activeCards.map((c) => {
            const isOpen = openCardId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-expanded={isOpen}
                title={t(`wordcraft.run.card.${c.id}.desc`)}
                onClick={() => setOpenCardId(isOpen ? null : c.id)}
                className="rounded-neo border-neo bg-neo-navy px-2 py-0.5 text-xs font-neo-body text-neo-cyan transition-colors hover:bg-neo-navy-light"
              >
                {t(`wordcraft.run.card.${c.id}.name`)}
                {isOpen && (
                  <span className="mt-1 block max-w-[12rem] text-start font-neo-body text-[10px] text-neo-white/80">
                    {t(`wordcraft.run.card.${c.id}.desc`)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
