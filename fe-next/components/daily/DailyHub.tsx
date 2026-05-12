'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Search, CircleDot, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  getDailyChallengeDate,
  getPuzzleNumber,
  getSecondsUntilNextDaily,
  hasPlayedWordHuntToday,
  hasPlayedWordWheelToday,
  getDailyStreak,
} from '@/utils/dailyChallenge';
import { getLastSevenDaysCompletion } from '@/utils/dailyChallenge/storage';
import LastSevenDaysIndicator from './LastSevenDaysIndicator';
import { formatTimeHHMMSS } from '@/shared/utils/timeFormatting';
import type { Language } from '@/types';
import WeeklyChestCard from './WeeklyChestCard';
import WeeklyChestModal from './WeeklyChestModal';
import type { PendingChest } from '@/hooks/useWeeklyChest';

// ==========================================
// Quest Card
// ==========================================

interface QuestCardProps {
  title: string;
  description: string;
  href: string;
  played: boolean;
  icon: React.ReactNode;
  accentColor: string;
  accentBg: string;
  isRTL: boolean;
  t: (key: string) => string;
}

const QuestCard: React.FC<QuestCardProps> = ({
  title,
  description,
  href,
  played,
  icon,
  accentColor,
  accentBg,
  isRTL,
  t,
}) => (
  <Link
    href={href}
    className={cn(
      'flex items-center gap-4 p-4 rounded-neo border-3 border-neo-black shadow-hard-lg',
      'transition-all hover:scale-[1.02]',
      isRTL
        ? 'active:-translate-x-px active:translate-y-px'
        : 'active:translate-x-px active:translate-y-px',
      'active:shadow-hard-pressed',
      played ? 'bg-neo-navy-light/80' : accentBg
    )}
  >
    {/* Icon */}
    <div
      className={cn(
        'w-12 h-12 rounded-full border-3 border-neo-black flex items-center justify-center shrink-0 shadow-hard',
        played ? 'bg-neo-navy-light' : 'bg-neo-white'
      )}
    >
      {icon}
    </div>

    {/* Text */}
    <div className="flex-1 min-w-0">
      <h3 className={cn('font-neo-display font-black text-lg', played ? 'text-neo-cream/70' : 'text-neo-white')}>
        {title}
      </h3>
      <p className={cn('text-sm', played ? 'text-neo-cream/40' : 'text-neo-cream/70')}>
        {description}
      </p>
    </div>

    {/* Status */}
    <div className="shrink-0">
      {played ? (
        <CheckCircle2 className="w-6 h-6 text-neo-lime" />
      ) : (
        <span
          className={cn(
            'px-3 py-1 rounded-neo border-2 border-neo-black font-neo-display font-black text-xs shadow-hard-sm',
            accentColor
          )}
        >
          {t('wordHunt.play')}
        </span>
      )}
    </div>
  </Link>
);

// ==========================================
// Daily Hub
// ==========================================

export default function DailyHub() {
  const { t, language, dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const gameLang = language as Language;

  const date = getDailyChallengeDate();
  const puzzleNumber = getPuzzleNumber(date);
  const streak = getDailyStreak();
  const playedWH = hasPlayedWordHuntToday(gameLang);
  const playedWW = hasPlayedWordWheelToday(gameLang);
  const bothDone = playedWH && playedWW;
  const lastSevenDays = React.useMemo(() => getLastSevenDaysCompletion(gameLang), [gameLang]);

  // Countdown timer
  const [countdown, setCountdown] = React.useState('');
  React.useEffect(() => {
    const update = () => setCountdown(formatTimeHHMMSS(getSecondsUntilNextDaily()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Weekly chest modal
  const [claimedChest, setClaimedChest] = React.useState<PendingChest | null>(null);

  return (
    <div className="flex-1 flex flex-col items-center bg-neo-navy min-h-screen px-4 pt-8 pb-bottom-stack sm:pb-8">
      <motion.div
        className="w-full max-w-md flex flex-col gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="font-neo-display font-black text-3xl sm:text-4xl text-neo-white mb-1">
            {t('daily.title')}
          </h1>
          <span className="text-neo-cream/60 text-sm">
            #{puzzleNumber}
          </span>
        </div>

        {/* Streak & Countdown */}
        <div className="flex items-center justify-center gap-4">
          {streak.currentStreak > 0 && (
            <span className="text-neo-lime font-neo-display font-black text-lg">
              🔥 {streak.currentStreak}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-neo-cream/50 text-sm">
            <Clock className="w-4 h-4" />
            {countdown}
          </span>
        </div>

        {/* Completion badge */}
        {bothDone && (
          <motion.div
            className="mx-auto px-4 py-2 rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-neo-display font-black text-sm shadow-hard"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            ✨ {t('daily.dailyDouble')}
          </motion.div>
        )}

        {/* Last 7 days progress (DEDICATION) */}
        <LastSevenDaysIndicator days={lastSevenDays} />

        {/* Weekly Chest */}
        <WeeklyChestCard onChestClaimed={setClaimedChest} />

        {/* Quest Cards */}
        <div className="flex flex-col gap-3">
          <QuestCard
            title={t('wordWheel.hub.wordHuntQuest')}
            description={t('wordWheel.hub.wordHuntDesc')}
            href={`/${language}/daily/word-hunt`}
            played={playedWH}
            icon={<Search className="w-6 h-6 text-neo-cyan" />}
            accentColor="bg-neo-cyan text-neo-black"
            accentBg="bg-neo-navy-light"
            isRTL={isRTL}
            t={t}
          />
          <QuestCard
            title={t('wordWheel.hub.wordWheelQuest')}
            description={t('wordWheel.hub.wordWheelDesc')}
            href={`/${language}/daily/word-wheel`}
            played={playedWW}
            icon={<CircleDot className="w-6 h-6 text-neo-purple" />}
            accentColor="bg-neo-purple text-neo-white"
            accentBg="bg-neo-navy-light"
            isRTL={isRTL}
            t={t}
          />
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={cn('w-3 h-3 rounded-full border-2 border-neo-black', playedWH ? 'bg-neo-lime' : 'bg-neo-navy-light')} />
          <div className={cn('w-3 h-3 rounded-full border-2 border-neo-black', playedWW ? 'bg-neo-lime' : 'bg-neo-navy-light')} />
          <span className="text-neo-cream/40 text-xs ms-1">
            {playedWH && playedWW ? '2/2' : playedWH || playedWW ? '1/2' : '0/2'}
          </span>
        </div>
      </motion.div>

      {claimedChest && (
        <WeeklyChestModal chest={claimedChest} onClose={() => setClaimedChest(null)} />
      )}
    </div>
  );
}
