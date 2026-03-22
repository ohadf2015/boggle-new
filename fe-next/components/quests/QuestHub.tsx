'use client';

/**
 * QuestHub — Unified daily + weekly quest page.
 *
 * Combines daily missions (3 quests, no brain drill) with weekly quest.
 * Enhanced RPG aesthetic with bigger icons, colored circles, star rewards.
 *
 * Design: RPG Quest Board meets Neo-Brutalist.
 */

import { Trophy, Sword, Users, Gift, Sparkles, Target, Flame, Puzzle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyMissions, type MissionType } from '@/hooks/useDailyMissions';
import { useWeeklyQuest } from '@/hooks/useWeeklyQuest';
import { cn } from '@/lib/utils';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { QuestProgressRing } from './QuestProgressRing';
import { QuestCard } from './QuestCard';

// --- Stagger animation variants (spring: stiffness 300, damping 24 = snappy bounce) ---
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 250, damping: 28, delay: 0.3 },
  },
};

const grandSlamVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 200, damping: 15 },
  },
};

// --- Quest configs (no brain drill) ---
interface DailyQuestConfig {
  type: MissionType;
  icon: React.ElementType;
  nameKey: string;
  descKey: string;
  accentColor: string;
  ringColor: string;
  iconColorClass: string;
  xpReward: number;
}

const DAILY_QUEST_CONFIGS: DailyQuestConfig[] = [
  {
    type: 'wordHunt',
    icon: Trophy,
    nameKey: 'quests.daily.wordHunt.name',
    descKey: 'quests.daily.wordHunt.desc',
    accentColor: 'bg-neo-yellow',
    ringColor: 'stroke-neo-yellow',
    iconColorClass: 'text-neo-yellow',
    xpReward: 100,
  },
  {
    type: 'adventure',
    icon: Sword,
    nameKey: 'quests.daily.adventure.name',
    descKey: 'quests.daily.adventure.desc',
    accentColor: 'bg-neo-lime',
    ringColor: 'stroke-neo-lime',
    iconColorClass: 'text-neo-lime',
    xpReward: 100,
  },
  {
    type: 'community',
    icon: Users,
    nameKey: 'quests.daily.community.name',
    descKey: 'quests.daily.community.desc',
    accentColor: 'bg-neo-pink',
    ringColor: 'stroke-neo-pink',
    iconColorClass: 'text-neo-pink',
    xpReward: 100,
  },
];

const TOTAL_DAILY = DAILY_QUEST_CONFIGS.length;

// --- Weekly quest difficulty colors ---
const DIFFICULTY_STYLES: Record<string, { color: string; border: string; bg: string }> = {
  easy: { color: 'text-green-400', border: 'border-green-400/50', bg: 'bg-green-400/15' },
  medium: { color: 'text-yellow-400', border: 'border-yellow-400/50', bg: 'bg-yellow-400/15' },
  hard: { color: 'text-red-400', border: 'border-red-400/50', bg: 'bg-red-400/15' },
};

function GrandSlamBanner({ t }: { t: (key: string) => string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'flex items-center gap-4 p-5 rounded-neo-lg',
        'border-3 border-neo-yellow bg-neo-yellow/10',
        'shadow-hard animate-neo-pop',
      )}
      role="status"
      aria-live="polite"
    >
      {/* Shimmer */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-neo-yellow/10 to-transparent animate-shimmer"
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-neo-yellow/20 border-2 border-neo-yellow flex items-center justify-center">
          <Gift className="w-7 h-7 text-neo-yellow" aria-hidden="true" />
        </div>
        <Sparkles className="w-5 h-5 text-neo-yellow animate-float" aria-hidden="true" />
      </div>
      <div className="relative flex-1">
        <p className="font-neo-display text-lg font-black text-neo-yellow">
          {t('quests.grandSlam')}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="font-neo-body text-sm text-neo-white/80 font-medium">
            {t('quests.grandSlamBonus')}
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-black text-neo-cyan">
            <Puzzle className="w-3 h-3" aria-hidden="true" />
            {t('quests.grandSlamAvatar')}
          </span>
        </div>
      </div>
      <Flame className="w-6 h-6 text-neo-yellow/60 animate-bob flex-shrink-0" aria-hidden="true" />
    </div>
  );
}

function WeeklyQuestSection() {
  const { t } = useLanguage();
  const { activeQuest, availableQuests, isComplete, loading, selectQuest } = useWeeklyQuest();

  if (loading) return null;

  return (
    <section aria-label={t('quests.weeklyTitle')}>
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-5 h-5 text-neo-cyan" aria-hidden="true" />
        <h2 className="font-neo-display text-base font-bold text-neo-white">
          {t('quests.weeklyTitle')}
        </h2>
      </div>

      <div
        className={cn(
          'rounded-neo-lg p-4',
          'border-3 border-neo-cyan/30',
          'bg-[#1e1e3a]',
          'shadow-hard-sm',
        )}
      >
        {isComplete && activeQuest ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-14 h-14 rounded-full bg-neo-yellow/20 border-2 border-neo-yellow flex items-center justify-center">
              <Trophy className="w-8 h-8 text-neo-yellow" aria-hidden="true" />
            </div>
            <span className="font-neo-display text-xl font-black text-neo-yellow">
              {t('weeklyQuest.complete')}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-neo-display text-sm font-bold text-neo-cyan">
                {t('weeklyQuest.xpReward', { xp: activeQuest.xpReward })}
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-neo-pink">
                <Puzzle className="w-3.5 h-3.5" aria-hidden="true" />
                {t('quests.avatarReward')}
              </span>
            </div>
            <p className="font-neo-body text-xs text-neo-white/50">
              {t('weeklyQuest.newQuestMonday')}
            </p>
          </div>
        ) : activeQuest ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-neo-display text-sm font-bold text-neo-cyan">
                {t('weeklyQuest.active')}
              </span>
              <span
                className={cn(
                  'text-xs font-black uppercase px-2 py-0.5 rounded-full border',
                  DIFFICULTY_STYLES[activeQuest.difficulty]?.color,
                  DIFFICULTY_STYLES[activeQuest.difficulty]?.border,
                  DIFFICULTY_STYLES[activeQuest.difficulty]?.bg,
                )}
              >
                {t(`weeklyQuest.${activeQuest.difficulty}`)}
              </span>
            </div>
            <p className="font-neo-body text-sm text-neo-white/90 font-medium">
              {activeQuest.description}
            </p>
            {/* Reward preview */}
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 font-black text-neo-cyan">
                {t('weeklyQuest.xpReward', { xp: activeQuest.xpReward })}
              </span>
              <span className="inline-flex items-center gap-1 font-black text-neo-pink">
                <Puzzle className="w-3 h-3" aria-hidden="true" />
                {t('quests.avatarReward')}
              </span>
            </div>
            {/* Progress bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-neo-body font-bold text-neo-white/70">
                  {t('weeklyQuest.progress', {
                    current: activeQuest.current,
                    target: activeQuest.target,
                  })}
                </span>
              </div>
              <div
                className="h-3 bg-neo-white/10 rounded-full overflow-hidden border-2 border-neo-black"
                role="progressbar"
                aria-valuenow={Math.round(
                  (activeQuest.current / activeQuest.target) * 100,
                )}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-gradient-to-r from-neo-cyan to-neo-cyan-light rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, (activeQuest.current / activeQuest.target) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-neo-body text-sm text-neo-white/70">
              {t('weeklyQuest.choose')}
            </p>
            <div className="grid gap-2">
              {availableQuests.map((quest) => {
                const style = DIFFICULTY_STYLES[quest.difficulty] || DIFFICULTY_STYLES.easy;
                return (
                  <button
                    key={quest.id}
                    onClick={() => selectQuest(quest.id)}
                    className={cn(
                      'flex items-center justify-between p-3',
                      'rounded-neo border-2 border-neo-black',
                      'bg-neo-navy/60',
                      'shadow-hard-sm',
                      'hover:-translate-y-0.5 hover:shadow-hard',
                      'active:translate-y-[1px] active:shadow-hard-pressed',
                      'transition-all duration-100',
                    )}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={cn(
                          'text-xs font-black uppercase px-2 py-0.5 rounded-full border',
                          style.color,
                          style.border,
                          style.bg,
                        )}
                      >
                        {t(`weeklyQuest.${quest.difficulty}`)}
                      </span>
                      <span className="font-neo-body text-sm text-neo-white/80 text-start">
                        {quest.description}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 ms-3 flex-shrink-0">
                      <span className="font-neo-display text-sm font-black text-neo-cyan">
                        +{quest.xpReward} XP
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neo-pink">
                        <Puzzle className="w-2.5 h-2.5" aria-hidden="true" />
                        {t('quests.avatarReward')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function QuestHub() {
  const { t } = useLanguage();
  const { missions, isGrandSlam, grandSlamClaimed, loading } =
    useDailyMissions();

  // Filter to only the 3 quests we show (no brain drill)
  const dailyCompleted = DAILY_QUEST_CONFIGS.filter((config) => {
    const mission = missions.find((m) => m.type === config.type);
    return mission?.completed ?? false;
  }).length;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 animate-pulse" aria-busy="true">
        <div className="h-8 w-32 bg-neo-white/10 rounded-neo" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-neo-white/5 rounded-neo-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* --- Daily Quests Section --- */}
      <section aria-label={t('quests.dailyTitle')}>
        {/* Header with progress ring */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-neo-display text-lg font-bold text-neo-white">
            {t('quests.dailyTitle')}
          </h2>
          <QuestProgressRing
            progress={dailyCompleted / TOTAL_DAILY}
            size={42}
            strokeWidth={4}
            color={
              dailyCompleted === TOTAL_DAILY
                ? 'stroke-neo-lime'
                : 'stroke-neo-cyan'
            }
          >
            <span className="font-neo-display text-xs font-black text-neo-white">
              {t('quests.progress', {
                completed: dailyCompleted,
                total: TOTAL_DAILY,
              })}
            </span>
          </QuestProgressRing>
        </div>

        {/* Quest cards — staggered entrance */}
        <AdaptiveMotion.div
          className="flex flex-col gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {DAILY_QUEST_CONFIGS.map((config) => {
            const mission = missions.find((m) => m.type === config.type);
            return (
              <AdaptiveMotion.div key={config.type} variants={cardVariants}>
                <QuestCard
                  icon={config.icon}
                  nameKey={config.nameKey}
                  descKey={config.descKey}
                  completed={mission?.completed ?? false}
                  href={mission?.href ?? '/'}
                  accentColor={config.accentColor}
                  ringColor={config.ringColor}
                  iconColorClass={config.iconColorClass}
                  xpReward={config.xpReward}
                />
              </AdaptiveMotion.div>
            );
          })}
        </AdaptiveMotion.div>

        {/* Grand Slam — bouncy scale pop */}
        {isGrandSlam && !grandSlamClaimed && (
          <AdaptiveMotion.div
            className="mt-4"
            variants={grandSlamVariants}
            initial="hidden"
            animate="visible"
          >
            <GrandSlamBanner t={t} />
          </AdaptiveMotion.div>
        )}
      </section>

      {/* --- Weekly Quest Section — slides in after daily cards --- */}
      <AdaptiveMotion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
      >
        <WeeklyQuestSection />
      </AdaptiveMotion.div>
    </div>
  );
}
