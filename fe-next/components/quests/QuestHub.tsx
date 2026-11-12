'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyMissions } from '@/hooks/useDailyMissions';
import { useWeeklyQuest } from '@/hooks/useWeeklyQuest';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { QuestHero } from './QuestHero';
import { DailyQuestCard } from './DailyQuestCard';
import { QuestFeed } from './QuestFeed';
import { WeeklyQuestSection } from './WeeklyQuestSection';
import { GrandSlamBanner, AllQuestsCompleteBanner } from './QuestBanners';
import { QUEST_KEYFRAMES, PER_QUEST_XP, TOTAL_DAILY } from './questStyles';

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};

const cardVariants = {
  hidden: { y: 24, scale: 0.94, rotate: -1.5 },
  visible: { y: 0, scale: 1, rotate: 0, transition: { type: 'spring' as const, stiffness: 320, damping: 20 } },
};

const sectionVariants = {
  hidden: { y: 16 },
  visible: { y: 0, transition: { type: 'spring' as const, stiffness: 250, damping: 26, delay: 0.35 } },
};

export function QuestHub() {
  const { t } = useLanguage();
  const { missions, isGrandSlam, loading } = useDailyMissions();
  const { isComplete: weeklyComplete } = useWeeklyQuest();

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse" aria-busy="true">
        <div className="h-44 rounded-neo-lg bg-neo-white/10" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={`skel-${i}`} className="h-28 rounded-neo-lg bg-neo-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const dailyCompleted = missions.filter((m) => m.completed).length;

  return (
    <div className="flex flex-col gap-8">
      <style>{QUEST_KEYFRAMES}</style>

      <section aria-label={t('quests.dailyTitle')} className="flex flex-col gap-4">
        <QuestHero completed={dailyCompleted} total={TOTAL_DAILY} />

        <h2 className="font-neo-display text-xl font-bold text-neo-white">{t('quests.dailyTitle')}</h2>

        <AdaptiveMotion.div className="flex flex-col gap-3" variants={listVariants} initial="hidden" animate="visible">
          {missions.map((mission) => (
            <AdaptiveMotion.div key={mission.slot} variants={cardVariants}>
              <DailyQuestCard
                titleKey={mission.titleKey}
                descKey={mission.descKey}
                href={mission.href}
                completed={mission.completed}
                type={mission.type}
                mode={mission.mode}
                xpReward={PER_QUEST_XP}
                index={mission.slot}
              />
            </AdaptiveMotion.div>
          ))}
        </AdaptiveMotion.div>

        {isGrandSlam && <GrandSlamBanner />}
      </section>

      <QuestFeed />

      <AdaptiveMotion.div variants={sectionVariants} initial="hidden" animate="visible">
        <WeeklyQuestSection />
      </AdaptiveMotion.div>

      {isGrandSlam && weeklyComplete && <AllQuestsCompleteBanner />}
    </div>
  );
}
