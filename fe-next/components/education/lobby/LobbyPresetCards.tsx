'use client';

import { Check, Clock, User, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { getPresetValues, type ClassroomPresetId } from '@/lib/education/classroomPresets';

const PRESETS: { id: ClassroomPresetId; key: string; fill: string }[] = [
  { id: 'standard', key: 'standard', fill: 'bg-neo-pink' },
  { id: 'friday-battle', key: 'fridayBattle', fill: 'bg-neo-cyan' },
  { id: 'sped', key: 'sped', fill: 'bg-neo-yellow' },
];

const CHECK_POP = '@keyframes lc-preset-check{from{transform:scale(0) rotate(-30deg)}to{transform:none}}';

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
      <div role="radiogroup" aria-labelledby="lobby-presets-title" className="grid grid-cols-3 gap-2 @2xl/presets:gap-4">
        {PRESETS.map(({ id, key, fill }) => {
          const on = active === id;
          const values = getPresetValues(id);
          const StyleIcon = values.playStyle === 'teams' ? Users : User;
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
                'group relative flex min-w-0 flex-col overflow-hidden rounded-neo-lg border-[3px] bg-edu-surface text-start text-edu-ink shadow-edu-lip',
                'transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:translate-y-0.5 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-edu-line focus-visible:ring-offset-2 focus-visible:ring-offset-edu-surface',
                on ? 'border-neo-black ring-[3px] ring-neo-pink ring-offset-2 ring-offset-edu-page' : 'border-edu-line [@media(hover:hover)]:hover:-translate-y-1',
              )}
            >
              <span
                aria-hidden="true"
                data-testid="preset-icon"
                className={cn('relative flex h-20 items-end justify-center border-b-[3px] border-neo-black text-neo-black @2xl/presets:h-28', fill)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static sticker, same pipeline as the mode posters */}
                <img
                  src={`/mascot/teacher/presets/${id}.webp`}
                  alt=""
                  loading="lazy"
                  className="h-[104%] w-auto translate-y-[6%] object-contain drop-shadow-[0_3px_0_rgb(16_17_20/0.35)] transition-transform duration-200 motion-reduce:transition-none [@media(hover:hover)]:group-hover:-rotate-3 [@media(hover:hover)]:group-hover:scale-105"
                />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1 p-2.5 @2xl/presets:gap-1.5 @2xl/presets:p-3.5">
                <span className="font-neo-display text-sm font-black leading-tight [overflow-wrap:anywhere] @2xl/presets:text-xl">
                  {t(`teacher.classroom.presets.${key}.name`)}
                </span>
                <span className="hidden font-neo-body text-sm leading-snug text-edu-ink/75 @2xl/presets:block">
                  {t(`teacher.classroom.presets.${key}.desc`)}
                </span>
                <span data-testid="preset-values" className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-1 font-neo-display text-xs font-bold text-edu-ink/80 @2xl/presets:text-sm">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Clock className="size-3.5 @2xl/presets:size-4" strokeWidth={2.75} aria-hidden="true" />
                    {t('education.modePicker.minutes', { count: values.timerMinutes })}
                  </span>
                  <span className="hidden items-center gap-1 whitespace-nowrap @lg/presets:inline-flex">
                    <StyleIcon className="size-3.5 @2xl/presets:size-4" strokeWidth={2.75} aria-hidden="true" />
                    {t(`teacher.classroom.playStyle.${values.playStyle}`)}
                  </span>
                </span>
              </span>
              {on ? (
                <span
                  data-testid="preset-check"
                  aria-hidden="true"
                  className="absolute end-1.5 top-1.5 grid size-6 place-items-center rounded-full border-2 border-neo-black bg-edu-surface shadow-edu-lip-sm @2xl/presets:end-2 @2xl/presets:top-2 @2xl/presets:size-8 motion-safe:animate-[lc-preset-check_240ms_cubic-bezier(0.23,1,0.32,1)]"
                >
                  <Check className="size-4 text-edu-pink-ink @2xl/presets:size-5" strokeWidth={4} />
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
