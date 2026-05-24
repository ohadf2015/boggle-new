'use client';

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
  return (
    <div className="flex flex-col gap-2 rounded-neo border-neo bg-neo-navy-light p-3 shadow-hard">
      <div className="flex items-center justify-between font-neo-display text-neo-cream">
        <span>{t('wordcraft.run.round', { n: round, total: ROUND_COUNT })}</span>
        <span className="text-sm">{t('wordcraft.run.runTotal')}: {runTotal}</span>
      </div>
      <div data-wc-run-score>
        <RunProgressMeter score={score} target={target} t={t} />
      </div>
      <div className="flex items-center justify-end text-sm font-neo-body text-neo-white/80">
        <span>{t('wordcraft.tilesLeft')}: {tilesRemaining}</span>
      </div>
      {activeCards.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {activeCards.map((c) => (
            <span
              key={c.id}
              className="rounded-neo border-neo bg-neo-navy px-2 py-0.5 text-xs font-neo-body text-neo-cyan"
            >
              {t(`wordcraft.run.card.${c.id}.name`)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
