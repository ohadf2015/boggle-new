'use client';

/**
 * DailyMissionsHub — 4-mission checklist card for the landing page.
 * Only renders for authenticated users.
 * Neo-brutalist dark theme styling.
 */

import Link from 'next/link';
import { Trophy, Users, Brain, Check, Gift } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyMissions, type MissionType } from '@/hooks/useDailyMissions';
import { getDailyQuestModes, type DailyQuestMode } from '@/shared/dailyQuestPool';
import { cn } from '@/lib/utils';
import { DailyAvatarPartCard } from '@/components/avatar/DailyAvatarPartCard';

interface MissionConfig {
  type: MissionType;
  icon: React.ElementType;
  borderColor: string;
  dotColor: string;
  translationKey: string;
}

const ALL_MISSION_CONFIGS: Record<DailyQuestMode, MissionConfig> = {
  wordHunt: {
    type: 'wordHunt',
    icon: Trophy,
    borderColor: 'border-s-neo-yellow',
    dotColor: 'bg-neo-yellow',
    translationKey: 'dailyMissions.wordHunt',
  },
  multiplayer: {
    type: 'multiplayer',
    icon: Users,
    borderColor: 'border-s-neo-pink',
    dotColor: 'bg-neo-pink',
    translationKey: 'dailyMissions.multiplayer',
  },
  brainDrills: {
    type: 'brainDrills',
    icon: Brain,
    borderColor: 'border-s-neo-purple',
    dotColor: 'bg-neo-purple',
    translationKey: 'dailyMissions.brainDrills',
  },
};

const MISSION_CONFIGS: MissionConfig[] = getDailyQuestModes().map(
  (mode) => ALL_MISSION_CONFIGS[mode],
);

function ProgressDots({
  missions,
  configs,
}: {
  missions: { type: MissionType; completed: boolean }[];
  configs: MissionConfig[];
}) {
  return (
    <div className="flex gap-2" aria-hidden="true">
      {configs.map((config) => {
        const mission = missions.find((m) => m.type === config.type);
        const completed = mission?.completed ?? false;
        return (
          <div
            key={config.type}
            className={cn(
              'w-3 h-3 rounded-full border-2 border-neo-black transition-all duration-300',
              completed ? config.dotColor : 'bg-neo-navy/50',
              completed && 'shadow-[0_0_8px_rgba(255,255,255,0.3)]',
            )}
          />
        );
      })}
    </div>
  );
}

function MissionRow({
  config,
  completed,
  href,
  t,
  language,
}: {
  config: MissionConfig;
  completed: boolean;
  href: string;
  t: (key: string) => string;
  language: string;
}) {
  const Icon = config.icon;

  return (
    <Link
      href={`/${language}${href}`}
      className={cn(
        'flex items-center gap-3 p-3 rounded-neo',
        'border-3 border-neo-black border-s-4',
        config.borderColor,
        'bg-neo-navy/60 hover:bg-neo-navy/80',
        'shadow-hard-sm hover:shadow-hard',
        'transition-all duration-150',
        'hover:-translate-y-0.5 active:translate-y-px active:shadow-hard-pressed',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan',
      )}
      aria-label={`${t(config.translationKey)}${completed ? ` - ${t('dailyMissions.completed')}` : ''}`}
    >
      <div
        className={cn(
          'shrink-0 w-9 h-9 flex items-center justify-center rounded-neo',
          'border-2 border-neo-black',
          completed ? 'bg-neo-lime/20' : 'bg-neo-navy',
        )}
      >
        <Icon
          className={cn('w-5 h-5', completed ? 'text-neo-lime' : 'text-neo-white')}
          aria-hidden="true"
        />
      </div>

      <span
        className={cn(
          'flex-1 font-neo-body text-sm font-semibold',
          completed ? 'text-neo-white line-through' : 'text-neo-white',
        )}
      >
        {t(config.translationKey)}
      </span>

      <div
        className={cn(
          'shrink-0 w-6 h-6 flex items-center justify-center rounded-full',
          'border-2 border-neo-black',
          completed ? 'bg-neo-lime' : 'bg-transparent',
        )}
      >
        {completed && <Check className="w-4 h-4 text-neo-black" aria-hidden="true" />}
      </div>
    </Link>
  );
}

function GrandSlamBadge({ t }: { t: (key: string) => string }) {
  return (
    <div
      className={cn(
        'mt-3 flex items-center gap-2 p-3 rounded-neo',
        'border-3 border-neo-yellow bg-neo-yellow/10',
        'shadow-hard-sm animate-neo-pop',
      )}
      role="status"
      aria-live="polite"
    >
      <Gift className="w-5 h-5 text-neo-yellow shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-neo-display text-sm font-bold text-neo-yellow">
          {t('dailyMissions.grandSlam')}
        </p>
        <p className="font-neo-body text-xs text-neo-white">
          {t('dailyMissions.grandSlamBonus')}
        </p>
      </div>
    </div>
  );
}

export function DailyMissionsHub() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { missions, completedCount, isGrandSlam, grandSlamClaimed, loading } = useDailyMissions();

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div
        className={cn(
          'p-4 rounded-neo-lg border-3 border-neo-black',
          'bg-neo-navy/40 shadow-hard animate-pulse',
        )}
        aria-busy="true"
        aria-label={t('dailyMissions.title')}
      >
        <div className="h-6 w-40 bg-neo-white/10 rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={`skel-${i}`} className="h-14 bg-neo-white/5 rounded-neo" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section
      className={cn(
        'p-4 rounded-neo-lg border-3 border-neo-black',
        'bg-neo-navy/40 shadow-hard',
      )}
      aria-label={t('dailyMissions.title')}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-neo-display text-lg font-bold text-neo-white">
          {t('dailyMissions.title')}
        </h2>
        <div className="flex items-center gap-2">
          <span className="font-neo-body text-xs text-neo-white">
            {t('dailyMissions.progress', { current: String(completedCount) })}
          </span>
          <ProgressDots missions={missions} configs={MISSION_CONFIGS} />
        </div>
      </div>

      {/* Grand Slam description */}
      {!isGrandSlam && (
        <p className="font-neo-body text-xs text-neo-white mb-3">
          {t('dailyMissions.grandSlamDesc')}
        </p>
      )}

      {/* Mission rows */}
      <div className="space-y-2">
        {MISSION_CONFIGS.map((config) => {
          const mission = missions.find((m) => m.type === config.type);
          return (
            <MissionRow
              key={config.type}
              config={config}
              completed={mission?.completed ?? false}
              href={mission?.href ?? '/'}
              t={t}
              language={language}
            />
          );
        })}
      </div>

      <DailyAvatarPartCard />

      {/* Grand Slam badge */}
      {isGrandSlam && !grandSlamClaimed && <GrandSlamBadge t={t} />}
      {grandSlamClaimed && (
        <div className="mt-3 text-center">
          <span className="font-neo-display text-sm font-bold text-neo-yellow/60">
            {t('dailyMissions.grandSlam')} {t('dailyMissions.completed')}
          </span>
        </div>
      )}
    </section>
  );
}
