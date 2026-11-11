'use client';

import { Check, HeartHandshake, Swords, Zap, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { getPresetValues, type ClassroomPresetId } from '@/lib/education/classroomPresets';

const PRESETS: { id: ClassroomPresetId; key: string; icon: LucideIcon }[] = [
  { id: 'standard', key: 'standard', icon: Zap },
  { id: 'friday-battle', key: 'fridayBattle', icon: Swords },
  { id: 'sped', key: 'sped', icon: HeartHandshake },
];

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** What the preset will actually set, read from the one preset table. */
function presetChips(id: ClassroomPresetId, t: Translate): string[] {
  const p = getPresetValues(id);
  return [
    t('education.modePicker.minutes', { count: p.timerMinutes }),
    t(`teacher.classroom.playStyle.${p.playStyle}`),
    t(`teacher.classroom.board.${p.boardSize}`),
  ];
}

const CHECK_POP = '@keyframes lc-preset-check{from{transform:scale(0) rotate(-30deg)}to{transform:none}}';

export interface LobbyPresetCardsProps {
  active: ClassroomPresetId | null;
  onApply: (id: ClassroomPresetId) => void;
}

export function LobbyPresetCards({ active, onApply }: LobbyPresetCardsProps) {
  const { t } = useLanguage();
  const tt = t as Translate;
  return (
    <section aria-labelledby="lobby-presets-title" className="@container/presets flex flex-col gap-2">
      <style>{CHECK_POP}</style>
      <h2 id="lobby-presets-title" className="px-0.5 font-neo-display text-sm font-bold text-neo-cream/85 @2xl/presets:text-base">
        {t('teacher.classroom.presets.title')}
      </h2>
      <div role="radiogroup" aria-labelledby="lobby-presets-title" className="grid grid-cols-3 gap-2 @2xl/presets:gap-3">
        {PRESETS.map(({ id, key, icon: Icon }) => {
          const on = active === id;
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
                'relative flex min-h-[6.5rem] min-w-0 flex-col items-start gap-2 rounded-neo-lg border-[3px] bg-neo-navy-light p-2.5 text-start text-neo-cream shadow-hard',
                'transition-[transform,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:translate-y-0.5 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
                '@2xl/presets:min-h-[clamp(11rem,calc(100cqh-22rem),15rem)] @2xl/presets:gap-3 @2xl/presets:p-4',
                on ? 'border-neo-lime ring-2 ring-neo-lime ring-offset-2 ring-offset-neo-navy' : 'border-neo-cream/35 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-neo-cream/60',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-neo border-2 @2xl/presets:size-12',
                  on ? 'border-neo-lime text-neo-lime' : 'border-neo-cream/40 text-neo-cream/80',
                )}
              >
                <Icon className="size-5 @2xl/presets:size-7" strokeWidth={2.5} />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-neo-display text-sm font-bold leading-tight [overflow-wrap:anywhere] @2xl/presets:text-lg">
                  {t(`teacher.classroom.presets.${key}.name`)}
                </span>
                <span className="hidden font-neo-body text-xs leading-snug text-neo-cream/75 @lg/presets:block @2xl/presets:text-sm">
                  {t(`teacher.classroom.presets.${key}.desc`)}
                </span>
              </span>
              <span data-testid="preset-values" className="mt-auto hidden flex-wrap gap-1.5 @2xl/presets:flex">
                {presetChips(id, tt).map((chip) => (
                  <span key={chip} className="whitespace-nowrap rounded-full border border-neo-cream/35 px-2 py-0.5 font-neo-body text-xs font-bold text-neo-cream/80">
                    {chip}
                  </span>
                ))}
              </span>
              {on ? (
                <span
                  data-testid="preset-check"
                  aria-hidden="true"
                  className="absolute end-2 top-2 grid size-6 place-items-center rounded-full border-2 border-neo-lime bg-neo-navy motion-safe:animate-[lc-preset-check_240ms_cubic-bezier(0.23,1,0.32,1)]"
                >
                  <Check className="size-3.5 text-neo-lime" strokeWidth={4} />
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
