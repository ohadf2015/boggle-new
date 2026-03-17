'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { DailyChallengeCard } from './DailyChallengeCard';
import { WeeklyChallengeCard } from './WeeklyChallengeCard';
import type { DailyChallengeRow, WeeklyQuestRow } from '@/lib/supabase/education/types';
import { PageLoader } from '@/components/ui/PageLoader';
import { cn } from '@/lib/utils';
import { Sun, Calendar, Trophy } from 'lucide-react';

// --- Animation variants ---

const panelEntrance = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const sectionReveal = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

const cardStagger = {
  hidden: { opacity: 0, x: -12, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 350, damping: 22 },
  },
};

interface ChallengePanelProps {
  playerId: string;
  className?: string;
}

export function ChallengePanel({ playerId, className = '' }: ChallengePanelProps) {
  const { t } = useLanguage();
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallengeRow[]>([]);
  const [weeklyQuests, setWeeklyQuests] = useState<WeeklyQuestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChallenges = async () => {
    setLoading(true);
    const [dailyRes, weeklyRes] = await Promise.all([
      fetch('/api/education/challenges/daily'),
      fetch('/api/education/challenges/weekly'),
    ]);
    const [dailyJson, weeklyJson] = await Promise.all([
      dailyRes.json(),
      weeklyRes.json(),
    ]);
    if (dailyRes.ok && dailyJson.challenges) {
      setDailyChallenges(dailyJson.challenges);
    }
    if (weeklyRes.ok && weeklyJson.quests) {
      setWeeklyQuests(weeklyJson.quests);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadChallenges();
  }, [playerId]);

  async function handleClaimChallenge(challengeId: string) {
    await fetch('/api/education/challenges/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId }),
    });
    loadChallenges();
  }

  async function handleClaimQuest(questId: string) {
    await fetch('/api/education/challenges/weekly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questId }),
    });
    loadChallenges();
  }

  if (loading) return <PageLoader text={t('challenges.loading')} size="lg" nested />;

  const hasContent = dailyChallenges.length > 0 || weeklyQuests.length > 0;

  return (
    <motion.div
      className={cn('space-y-6', className)}
      data-testid="challenge-panel"
      variants={panelEntrance}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
    >
      {!hasContent && (
        <motion.div
          variants={sectionReveal}
          className={cn(
            'flex flex-col items-center gap-4 py-10 px-6',
            'bg-neo-navy border-3 border-black rounded-neo shadow-hard text-center'
          )}
        >
          <motion.div
            className="w-14 h-14 rounded-neo bg-neo-yellow border-3 border-black flex items-center justify-center shadow-hard-sm"
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Trophy className="w-7 h-7 text-black" />
          </motion.div>
          <p className="text-neo-white/60 font-neo-body font-bold">
            {t('challenges.noChallenges')}
          </p>
        </motion.div>
      )}

      {dailyChallenges.length > 0 && (
        <motion.div variants={sectionReveal}>
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className="w-8 h-8 rounded-neo bg-neo-yellow border-3 border-black flex items-center justify-center shadow-hard-sm"
              whileHover={{ scale: 1.15, rotate: -8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Sun className="w-4 h-4 text-black" />
            </motion.div>
            <h2 className="font-neo-display text-xl font-black text-neo-white uppercase tracking-tight">
              {t('challenges.daily.title')}
            </h2>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.3 }}
              className="px-2 py-0.5 border-3 border-black text-[10px] font-black rounded-neo shadow-hard-sm uppercase tracking-widest bg-neo-yellow text-black"
            >
              {dailyChallenges.length}
            </motion.span>
          </div>
          <motion.div
            className="space-y-3"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          >
            {dailyChallenges.map((challenge) => (
              <motion.div key={challenge.id} variants={cardStagger}>
                <DailyChallengeCard
                  challenge={challenge}
                  onClaim={handleClaimChallenge}
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}

      {weeklyQuests.length > 0 && (
        <motion.div variants={sectionReveal}>
          <div className="h-1 bg-neo-white/10 rounded-neo my-6" />
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className="w-8 h-8 rounded-neo bg-neo-cyan border-3 border-black flex items-center justify-center shadow-hard-sm"
              whileHover={{ scale: 1.15, rotate: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Calendar className="w-4 h-4 text-black" />
            </motion.div>
            <h2 className="font-neo-display text-xl font-black text-neo-white uppercase tracking-tight">
              {t('challenges.weekly.title')}
            </h2>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.3 }}
              className="px-2 py-0.5 border-3 border-black text-[10px] font-black rounded-neo shadow-hard-sm uppercase tracking-widest bg-neo-cyan text-black"
            >
              {weeklyQuests.length}
            </motion.span>
          </div>
          <motion.div
            className="space-y-3"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          >
            {weeklyQuests.map((quest) => (
              <motion.div key={quest.id} variants={cardStagger}>
                <WeeklyChallengeCard
                  quest={quest}
                  onClaim={handleClaimQuest}
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
