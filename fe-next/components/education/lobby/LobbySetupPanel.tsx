'use client';

import { Accessibility, Check, User, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { CALM_SELECTED, CALM_IDLE, CALM_FOCUS } from './LobbyChoiceRow';
import { LobbyOptionGroup, LobbySwitchRow } from './LobbyOptionParts';
import type { ClassroomPresetId } from '@/lib/education/classroomPresets';
import { MIN_TEAMS, MAX_TEAMS, type PlayStyle } from '@/shared/utils/teamBattle';
import type { ClassroomAccessibility } from '@/shared/types/classroom';

const TEAM_COUNTS = Array.from({ length: MAX_TEAMS - MIN_TEAMS + 1 }, (_, i) => MIN_TEAMS + i);

const SUPPORT: Array<{ key: keyof ClassroomAccessibility; labelKey: string }> = [
  { key: 'largeText', labelKey: 'teacher.classroom.support.largeText' },
  { key: 'audioCues', labelKey: 'teacher.classroom.support.audioCues' },
  { key: 'participationPoints', labelKey: 'teacher.classroom.support.participation' },
];

export interface LobbySetupPanelProps {
  /** Presets live on the lobby's first frame now; kept so older callers still type-check. */
  activePreset?: ClassroomPresetId | null;
  onApplyPreset?: (id: ClassroomPresetId) => void;
  playStyle: PlayStyle;
  teamCount: number;
  accessibility: ClassroomAccessibility;
  onPlayStyleChange: (style: PlayStyle) => void;
  onTeamCountChange: (count: number) => void;
  onAccessibilityChange: (next: ClassroomAccessibility) => void;
  rivalry?: boolean;
  onRivalryChange?: (on: boolean) => void;
}

/** Play style and support, as grouped radio cards and real switches. */
export function LobbySetupPanel({
  playStyle,
  teamCount,
  accessibility,
  onPlayStyleChange,
  onTeamCountChange,
  onAccessibilityChange,
  rivalry = true,
  onRivalryChange,
}: LobbySetupPanelProps) {
  const { t } = useLanguage();

  return (
    <div className="@container flex flex-col gap-4">
      <LobbyOptionGroup id="lobby-opt-play" title={t('teacher.classroom.playStyle.title')} icon={Users} testId="battle-playstyle-group">
        <div role="radiogroup" aria-labelledby="lobby-opt-play" className="grid grid-cols-2 gap-2">
          {(['ffa', 'teams'] as PlayStyle[]).map((style) => {
            const on = playStyle === style;
            const Icon = style === 'teams' ? Users : User;
            return (
              <button
                key={style}
                type="button"
                role="radio"
                aria-checked={on}
                data-testid={`playstyle-${style}`}
                onClick={() => onPlayStyleChange(style)}
                className={cn('min-h-12 rounded-neo border-2 px-3 py-2 text-start transition-colors', CALM_FOCUS, on ? CALM_SELECTED : CALM_IDLE)}
              >
                <span className="flex items-center gap-2 font-neo-display text-sm font-bold">
                  <Icon className="size-4 shrink-0 text-neo-cream/70" aria-hidden="true" />
                  {t(`teacher.classroom.playStyle.${style}`)}
                  {on && <Check className="ms-auto size-4 shrink-0" strokeWidth={3} aria-hidden="true" />}
                </span>
                <span className="mt-0.5 hidden font-neo-body text-xs text-neo-cream/75 @sm:block">{t(`teacher.classroom.playStyle.${style}Desc`)}</span>
              </button>
            );
          })}
        </div>
        {playStyle === 'teams' && (
          <div className="flex flex-wrap items-center gap-2">
            <span id="lobby-opt-teams" className="font-neo-body text-sm font-bold text-neo-cream">{t('teacher.classroom.playStyle.teamCount')}</span>
            <div role="radiogroup" aria-labelledby="lobby-opt-teams" className="flex gap-2">
              {TEAM_COUNTS.map((count) => {
                const on = teamCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    data-testid={`teamcount-${count}`}
                    onClick={() => onTeamCountChange(count)}
                    className={cn('grid size-11 place-items-center rounded-neo border-2 font-neo-display text-base font-bold transition-colors', CALM_FOCUS, on ? CALM_SELECTED : CALM_IDLE)}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {onRivalryChange && (
          <LobbySwitchRow
            testId="battle-rivalry"
            label={t('teacher.classroom.rivalry.toggle')}
            hint={t('teacher.classroom.rivalry.hint')}
            checked={rivalry}
            onChange={onRivalryChange}
          />
        )}
      </LobbyOptionGroup>

      <LobbyOptionGroup id="lobby-opt-support" title={t('teacher.classroom.support.title')} icon={Accessibility}>
        {SUPPORT.map(({ key, labelKey }) => (
          <LobbySwitchRow
            key={key}
            testId={`support-${key}`}
            label={t(labelKey)}
            checked={!!accessibility[key]}
            onChange={(on) => onAccessibilityChange({ ...accessibility, [key]: on })}
          />
        ))}
      </LobbyOptionGroup>
    </div>
  );
}

export default LobbySetupPanel;
