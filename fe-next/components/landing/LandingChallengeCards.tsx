'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, Map, Bomb, ChevronDown, Sparkles } from 'lucide-react';
import Link from 'next/link';
import ModeCard from './ModeCard';
import DailyChallengeBanner from '@/components/daily/DailyChallengeBanner';
import { shouldShowGuidance } from '@/utils/contextualGuidanceStorage';

interface DailyChallengePreloadedStats {
  hasPlayed: boolean;
  hasSolved: boolean | null;
  currentStreak: number;
  puzzleNumber: number;
  loading: boolean;
}

interface LandingChallengeCardsProps {
  language: string;
  isAdmin: boolean;
  hasBlastAccess: boolean;
  activePlayers: number;
  openRooms: number;
  totalPlayers: number;
  playerAllTimeBest: { score: number } | null;
  t: (key: string) => string;
  dailyChallengeStats: DailyChallengePreloadedStats;
  solveRate: number | null;
}

const cardMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

/**
 * First-timer hero CTA — single prominent action to reduce choice paralysis.
 * Shows a large Single Player card with encouraging copy.
 * Other modes are collapsed behind "Explore More Modes".
 */
function FirstTimerHero({ language, t }: { language: string; t: (key: string) => string }) {
  const [showMoreModes, setShowMoreModes] = useState(false);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-4">
      {/* Primary CTA — big, inviting, impossible to miss */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="w-full"
      >
        <Link
          href={`/${language}/singleplayer?autoStart=bots`}
          className="block w-full rounded-neo border-neo border-black bg-gradient-to-br from-neo-cyan via-neo-cyan/90 to-neo-cyan/70 p-6 sm:p-8 shadow-hard-lg hover:shadow-hard transition-all hover:scale-[1.02] active:scale-[0.98] active:shadow-hard-pressed cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-full bg-white/20 border-2 border-black flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-neo-display text-xl sm:text-2xl font-bold text-black leading-tight">
                {t('landing.firstTimer.playFirst')}
              </h3>
              <p className="text-black/70 text-sm sm:text-base mt-1 font-neo-body">
                {t('landing.firstTimer.playFirstDesc')}
              </p>
            </div>
            <div className="flex-shrink-0 text-black/60 group-hover:translate-x-1 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Expand trigger for other modes */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={() => setShowMoreModes(!showMoreModes)}
        className="flex items-center gap-2 text-neo-white/60 hover:text-neo-white/90 text-sm font-neo-body transition-colors py-2"
      >
        <span>{t('landing.firstTimer.exploreModes')}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showMoreModes ? 'rotate-180' : ''}`} />
      </motion.button>

      {/* Collapsed mode cards */}
      <AnimatePresence>
        {showMoreModes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <ModeCard
                title={t('landing.multiplayer')}
                description={t('landing.multiplayerDesc')}
                href={`/${language}/multiplayer`}
                icon={<Users className="w-6 h-6" />}
                variant="pink"
              />
              <ModeCard
                title={t('landing.adventureMode')}
                description={t('landing.adventureModeDesc')}
                href={`/${language}/adventure`}
                icon={<Map className="w-6 h-6" />}
                variant="lime"
              />
              <ModeCard
                title={t('landing.singlePlayer')}
                description={t('landing.singlePlayerDesc')}
                href={`/${language}/singleplayer`}
                icon={<User className="w-6 h-6" />}
                variant="cyan"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LandingChallengeCards({
  language,
  isAdmin,
  hasBlastAccess,
  activePlayers,
  openRooms,
  totalPlayers,
  playerAllTimeBest,
  t,
  dailyChallengeStats,
  solveRate,
}: LandingChallengeCardsProps) {
  const [isFirstTimer, setIsFirstTimer] = useState(false);
  useEffect(() => {
    setIsFirstTimer(shouldShowGuidance('firstPlayTutorialCompleted'));
  }, []);

  // First-timer funnel: single prominent CTA to reduce choice paralysis
  if (isFirstTimer) {
    return <FirstTimerHero language={language} t={t} />;
  }

  // Returning players: full mode grid
  return (
    <div className="w-full max-w-4xl mx-auto xl:max-w-5xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 items-stretch">
        {/* Single Player (cyan) */}
        <motion.div {...cardMotion} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.05 }} className="w-full h-full">
          <ModeCard
            title={t('landing.singlePlayer')}
            description={t('landing.singlePlayerDesc')}
            href={`/${language}/singleplayer`}
            icon={<User className="w-6 h-6" />}
            variant="cyan"
            personalBest={playerAllTimeBest ? { score: playerAllTimeBest.score, label: t('landing.personalBest') } : undefined}
          />
        </motion.div>

        {/* Multiplayer (pink) */}
        <motion.div {...cardMotion} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.1 }} className="w-full h-full">
          <ModeCard
            title={t('landing.multiplayer')}
            description={t('landing.multiplayerDesc')}
            href={`/${language}/multiplayer`}
            icon={<Users className="w-6 h-6" />}
            variant="pink"
            liveBadge={{ openRooms, totalPlayers, roomsLabel: t('landing.openRooms'), playersLabel: t('landing.playersLive') }}
            playerCount={{ count: activePlayers, label: t('landing.playingNow') }}
          />
        </motion.div>

        {/* Daily Challenge Banner */}
        <motion.div {...cardMotion} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.15 }} className="w-full h-full">
          <DailyChallengeBanner preloadedStats={dailyChallengeStats} />
          {solveRate !== null && (
            <p className="text-center text-neo-white/50 text-xs mt-1 font-medium">
              {t('landing.solvedPercent').replace('{percent}', String(solveRate))}
            </p>
          )}
        </motion.div>

        {/* Adventure Mode */}
        <motion.div {...cardMotion} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.25 }} className="w-full h-full">
          <ModeCard
            title={t('landing.adventureMode')}
            description={t('landing.adventureModeDesc')}
            href={`/${language}/adventure`}
            icon={<Map className="w-6 h-6" />}
            variant="lime"
          />
        </motion.div>

        {/* Blast Mode (admin only) */}
        {(isAdmin || hasBlastAccess) && (
          <motion.div {...cardMotion} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.35 }} className="w-full h-full max-w-md mx-auto xl:max-w-none">
            <ModeCard
              title={t('landing.blastMode')}
              description={t('landing.blastModeDesc')}
              href={`/${language}/blast`}
              icon={<Bomb className="w-6 h-6" />}
              variant="orange"
              secondary
              badge="ADMIN"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
