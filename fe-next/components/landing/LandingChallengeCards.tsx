'use client';

import { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { User, Users, Map, Bomb } from 'lucide-react';
import ModeCard from './ModeCard';

const DailyChallengeBanner = lazy(() => import('@/components/daily/DailyChallengeBanner'));

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
  initial: { opacity: 0, y: 20, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

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
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6 items-stretch">
        {/* Daily Challenge Banner - full width */}
        <div className="col-span-1 sm:col-span-2">
          <Suspense fallback={
            <div
              className="w-full p-3 sm:p-4 rounded-neo border-3 border-neo-black shadow-hard-lg bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500"
              style={{ minHeight: '72px' }}
            >
              <div className="flex items-center gap-3 sm:gap-4 animate-pulse">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-neo bg-neo-navy shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-6 w-40 bg-neo-black/15 rounded" />
                  <div className="h-4 w-28 bg-neo-black/10 rounded" />
                </div>
              </div>
            </div>
          }>
            <DailyChallengeBanner preloadedStats={dailyChallengeStats} />
          </Suspense>
          {solveRate !== null && (
            <p className="text-center text-neo-white/50 text-xs mt-1 font-medium">
              {t('landing.solvedPercent').replace('{percent}', String(solveRate))}
            </p>
          )}
        </div>

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

        {/* Single Player (cyan) */}
        <motion.div {...cardMotion} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.2 }} className="w-full h-full">
          <ModeCard
            title={t('landing.singlePlayer')}
            description={t('landing.singlePlayerDesc')}
            href={`/${language}/singleplayer`}
            icon={<User className="w-6 h-6" />}
            variant="cyan"
            personalBest={playerAllTimeBest ? { score: playerAllTimeBest.score, label: t('landing.personalBest') } : undefined}
          />
        </motion.div>

        {/* Adventure Mode - full width */}
        <motion.div {...cardMotion} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.35 }} className="col-span-1 sm:col-span-2 w-full">
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
          <div className="col-span-1 sm:col-span-2 w-full max-w-md mx-auto">
            <ModeCard
              title={t('landing.blastMode')}
              description={t('landing.blastModeDesc')}
              href={`/${language}/blast`}
              icon={<Bomb className="w-6 h-6" />}
              variant="orange"
              secondary
              badge="ADMIN"
            />
          </div>
        )}
      </div>
    </div>
  );
}
