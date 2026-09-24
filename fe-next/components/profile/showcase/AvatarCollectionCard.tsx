'use client';

import React from 'react';
import { Gem, Lock, Shirt } from 'lucide-react';
import { RARITY_TOKENS } from '@/lib/avatar/rarity';
import type { CollectionProgress } from '@/lib/avatar/unlocks';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { getNextUnlock } from './profileShowcaseModel';

const RARITIES = ['rare', 'epic', 'legendary'] as const;

/** Avatar-part collection on the Collection tab: total, per-rarity bars, next unlock. */
export function AvatarCollectionCard({
  progress,
  level,
  onEditAvatar,
}: {
  progress: CollectionProgress;
  level: number;
  onEditAvatar?: () => void;
}): React.ReactElement {
  const { t } = useLanguage();
  const next = getNextUnlock(level);
  const pct = progress.total > 0 ? Math.round((progress.owned / progress.total) * 100) : 0;

  return (
    <div data-testid="avatar-collection-card" className="bg-neo-navy-light border-3 border-neo-black rounded-neo-lg shadow-hard-cyan p-4">
      <h2 className="flex items-center gap-2 font-neo-display font-black uppercase tracking-tight text-lg text-neo-white">
        <span className="shrink-0 w-8 h-8 flex items-center justify-center bg-neo-cyan text-neo-black border-2 border-neo-black rounded-neo shadow-hard-sm">
          <Gem className="w-4 h-4" strokeWidth={2.75} aria-hidden />
        </span>
        {t('profile.showcase.avatarCollection.title')}
      </h2>
      <p className="mt-1 text-xs text-neo-white/70 font-neo-body">{t('profile.showcase.avatarCollection.body')}</p>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="font-neo-display font-black text-2xl text-neo-cyan tabular-nums">
          {t('profile.showcase.parts', { owned: progress.owned, total: progress.total })}
        </span>
        <span className="text-xs font-black text-neo-white/60 tabular-nums">{pct}%</span>
      </div>
      <div className="mt-1 h-3 w-full bg-neo-black border-2 border-neo-black rounded-full overflow-hidden" aria-hidden>
        <div className="h-full bg-neo-cyan" style={{ width: `${pct}%` }} />
      </div>

      <p className="mt-3 mb-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-neo-white/60">
        {t('profile.showcase.avatarCollection.byRarity')}
      </p>
      <ul className="flex flex-col gap-1.5">
        {RARITIES.map(r => {
          const tok = RARITY_TOKENS[r];
          const row = progress.byRarity[r];
          const w = row.total > 0 ? Math.round((row.owned / row.total) * 100) : 0;
          return (
            <li key={r} data-testid="collection-rarity-row" data-rarity={r} className="flex items-center gap-2">
              <span className={cn('w-2.5 h-2.5 rounded-full border border-neo-black shrink-0', tok.dot)} aria-hidden />
              <span className={cn('w-20 shrink-0 text-xs font-black uppercase', tok.text)}>{t(tok.labelKey)}</span>
              <span className="flex-1 h-2 bg-neo-black/60 rounded-full overflow-hidden" aria-hidden>
                <span className={cn('block h-full rounded-full', tok.dot)} style={{ width: `${w}%` }} />
              </span>
              <span className="w-12 text-end text-xs font-bold text-neo-white tabular-nums">{row.owned}/{row.total}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-2">
        {next ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-neo-yellow">
            <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {t('profile.showcase.unlocksAt', { level: next.level })}
          </span>
        ) : <span />}
        {onEditAvatar && (
          <button
            type="button"
            onClick={onEditAvatar}
            className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-2 bg-neo-lime text-neo-black font-neo-display font-black uppercase text-sm border-2 border-neo-black rounded-neo shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px]"
          >
            <Shirt className="w-4 h-4" aria-hidden />
            {t('profile.showcase.editAvatar')}
          </button>
        )}
      </div>
    </div>
  );
}

export default AvatarCollectionCard;
