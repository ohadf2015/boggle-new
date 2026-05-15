'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { PowerCard } from '@/lib/word-craft/run/powerCards';
import { CASCADE_ROUND_COUNT } from '@/lib/word-craft/cascade/roundTargets';
import { FireRowOverlay } from './FireRowOverlay';

export interface CascadeHUDProps {
  round: number;
  target: number;
  score: number;
  runTotal: number;
  activeCards: PowerCard[];
  fireRow: number;
  fireTotalRows: number;
  comboCount: number;
}

export function CascadeHUD({
  round,
  target,
  score,
  runTotal,
  activeCards,
  fireRow,
  fireTotalRows,
  comboCount,
}: CascadeHUDProps) {
  const { t } = useLanguage();
  return (
    <div
      data-testid="cascade-hud"
      className="flex flex-col gap-2 rounded-neo border-neo border-black bg-neo-navy-light p-3 shadow-hard"
    >
      <div className="flex items-center justify-between font-neo-display text-neo-cream">
        <span>{t('wordcraft.run.round', { n: round, total: CASCADE_ROUND_COUNT })}</span>
        <span data-wc-cascade-score data-wc-score-chip>
          {t('wordcraft.run.score')}: <span className="text-neo-lime">{score}</span> / {target}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm font-neo-body text-neo-white/80">
        <span>{t('wordcraft.run.runTotal')}: {runTotal}</span>
        <FireRowOverlay fireRow={fireRow} totalRows={fireTotalRows} />
      </div>
      {comboCount > 0 && (
        <div
          data-testid="cascade-hud-combo"
          className="rounded-neo border-neo border-black bg-neo-pink px-2 py-1 text-center font-neo-display text-sm uppercase text-neo-cream shadow-hard-sm"
        >
          {t('wordcraft.cascade.combo.chain', { n: comboCount })}
        </div>
      )}
      {activeCards.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {activeCards.map((c) => (
            <span
              key={c.id}
              className="rounded-neo border-neo bg-neo-navy px-2 py-0.5 text-xs font-neo-body text-neo-cyan"
            >
              {t(`wordcraft.cascade.card.${c.id}.name`, {
                defaultValue: t(`wordcraft.run.card.${c.id}.name`, { defaultValue: c.id }),
              })}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
