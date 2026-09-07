/**
 * ClassroomBattleSettings
 *
 * The setup wizard's P0 knobs:
 *  - Play style: free-for-all or a team battle with auto split (2-4 teams).
 *  - Support (SPED) toggles: larger type, audio cues, participation points.
 *
 * Kept out of ClassroomSetupStep so that file stays under the size budget.
 */

'use client';

import { Users, User, Accessibility } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { MIN_TEAMS, MAX_TEAMS, type PlayStyle } from '@/shared/utils/teamBattle';
import type { ClassroomAccessibility } from '@/shared/types/classroom';

interface ClassroomBattleSettingsProps {
  playStyle: PlayStyle;
  teamCount: number;
  accessibility: ClassroomAccessibility;
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
  accessibility,
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
        <div id="classroom-playstyle-label" className="block text-neo-white font-bold mb-3">
          <Users className="w-5 h-5 inline me-2 text-neo-pink" />
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
                  'px-4 py-3 font-bold rounded-neo border-neo border-neo-black transition-all text-start',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-pink focus-visible:ring-offset-2',
                  isSelected
                    ? 'bg-neo-pink text-neo-black shadow-hard'
                    : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm'
                )}
              >
                <Icon className="w-5 h-5 inline me-2" aria-hidden />
                <span className="block font-neo-display font-black">
                  {t(`teacher.classroom.playStyle.${style}`)}
                </span>
                <span className={cn('block text-xs mt-0.5', isSelected ? 'text-neo-black/70' : 'text-neo-white/70')}>
                  {t(`teacher.classroom.playStyle.${style}Desc`)}
                </span>
              </button>
            );
          })}
        </div>

        {playStyle === 'teams' && (
          <div className="mt-3">
            <div id="classroom-teamcount-label" className="block text-neo-white font-bold mb-2 text-sm">
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
                      'px-4 py-2.5 font-bold rounded-neo border-neo border-neo-black transition-all',
                      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-pink focus-visible:ring-offset-2',
                      isSelected
                        ? 'bg-neo-pink text-neo-black shadow-hard'
                        : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm'
                    )}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-neo-white/70 font-neo-body">
              {t('teacher.classroom.playStyle.autoAssignNote')}
            </p>
          </div>
        )}
      </div>

      {/* Support (SPED) toggles */}
      <div>
        <div className="block text-neo-white font-bold mb-3">
          <Accessibility className="w-5 h-5 inline me-2 text-neo-lime" />
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
                  'px-4 py-2 min-h-[44px] font-bold text-sm rounded-neo border-neo border-neo-black transition-all',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2',
                  isOn
                    ? 'bg-neo-lime text-neo-black shadow-hard'
                    : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm'
                )}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
