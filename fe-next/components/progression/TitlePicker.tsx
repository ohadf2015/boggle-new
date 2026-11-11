'use client';

import { Lock, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { LEVEL_TITLES } from '@/backend/modules/xpManager';
import { getUnlockedTitles, resolveDisplayTitle, titleLabelKey } from '@/lib/titles/playerTitles';
import { cn } from '@/lib/utils';
import { TitleBadge } from './TitleBadge';
import { useChosenTitle } from './useChosenTitle';

export interface TitlePickerProps {
  userId: string;
  level: number;
  prestigeLevel?: number | null;
  achievementKeys?: readonly string[] | null;
}

function nextLockedTitle(level: number): { id: string; level: number } | null {
  for (const [min, id] of Object.entries(LEVEL_TITLES)) {
    if (id && Number(min) > level) return { id, level: Number(min) };
  }
  return null;
}

export function TitlePicker({ userId, level, prestigeLevel, achievementKeys }: TitlePickerProps) {
  const { t } = useLanguage();
  const { status, title, save, retry } = useChosenTitle(userId);
  const unlocked = getUnlockedTitles({ level, prestigeLevel, achievementKeys });
  const shown = resolveDisplayTitle({ chosenTitle: title, level });
  const next = nextLockedTitle(level);

  const pick = async (id: string | null) => {
    if (id === title) return;
    const ok = await save(id);
    if (!ok) toast.error(t('progression.titles.saveFailed'));
  };

  return (
    <section
      data-testid="title-picker"
      className="rounded-neo-lg border-3 border-neo-black bg-neo-navy-light p-3 shadow-hard"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-neo-display text-sm font-black uppercase tracking-wide text-neo-white">
          {t('progression.titles.pickerTitle')}
        </h3>
        {status === 'ready' && <TitleBadge title={shown} />}
      </div>

      {status === 'error' ? (
        <button
          type="button"
          onClick={retry}
          aria-label={t('common.retry')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neo-cyan"
        >
          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
          {t('progression.titles.loadFailed')}
        </button>
      ) : status !== 'ready' ? (
        <div className="h-8 animate-pulse rounded bg-neo-navy" />
      ) : (
        <div role="radiogroup" aria-label={t('progression.titles.pickerTitle')} className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={title === null}
            aria-label={t('progression.titles.auto')}
            onClick={() => void pick(null)}
            className={cn(
              'rounded-md border-2 border-neo-black px-2 py-1 text-[11px] font-black uppercase',
              title === null ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy text-neo-white/80',
            )}
          >
            {t('progression.titles.auto')}
          </button>
          {unlocked.map(({ id }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={title === id}
              aria-label={t(titleLabelKey(id))}
              onClick={() => void pick(id)}
              className={cn(
                'rounded-md border-2 border-neo-black px-2 py-1 text-[11px] font-black uppercase',
                title === id ? 'bg-neo-purple text-neo-white' : 'bg-neo-navy text-neo-white/80',
              )}
            >
              {t(titleLabelKey(id))}
            </button>
          ))}
        </div>
      )}

      {next && (
        <p data-testid="title-next-locked" className="mt-2 flex items-center gap-1 text-[11px] font-bold text-neo-cream/60">
          <Lock className="h-3 w-3" aria-hidden="true" />
          {t('progression.titles.nextAt', { level: next.level, title: t(titleLabelKey(next.id)) })}
        </p>
      )}
    </section>
  );
}

export default TitlePicker;
