'use client';

import type React from 'react';
import { Sparkles, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ClassroomBattleSettings } from '../ClassroomBattleSettings';
import type { ClassroomPresetId } from '@/lib/education/classroomPresets';
import type { PlayStyle } from '@/shared/utils/teamBattle';
import type { ClassroomAccessibility } from '@/shared/types/classroom';

const PRESETS: { id: ClassroomPresetId; key: string }[] = [
  { id: 'friday-battle', key: 'fridayBattle' },
  { id: 'sped', key: 'sped' },
  { id: 'standard', key: 'standard' },
];

/** One icon-badged card per question, so an open panel reads as grouped decisions, not one long list. */
function StepCard({ id, icon: Icon, tone, children }: { id: string; icon: LucideIcon; tone: string; children: React.ReactNode }) {
  return (
    <section
      data-testid={`lobby-step-${id}`}
      className="relative rounded-neo-lg border-2 border-neo-cream/40 bg-neo-navy-light/60 p-4 ps-14"
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute start-3 top-3 grid size-8 place-items-center rounded-full border-2 border-black font-neo-display text-sm font-black text-black shadow-hard-sm',
          tone
        )}
      >
        <Icon className="size-4" strokeWidth={3} />
      </span>
      {children}
    </section>
  );
}

export interface LobbySetupPanelProps {
  activePreset: ClassroomPresetId | null;
  playStyle: PlayStyle;
  teamCount: number;
  accessibility: ClassroomAccessibility;
  onApplyPreset: (id: ClassroomPresetId) => void;
  onPlayStyleChange: (style: PlayStyle) => void;
  onTeamCountChange: (count: number) => void;
  onAccessibilityChange: (next: ClassroomAccessibility) => void;
}

export function LobbySetupPanel({
  activePreset,
  playStyle,
  teamCount,
  accessibility,
  onApplyPreset,
  onPlayStyleChange,
  onTeamCountChange,
  onAccessibilityChange,
}: LobbySetupPanelProps) {
  const { t } = useLanguage();

  return (
    <div className="@container flex flex-col gap-5">
      <StepCard id="presets" icon={Sparkles} tone="bg-neo-purple">
        <div
          id="lobby-preset-label"
          className="mb-2 flex items-center gap-1.5 font-neo-display text-xs font-black uppercase text-neo-white/70"
        >
          {t('teacher.classroom.presets.title')}
        </div>
        <div role="radiogroup" aria-labelledby="lobby-preset-label" className="grid gap-2 @lg:grid-cols-3">
          {PRESETS.map(({ id, key }) => {
            const isActive = activePreset === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={isActive}
                data-testid={`preset-${id}`}
                onClick={() => onApplyPreset(id)}
                className={cn(
                  'rounded-neo border-2 border-black px-3 py-3 text-start transition hover:-translate-y-0.5 active:translate-y-0',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
                  isActive
                    ? 'bg-neo-purple text-black shadow-hard'
                    : 'border-neo-cream bg-neo-navy-light text-neo-cream shadow-hard-sm hover:bg-neo-navy'
                )}
              >
                <span className="block font-neo-display text-sm font-black uppercase">
                  {t(`teacher.classroom.presets.${key}.name`)}
                </span>
                <span
                  className={cn(
                    'block font-neo-body text-xs font-bold',
                    isActive ? 'text-black/75' : 'text-neo-cream'
                  )}
                >
                  {t(`teacher.classroom.presets.${key}.desc`)}
                </span>
              </button>
            );
          })}
        </div>
      </StepCard>

      <ClassroomBattleSettings
        playStyle={playStyle}
        teamCount={teamCount}
        accessibility={accessibility}
        onPlayStyleChange={onPlayStyleChange}
        onTeamCountChange={onTeamCountChange}
        onAccessibilityChange={onAccessibilityChange}
      />
    </div>
  );
}

export default LobbySetupPanel;
