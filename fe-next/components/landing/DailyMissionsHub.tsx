'use client';

/**
 * DailyMissionsHub — 4-mission checklist card for the landing page.
 * Only renders for authenticated users.
 * Neo-brutalist dark theme styling.
 */

import Link from 'next/link';
import { Trophy, Swords, Compass, Check, Gift } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyMissions, type Mission } from '@/hooks/useDailyMissions';
import type { QuestFamily } from '@/shared/dailyQuestPool';
import { cn } from '@/lib/utils';
import { DailyAvatarPartCard } from '@/components/avatar/DailyAvatarPartCard';

// Visual identity per quest family (neo-brutalist color families).
const FAMILY_STYLE: Record<QuestFamily, { icon: React.ElementType; dotColor: string }> = {
  skill: { icon: Trophy, dotColor: 'bg-neo-cyan' },
  pvp: { icon: Swords, dotColor: 'bg-neo-pink' },
  discovery: { icon: Compass, dotColor: 'bg-neo-purple' },
};

function ProgressDots({ missions }: { missions: Mission[] }) {
  return (
    <div className="flex gap-2" aria-hidden="true">
      {missions.map((mission) => (
        <div
          key={mission.slot}
          className={cn(
            'w-3 h-3 rounded-full border-2 border-neo-black transition-all duration-300',
            mission.completed ? FAMILY_STYLE[mission.family].dotColor : 'bg-neo-navy/50',
            mission.completed && 'shadow-[0_0_8px_rgba(255,255,255,0.3)]',
          )}
        />
      ))}
    </div>
  );
}

function MissionRow({
  mission,
  t,
  language,
}: {
  mission: Mission;
  t: (key: string) => string;
  language: string;
}) {
  const { icon: Icon, dotColor } = FAMILY_STYLE[mission.family];
  const { completed } = mission;

  return (
    <Link
      prefetch={false}
      href={`/${language}${mission.href}`}
      className={cn(
        'flex items-center gap-3 p-3 rounded-neo',
        'border-3 border-neo-black',
        'bg-neo-navy/60 hover:bg-neo-navy/80',
        'shadow-hard-sm hover:shadow-hard',
        'transition-all duration-150',
        'hover:-translate-y-0.5 active:translate-y-px active:shadow-hard-pressed',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan',
      )}
      aria-label={`${t(mission.titleKey)}${completed ? ` - ${t('dailyMissions.completed')}` : ''}`}
    >
      <div
        className={cn(
          'shrink-0 w-9 h-9 flex items-center justify-center rounded-neo',
          'border-2 border-neo-black',
          completed ? 'bg-neo-lime/20' : dotColor,
        )}
      >
        <Icon
          className={cn('w-5 h-5', completed ? 'text-neo-lime' : 'text-neo-black')}
          aria-hidden="true"
        />
      </div>

      <div className="flex-1 min-w-0">
        <span
          className={cn(
            'block font-neo-body text-sm font-semibold truncate',
            completed ? 'text-neo-white line-through' : 'text-neo-white',
          )}
        >
          {t(mission.titleKey)}
        </span>
        {!completed && (
          <span className="block font-neo-body text-xs text-neo-white/70 truncate">
            {t(mission.descKey)}
          </span>
        )}
      </div>

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
          <ProgressDots missions={missions} />
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
        {missions.map((mission) => (
          <MissionRow
            key={mission.slot}
            mission={mission}
            t={t}
            language={language}
          />
        ))}
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
