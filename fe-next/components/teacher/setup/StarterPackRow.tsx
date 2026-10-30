'use client';

import { BookOpen, Check } from 'lucide-react';
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
      <div className="grid grid-cols-2 gap-2">
        {packs.map((pack) => {
          const on = pack.nameKey === selectedKey;
          return (
            <label
              key={pack.nameKey}
              className={cn(
                'relative flex min-h-[52px] cursor-pointer items-center gap-2 rounded-neo border-2 px-2.5 py-1.5 text-neo-cream transition-[transform,colors] duration-150 active:scale-[0.98] motion-reduce:transition-none',
                'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-neo-cream',
                on ? 'border-neo-lime ring-2 ring-neo-lime' : 'border-neo-cream/50 hover:border-neo-cream',
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
              {on ? (
                <Check className="size-5 shrink-0 text-neo-lime" strokeWidth={3} aria-hidden="true" />
              ) : (
                <BookOpen className="size-5 shrink-0" aria-hidden="true" />
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-neo-display text-sm font-bold leading-tight sm:text-base">{t(pack.nameKey)}</span>
                <span className="font-neo-body text-xs font-semibold text-neo-cream/70">
                  {t('eduShell.setup.packWords', { count: pack.words.length })}
                </span>
              </span>
              {pack.nameKey === recommendedKey ? (
                <span className="absolute -top-2 end-2 rounded-full border border-neo-cream/50 bg-neo-navy-light px-1.5 font-neo-body text-[0.65rem] font-bold leading-4 text-neo-cream">
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
