'use client';

import type { ComponentType } from 'react';
import { Check, ListChecks, Type, User, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { getPresetValues, type ClassroomPresetId, type ClassroomPresetValues } from '@/lib/education/classroomPresets';

const PRESETS: { id: ClassroomPresetId; key: string; fill: string }[] = [
  { id: 'standard', key: 'standard', fill: 'bg-neo-pink' },
  { id: 'friday-battle', key: 'fridayBattle', fill: 'bg-neo-cyan' },
  { id: 'sped', key: 'sped', fill: 'bg-neo-yellow' },
];

const CHECK_POP = '@keyframes lc-preset-check{from{transform:scale(0) rotate(-30deg)}to{transform:none}}';

type Translate = (key: string, vars?: Record<string, string | number>) => string;
type Trait = { icon: ComponentType<{ className?: string; strokeWidth?: number }>; label: string };

/** What a preset changes; the trait that sets it apart from Standard leads, since a phone shows only the first. */
export function presetTraits(values: ClassroomPresetValues, t: Translate): Trait[] {
  const traits: Trait[] = [
    values.playStyle === 'teams'
      ? { icon: Users, label: t('teacher.classroom.presets.traitTeams', { count: values.teamCount }) }
      : { icon: User, label: t('teacher.classroom.presets.traitSolo') },
    values.vocabularyCap > 0
      ? { icon: ListChecks, label: t('teacher.classroom.presets.traitWords', { count: values.vocabularyCap }) }
      : { icon: ListChecks, label: t('teacher.classroom.presets.traitAllWords') },
  ];
  if (values.accessibility.largeText) traits.unshift({ icon: Type, label: t('teacher.classroom.support.largeText') });
  return traits;
}

export interface LobbyPresetCardsProps {
  active: ClassroomPresetId | null;
  onApply: (id: ClassroomPresetId) => void;
}

export function LobbyPresetCards({ active, onApply }: LobbyPresetCardsProps) {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="lobby-presets-title" className="@container/presets flex flex-col gap-2">
      <style>{CHECK_POP}</style>
      <h2 id="lobby-presets-title" className="px-0.5 font-neo-display text-sm font-bold text-edu-ink/85 @2xl/presets:text-base">
        {t('teacher.classroom.presets.title')}
      </h2>
      <div role="radiogroup" aria-labelledby="lobby-presets-title" className="grid grid-cols-3 gap-2 pt-4 @2xl/presets:gap-4 @2xl/presets:pt-2">
        {PRESETS.map(({ id, key, fill }) => {
          const on = active === id;
          const traits = presetTraits(getPresetValues(id), t as Translate);
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              data-testid={`preset-${id}`}
              title={t(`teacher.classroom.presets.${key}.desc`)}
              onClick={() => onApply(id)}
              className={cn(
                'group relative flex min-w-0 flex-col items-center gap-1 rounded-neo-lg border-[3px] border-neo-black px-2 pb-2.5 text-center text-neo-black',
                '@2xl/presets:flex-row @2xl/presets:items-center @2xl/presets:gap-3 @2xl/presets:px-3 @2xl/presets:py-2.5 @2xl/presets:text-start',
                'transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:translate-y-0.5 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-edu-line focus-visible:ring-offset-2 focus-visible:ring-offset-edu-page',
                fill,
                on ? '-translate-y-1 shadow-hard-lg' : 'shadow-hard-sm [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-hard',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static sticker, same pipeline as the mode posters */}
              <img
                data-testid="preset-icon"
                src={`/mascot/teacher/presets/${id}.webp`}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className={cn(
                  '-mt-5 size-12 shrink-0 @md/presets:size-16 object-contain drop-shadow-[0_3px_0_rgb(16_17_20/0.45)] @2xl/presets:my-[-0.75rem] @2xl/presets:size-20',
                  'transition-transform duration-200 motion-reduce:transition-none [@media(hover:hover)]:group-hover:-rotate-6 [@media(hover:hover)]:group-hover:scale-110',
                  on && 'motion-safe:-rotate-3 scale-105',
                )}
              />
              <span className="flex min-w-0 flex-1 flex-col items-center gap-1 @2xl/presets:items-start @2xl/presets:gap-1.5">
                <span className="text-balance font-neo-display text-sm font-black leading-tight @md/presets:text-base @2xl/presets:text-xl">
                  {t(`teacher.classroom.presets.${key}.name`)}
                </span>
                <span data-testid="preset-values" className="flex flex-wrap justify-center gap-1 @2xl/presets:justify-start">
                  {traits.map(({ icon: Icon, label }, i) => (
                    <span
                      key={label}
                      className={cn(
                        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border-2 border-neo-black bg-neo-cream px-1.5 py-0.5 font-neo-display text-[11px] font-bold leading-none @2xl/presets:px-2 @2xl/presets:text-xs',
                        i > 0 && 'hidden @md/presets:inline-flex',
                      )}
                    >
                      <Icon className="size-3 @2xl/presets:size-3.5" strokeWidth={3} aria-hidden="true" />
                      {label}
                    </span>
                  ))}
                </span>
              </span>
              {on ? (
                <span
                  data-testid="preset-check"
                  aria-hidden="true"
                  className="absolute -end-2 -top-2 grid size-7 place-items-center rounded-full border-[3px] border-neo-black bg-neo-black shadow-hard-sm motion-safe:animate-[lc-preset-check_240ms_cubic-bezier(0.23,1,0.32,1)]"
                >
                  <Check className="size-4 text-neo-cream" strokeWidth={4} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default LobbyPresetCards;
