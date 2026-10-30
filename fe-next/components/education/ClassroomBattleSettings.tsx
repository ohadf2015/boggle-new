/**
 * ClassroomBattleSettings
 *
 * The setup wizard's P0 knobs:
 *  - Play style: free-for-all or a team battle with auto split (2-4 teams).
 *  - Support (SPED) toggles: larger type, audio cues, participation points.
 *
 * Kept out of the lobby setup panel so that file stays under the size budget.
 */

'use client';

import { Users, User, Accessibility, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { CALM_SELECTED, CALM_IDLE, CALM_FOCUS } from './lobby/LobbyChoiceRow';
import { MIN_TEAMS, MAX_TEAMS, type PlayStyle } from '@/shared/utils/teamBattle';
import type { ClassroomAccessibility } from '@/shared/types/classroom';

interface ClassroomBattleSettingsProps {
  playStyle: PlayStyle;
  teamCount: number;
  /** SPED accommodations — optional; absent means "no accommodations". */
  accessibility?: ClassroomAccessibility;
  onPlayStyleChange: (style: PlayStyle) => void;
  onTeamCountChange: (count: number) => void;
  onAccessibilityChange: (next: ClassroomAccessibility) => void;
}

const TEAM_COUNTS = Array.from(
  { length: MAX_TEAMS - MIN_TEAMS + 1 },
  (_, i) => MIN_TEAMS + i
);

export function ClassroomBattleSettings({
  playStyle,
  teamCount,
  accessibility = {},
  onPlayStyleChange,
  onTeamCountChange,
  onAccessibilityChange,
}: ClassroomBattleSettingsProps) {
  const { t } = useLanguage();

  const toggle = (key: keyof ClassroomAccessibility) =>
    onAccessibilityChange({ ...accessibility, [key]: !accessibility[key] });

  const supportToggles: Array<{ key: keyof ClassroomAccessibility; labelKey: string }> = [
    { key: 'largeText', labelKey: 'teacher.classroom.support.largeText' },
    { key: 'audioCues', labelKey: 'teacher.classroom.support.audioCues' },
    { key: 'participationPoints', labelKey: 'teacher.classroom.support.participation' },
  ];

  return (
    <div className="space-y-6">
      {/* Play style */}
      <div>
        <div id="classroom-playstyle-label" className="mb-3 block font-neo-display text-sm font-bold text-neo-cream">
          <Users className="me-2 inline size-4 text-neo-cream/70" />
          {t('teacher.classroom.playStyle.title')}
        </div>
        <div
          role="radiogroup"
          aria-labelledby="classroom-playstyle-label"
          className="grid grid-cols-2 gap-3"
        >
          {(['ffa', 'teams'] as PlayStyle[]).map((style) => {
            const isSelected = playStyle === style;
            const Icon = style === 'teams' ? Users : User;
            return (
              <button
                key={style}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`playstyle-${style}`}
                onClick={() => onPlayStyleChange(style)}
                className={cn(
                  'rounded-neo border-2 px-4 py-3 text-start transition-colors',
                  CALM_FOCUS,
                  isSelected ? CALM_SELECTED : CALM_IDLE
                )}
              >
                <span className="flex items-center gap-2 font-neo-display text-sm font-bold">
                  <Icon className="size-4 shrink-0 text-neo-cream/70" aria-hidden />
                  {t(`teacher.classroom.playStyle.${style}`)}
                  {isSelected && <Check className="ms-auto size-4 shrink-0" strokeWidth={3} aria-hidden="true" />}
                </span>
                <span className="mt-0.5 block font-neo-body text-xs text-neo-cream/80">
                  {t(`teacher.classroom.playStyle.${style}Desc`)}
                </span>
              </button>
            );
          })}
        </div>

        {playStyle === 'teams' && (
          <div className="mt-3">
            <div id="classroom-teamcount-label" className="mb-2 block font-neo-display text-sm font-bold text-neo-cream">
              {t('teacher.classroom.playStyle.teamCount')}
            </div>
            <div
              role="radiogroup"
              aria-labelledby="classroom-teamcount-label"
              className="grid grid-cols-3 gap-3"
            >
              {TEAM_COUNTS.map((count) => {
                const isSelected = teamCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    data-testid={`teamcount-${count}`}
                    onClick={() => onTeamCountChange(count)}
                    className={cn(
                      'inline-flex items-center justify-center gap-1.5 rounded-neo border-2 px-4 py-2.5 font-neo-display text-sm font-bold transition-colors',
                      CALM_FOCUS,
                      isSelected ? CALM_SELECTED : CALM_IDLE
                    )}
                  >
                    {isSelected && <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden="true" />}
                    {count}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 font-neo-body text-xs text-neo-cream/70">
              {t('teacher.classroom.playStyle.autoAssignNote')}
            </p>
          </div>
        )}
      </div>

      {/* Support (SPED) toggles */}
      <div>
        <div className="mb-3 block font-neo-display text-sm font-bold text-neo-cream">
          <Accessibility className="me-2 inline size-4 text-neo-cream/70" />
          {t('teacher.classroom.support.title')}
        </div>
        <div className="flex flex-wrap gap-2">
          {supportToggles.map(({ key, labelKey }) => {
            const isOn = !!accessibility[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isOn}
                data-testid={`support-${key}`}
                onClick={() => toggle(key)}
                className={cn(
                  'inline-flex min-h-[44px] items-center gap-1.5 rounded-neo border-2 px-4 py-2 font-neo-display text-sm font-bold transition-colors',
                  CALM_FOCUS,
                  isOn ? CALM_SELECTED : CALM_IDLE
                )}
              >
                {isOn && <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden="true" />}
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
