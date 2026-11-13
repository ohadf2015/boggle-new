'use client';

import { Puzzle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWeeklyQuest } from '@/hooks/useWeeklyQuest';
import { cn } from '@/lib/utils';
import PartPreview from '@/components/avatar/PartPreview';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';
import type { AvatarPartReward } from '@/shared/weeklyQuestTemplates';

type Translate = ReturnType<typeof useLanguage>['t'];

const DIFFICULTY_CHIP: Record<string, string> = {
  easy: 'bg-neo-lime',
  medium: 'bg-neo-yellow',
  hard: 'bg-neo-pink',
};
const BAR_SEGMENTS = 10;

function DifficultyChip({ difficulty, t }: { difficulty: string; t: Translate }) {
  return (
    <span
      className={cn(
        'rounded-neo-sm border-2 border-neo-black px-2 py-0.5',
        'font-neo-display text-xs font-black uppercase text-neo-black',
        DIFFICULTY_CHIP[difficulty] ?? DIFFICULTY_CHIP.easy,
      )}
    >
      {t(`weeklyQuest.${difficulty}`)}
    </span>
  );
}

function AvatarPartBadge({ reward, t, size = 'sm' }: { reward: AvatarPartReward; t: Translate; size?: 'sm' | 'md' }) {
  if (!reward) return null;
  const partType = reward.category as 'eyes' | 'mouth' | 'hair' | 'accessory' | 'eyebrows' | 'facialHair';
  return (
    <span className="inline-flex items-center gap-1 text-neo-pink">
      <PartPreview partType={partType} partName={reward.partId} config={DEFAULT_AVATAR_CONFIG} size={size === 'md' ? 28 : 20} />
      <span className={cn('font-bold', size === 'md' ? 'text-sm' : 'text-[10px]')}>
        {t(`quests.avatarPartCategory.${reward.category}`)}
      </span>
    </span>
  );
}

function AvatarFallback({ t }: { t: Translate }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold text-neo-pink">
      <Puzzle className="size-3.5" aria-hidden="true" />
      {t('quests.avatarReward')}
    </span>
  );
}

function SegmentBar({ current, target }: { current: number; target: number }) {
  const ratio = target > 0 ? Math.min(1, current / target) : 0;
  const lit = Math.round(ratio * BAR_SEGMENTS);
  return (
    <div
      className="flex h-5 gap-1 rounded-neo-sm border-3 border-neo-black bg-neo-navy p-0.5"
      role="progressbar"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {Array.from({ length: BAR_SEGMENTS }, (_, i) => (
        <span
          key={i}
          className={cn('flex-1 rounded-[2px] transition-colors duration-500', i < lit ? 'bg-neo-cyan' : 'bg-neo-white/10')}
          style={{ transitionDelay: `${i * 40}ms` }}
        />
      ))}
    </div>
  );
}

export function WeeklyQuestSection() {
  const { t } = useLanguage();
  const { activeQuest, availableQuests, isComplete, loading, selectQuest, selectingQuestId } = useWeeklyQuest();

  if (loading) return null;

  return (
    <section aria-label={t('quests.weeklyTitle')}>
      <div className="mb-3 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- small pre-sized sticker */}
        <img
          src={'/quests/crown.webp'}
          width={40}
          height={40}
          alt=""
          className="size-10 -rotate-12 rtl:rotate-12 object-contain motion-safe:animate-[quest-bob_3.2s_ease-in-out_infinite]"
        />
        <h2 className="font-neo-display text-lg font-bold text-neo-white">{t('quests.weeklyTitle')}</h2>
      </div>

      <div className="rounded-neo-lg border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard">
        {isComplete && activeQuest ? (
          <div className="flex flex-col items-center gap-3 py-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- small pre-sized sticker */}
            <img
              src={'/quests/chest.webp'}
              width={72}
              height={72}
              alt=""
              className="size-18 object-contain motion-safe:animate-[quest-chest-pop_600ms_cubic-bezier(0.34,1.56,0.64,1)_both]"
            />
            <span className="font-neo-display text-xl font-black text-neo-yellow">{t('weeklyQuest.complete')}</span>
            <div className="flex items-center gap-3">
              <span className="rounded-neo-sm border-2 border-neo-black bg-neo-cyan px-2 py-0.5 font-neo-display text-sm font-black text-neo-black">
                {t('weeklyQuest.xpReward', { xp: activeQuest.xpReward })}
              </span>
              {activeQuest.avatarPartReward ? (
                <AvatarPartBadge reward={activeQuest.avatarPartReward} t={t} size="md" />
              ) : (
                <AvatarFallback t={t} />
              )}
            </div>
            <p className="font-neo-body text-xs text-neo-white">{t('weeklyQuest.newQuestMonday')}</p>
          </div>
        ) : activeQuest ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-neo-display text-sm font-bold text-neo-cyan">{t('weeklyQuest.active')}</span>
              <DifficultyChip difficulty={activeQuest.difficulty} t={t} />
            </div>
            <p className="font-neo-body text-base font-medium text-neo-white">
              {t(activeQuest.description, { target: activeQuest.displayTarget ?? activeQuest.target })}
            </p>
            <div className="flex items-center gap-3 text-xs">
              <span className="rounded-neo-sm border-2 border-neo-black bg-neo-cyan px-1.5 py-px font-neo-display font-black text-neo-black">
                {t('weeklyQuest.xpReward', { xp: activeQuest.xpReward })}
              </span>
              {activeQuest.avatarPartReward ? (
                <AvatarPartBadge reward={activeQuest.avatarPartReward} t={t} />
              ) : (
                <AvatarFallback t={t} />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-neo-body text-xs font-bold text-neo-white tabular-nums">
                {t('weeklyQuest.progress', { current: activeQuest.current, target: activeQuest.target })}
              </span>
              <SegmentBar current={activeQuest.current} target={activeQuest.target} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-neo-body text-sm leading-relaxed text-neo-white">{t('weeklyQuest.intro')}</p>
            <p className="font-neo-display text-base font-bold text-neo-white">{t('weeklyQuest.choose')}</p>
            <div className="grid gap-2.5">
              {availableQuests.map((quest) => {
                const isSelecting = selectingQuestId === quest.id;
                return (
                  <button
                    type="button"
                    key={quest.id}
                    onClick={() => selectQuest(quest.id)}
                    disabled={!!selectingQuestId}
                    className={cn(
                      'flex items-center justify-between gap-3 p-3 text-start',
                      'rounded-neo border-3 shadow-hard-sm transition duration-200',
                      isSelecting
                        ? 'scale-[1.02] border-neo-cyan bg-neo-cyan/15 shadow-hard'
                        : 'border-neo-black bg-neo-navy hover:-translate-y-0.5 hover:shadow-hard active:translate-y-px active:shadow-hard-pressed',
                      selectingQuestId && !isSelecting && 'opacity-40',
                    )}
                  >
                    <div className="flex flex-col items-start gap-1.5">
                      <DifficultyChip difficulty={quest.difficulty} t={t} />
                      <span className="font-neo-body text-sm text-neo-white">
                        {t(quest.description, { target: quest.displayTarget ?? quest.target })}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
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
