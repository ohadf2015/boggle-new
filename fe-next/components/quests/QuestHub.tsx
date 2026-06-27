'use client';

/**
 * QuestHub — Unified daily + weekly quest page.
 *
 * Combines daily missions (3 quests, no brain drill) with weekly quest.
 * Enhanced RPG aesthetic with bigger icons, colored circles, star rewards.
 *
 * Design: RPG Quest Board meets Neo-Brutalist.
 */

import { useEffect, useMemo, useRef } from 'react';
import { Trophy, Gift, Sparkles, Target, Flame, Puzzle, Swords, Compass } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyMissions } from '@/hooks/useDailyMissions';
import type { QuestFamily } from '@/shared/dailyQuestPool';
import { useWeeklyQuest } from '@/hooks/useWeeklyQuest';
import { cn } from '@/lib/utils';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { QuestProgressRing } from './QuestProgressRing';
import { QuestCard } from './QuestCard';
import { QuestFeed } from './QuestFeed';
import { useCoinsFromContext } from '@/contexts/CoinContext';
import PartPreview from '@/components/avatar/PartPreview';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';
import type { AvatarPartReward } from '@/shared/weeklyQuestTemplates';

interface AllCompleteClaimResponse {
  success: boolean;
  claimed: boolean;
  xpReward: number;
  coinReward: number;
}

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

// --- Quest family visual styles (color-coded by family, not mode) ---
const FAMILY_STYLE: Record<
  QuestFamily,
  { icon: React.ElementType; accentColor: string; ringColor: string; iconColorClass: string }
> = {
  skill: { icon: Trophy, accentColor: 'bg-neo-cyan', ringColor: 'stroke-neo-cyan', iconColorClass: 'text-neo-cyan' },
  pvp: { icon: Swords, accentColor: 'bg-neo-pink', ringColor: 'stroke-neo-pink', iconColorClass: 'text-neo-pink' },
  discovery: { icon: Compass, accentColor: 'bg-neo-purple', ringColor: 'stroke-neo-purple', iconColorClass: 'text-neo-purple' },
};

const PER_QUEST_XP = 100;
const TOTAL_DAILY = 3;

// --- Weekly quest difficulty colors ---
const DIFFICULTY_STYLES: Record<string, { color: string; border: string; bg: string }> = {
  easy: { color: 'text-green-400', border: 'border-green-400/50', bg: 'bg-green-400/15' },
  medium: { color: 'text-yellow-400', border: 'border-yellow-400/50', bg: 'bg-yellow-400/15' },
  hard: { color: 'text-red-400', border: 'border-red-400/50', bg: 'bg-red-400/15' },
};

function AvatarPartBadge({ reward, t, size = 'sm' }: {
  reward: AvatarPartReward;
  t: (key: string) => string;
  size?: 'sm' | 'md';
}) {
  if (!reward) return null;
  const partType = reward.category as 'eyes' | 'mouth' | 'hair' | 'accessory' | 'eyebrows' | 'facialHair';
  const previewSize = size === 'md' ? 28 : 20;
  return (
    <span className="inline-flex items-center gap-1 text-neo-pink">
      <PartPreview
        partType={partType}
        partName={reward.partId}
        config={DEFAULT_AVATAR_CONFIG}
        size={previewSize}
      />
      <span className={cn(
        'font-bold',
        size === 'md' ? 'text-sm' : 'text-[10px]',
      )}>
        {t(`quests.avatarPartCategory.${reward.category}`)}
      </span>
    </span>
  );
}

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
        className="absolute inset-0 bg-linear-to-r from-transparent via-neo-yellow/10 to-transparent animate-shimmer"
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
          <p className="font-neo-body text-sm text-neo-white font-medium">
            {t('quests.grandSlamBonus')}
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-black text-neo-cyan">
            <Puzzle className="w-3 h-3" aria-hidden="true" />
            {t('quests.grandSlamAvatar')}
          </span>
        </div>
      </div>
      <Flame className="w-6 h-6 text-neo-yellow/60 animate-bob shrink-0" aria-hidden="true" />
    </div>
  );
}

function WeeklyQuestSection() {
  const { t } = useLanguage();
  const { activeQuest, availableQuests, isComplete, loading, selectQuest, selectingQuestId } = useWeeklyQuest();

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
          'bg-neo-navy-light',
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
              {activeQuest.avatarPartReward ? (
                <AvatarPartBadge reward={activeQuest.avatarPartReward} t={t} size="md" />
              ) : (
                <span className="inline-flex items-center gap-1 text-sm font-bold text-neo-pink">
                  <Puzzle className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('quests.avatarReward')}
                </span>
              )}
            </div>
            <p className="font-neo-body text-xs text-neo-white">
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
            <p className="font-neo-body text-sm text-neo-white font-medium">
              {t(activeQuest.description, { target: activeQuest.displayTarget ?? activeQuest.target })}
            </p>
            {/* Reward preview */}
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 font-black text-neo-cyan">
                {t('weeklyQuest.xpReward', { xp: activeQuest.xpReward })}
              </span>
              {activeQuest.avatarPartReward ? (
                <AvatarPartBadge reward={activeQuest.avatarPartReward} t={t} />
              ) : (
                <span className="inline-flex items-center gap-1 font-black text-neo-pink">
                  <Puzzle className="w-3 h-3" aria-hidden="true" />
                  {t('quests.avatarReward')}
                </span>
              )}
            </div>
            {/* Progress bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-neo-body font-bold text-neo-white">
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
                  className="h-full bg-linear-to-r from-neo-cyan to-neo-cyan-light rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, (activeQuest.current / activeQuest.target) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-neo-body text-xs text-neo-white leading-relaxed">
              {t('weeklyQuest.intro')}
            </p>
            <p className="font-neo-body text-sm font-bold text-neo-white">
              {t('weeklyQuest.choose')}
            </p>
            <div className="grid gap-2">
              {availableQuests.map((quest) => {
                const style = DIFFICULTY_STYLES[quest.difficulty] || DIFFICULTY_STYLES.easy;
                const isSelecting = selectingQuestId === quest.id;
                return (
                  <button
                    type="button"
                    key={quest.id}
                    onClick={() => selectQuest(quest.id)}
                    disabled={!!selectingQuestId}
                    className={cn(
                      'flex items-center justify-between p-3',
                      'rounded-neo border-2',
                      'shadow-hard-sm',
                      'transition-all duration-200',
                      isSelecting
                        ? [
                            'border-neo-cyan bg-neo-cyan/15',
                            'ring-2 ring-neo-cyan/60',
                            'shadow-hard scale-[1.02]',
                          ]
                        : [
                            'border-neo-black bg-neo-navy/60',
                            'hover:-translate-y-0.5 hover:shadow-hard',
                            'active:translate-y-px active:shadow-hard-pressed',
                          ],
                      selectingQuestId && !isSelecting && 'opacity-40',
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
                      <span className="font-neo-body text-sm text-neo-white text-start">
                        {t(quest.description, { target: quest.displayTarget ?? quest.target })}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 ms-3 shrink-0">
                      <span className="font-neo-display text-sm font-black text-neo-cyan">
                        {t('quests.reward.xp', { xp: quest.xpReward })}
                      </span>
                      <AvatarPartBadge reward={quest.avatarPartReward} t={t} />
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

function AllQuestsCompleteBanner({ t }: { t: (key: string) => string }) {
  return (
    <AdaptiveMotion.div
      className="mt-4"
      variants={grandSlamVariants}
      initial="hidden"
      animate="visible"
    >
      <div
        className={cn(
          'relative overflow-hidden',
          'flex items-center gap-4 p-5 rounded-neo-lg',
          'border-3 border-neo-lime bg-linear-to-br from-neo-lime/15 via-neo-navy to-neo-cyan/10',
          'shadow-hard animate-neo-pop',
        )}
        role="status"
        aria-live="polite"
      >
        <div
          className="absolute inset-0 bg-linear-to-r from-transparent via-neo-lime/10 to-transparent animate-shimmer"
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-neo-lime/20 border-2 border-neo-lime flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-neo-lime" aria-hidden="true" />
          </div>
          <Trophy className="w-5 h-5 text-neo-yellow animate-float" aria-hidden="true" />
        </div>
        <div className="relative flex-1">
          <p className="font-neo-display text-lg font-black text-neo-lime">
            {t('quests.allComplete')}
          </p>
          <p className="font-neo-body text-sm text-neo-white font-medium mt-0.5">
            {t('quests.allCompleteDesc')}
          </p>
        </div>
      </div>
    </AdaptiveMotion.div>
  );
}

export function QuestHub() {
  const { t } = useLanguage();
  const { missions, isGrandSlam, loading } =
    useDailyMissions();
  const { isComplete: weeklyComplete } = useWeeklyQuest();
  const { refreshCoins } = useCoinsFromContext();
  const claimAttemptedRef = useRef<boolean>(false);

  // Show "All Quests Complete" celebration when both daily + weekly are done.
  // Server idempotency (all_quests_complete_celebrated flag) ensures reward fires at most once,
  // so we can gate on the steady-state condition without worrying about transitions.
  const allComplete = isGrandSlam && weeklyComplete;
  useEffect(() => {
    if (!loading && allComplete && !claimAttemptedRef.current) {
      claimAttemptedRef.current = true;
      // POST to server endpoint for idempotent reward claim
      fetch('/api/quests/all-complete-claim', {
        method: 'POST',
      })
        .then(res => res.json() as Promise<AllCompleteClaimResponse>)
        .then(json => {
          if (json.success && json.claimed) {
            // Reward was genuinely claimed — update coin balance and show toast
            refreshCoins();
            import('./QuestCompletionToast').then(({ showQuestCompletionToast }) => {
              showQuestCompletionToast({
                questName: '',
                xpReward: json.xpReward,
                goldReward: json.coinReward,
                isAllComplete: true,
                t,
              });
            });
          }
        })
        .catch(() => {
          // Network error — leave claimAttemptedRef true to avoid infinite retries
          // (mount was tainted; user can reload to retry)
        });
    }
  }, [allComplete, loading, t, refreshCoins]);

  const dailyCompleted = useMemo(
    () => missions.filter((m) => m.completed).length,
    [missions],
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 animate-pulse" aria-busy="true">
        <div className="h-8 w-32 bg-neo-white/10 rounded-neo" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={`skel-${i}`} className="h-24 bg-neo-white/5 rounded-neo-lg" />
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
          {missions.map((mission) => {
            const style = FAMILY_STYLE[mission.family];
            return (
              <AdaptiveMotion.div key={mission.slot} variants={cardVariants}>
                <QuestCard
                  icon={style.icon}
                  nameKey={mission.titleKey}
                  descKey={mission.descKey}
                  completed={mission.completed}
                  href={mission.href}
                  accentColor={style.accentColor}
                  ringColor={style.ringColor}
                  iconColorClass={style.iconColorClass}
                  xpReward={PER_QUEST_XP}
                />
              </AdaptiveMotion.div>
            );
          })}
        </AdaptiveMotion.div>

        {/* Grand Slam — show when all daily quests done (claimed or unclaimed) */}
        {isGrandSlam && (
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

      {/* Social proof — recent brag-worthy wins across all players */}
      <QuestFeed />

      {/* --- Weekly Quest Section — slides in after daily cards --- */}
      <AdaptiveMotion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
      >
        <WeeklyQuestSection />
      </AdaptiveMotion.div>

      {/* --- All Quests Complete Banner --- */}
      {isGrandSlam && weeklyComplete && (
        <AllQuestsCompleteBanner t={t} />
      )}
    </div>
  );
}
