'use client';

import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StarterLessonPack } from '@/lib/education/starterLessonPacks';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface StarterPackRowProps {
  packs: StarterLessonPack[];
  selectedKey: string;
  recommendedKey: string;
  onSelect: (nameKey: string) => void;
  t: T;
}

/** Ready-made word packs, one already picked, so a new class never starts from a blank list. */
export function StarterPackRow({ packs, selectedKey, recommendedKey, onSelect, t }: StarterPackRowProps) {
  return (
    <div role="radiogroup" aria-labelledby="setup-pack-label" className="@container flex flex-col gap-1.5">
      <span id="setup-pack-label" className="font-neo-body text-sm font-bold text-neo-cream">
        {t('eduShell.setup.packLabel')}
      </span>
      <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
        {packs.map((pack) => {
          const on = pack.nameKey === selectedKey;
          return (
            <label
              key={pack.nameKey}
              className={cn(
                'relative flex min-h-[56px] cursor-pointer items-center gap-3 rounded-neo border-[3px] px-3 py-2 transition-[transform,colors] duration-150 active:scale-[0.98] motion-reduce:transition-none',
                'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-neo-cyan',
                on ? 'border-neo-black bg-neo-lime text-neo-black shadow-hard-sm' : 'border-neo-cream/50 text-neo-cream hover:border-neo-cream',
              )}
            >
              <input
                type="radio"
                name="setup-pack"
                value={pack.nameKey}
                data-pack={pack.nameKey}
                checked={on}
                onChange={() => onSelect(pack.nameKey)}
                className="sr-only"
              />
              <BookOpen className="size-5 shrink-0" aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-neo-display text-base font-black leading-tight">{t(pack.nameKey)}</span>
                <span className={cn('font-neo-body text-xs font-semibold', on ? 'text-neo-black/75' : 'text-neo-cream/70')}>
                  {t('eduShell.setup.packWords', { count: pack.words.length })}
                </span>
              </span>
              {pack.nameKey === recommendedKey ? (
                <span
                  className={cn(
                    'shrink-0 rounded-full border-[2px] px-2 py-0.5 font-neo-body text-xs font-black uppercase tracking-wide',
                    on ? 'border-neo-black bg-neo-cream text-neo-black' : 'border-neo-lime text-neo-lime',
                  )}
                >
                  {t('eduShell.setup.packRecommended')}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default StarterPackRow;
