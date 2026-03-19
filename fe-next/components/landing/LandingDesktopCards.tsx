'use client';

import { Suspense, lazy } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Users, Trophy, Map, Bomb } from 'lucide-react';
import { cn } from '@/lib/utils';
import ModeCard from './ModeCard';
import { LandingShareBanner } from './LandingShareBanner';

const DailyChallengeBanner = lazy(() => import('@/components/daily/DailyChallengeBanner'));

interface DailyChallengePreloadedStats {
  hasPlayed: boolean;
  hasSolved: boolean | null;
  currentStreak: number;
  puzzleNumber: number;
  loading: boolean;
}

interface LandingDesktopCardsProps {
  language: string;
  isAdmin: boolean;
  hasBlastAccess: boolean;
  activePlayers: number;
  openRooms: number;
  totalPlayers: number;
  playerAllTimeBest: { score: number } | null;
  t: (key: string) => string;
  onShareClick: () => void;
  dailyChallengeStats: DailyChallengePreloadedStats;
}

export function LandingDesktopCards({
  language,
  isAdmin,
  hasBlastAccess,
  activePlayers,
  openRooms,
  totalPlayers,
  playerAllTimeBest,
  t,
  onShareClick,
  dailyChallengeStats,
}: LandingDesktopCardsProps): React.JSX.Element {
  return (
    <div className="w-full animate-fade-in-fast flex flex-col items-center justify-center">
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch px-4 lg:px-6">
        {/* Single Player (cyan) */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.05 }}
          className="w-full h-full"
        >
          <ModeCard
            title={t('landing.singlePlayer')}
            description={t('landing.singlePlayerDesc')}
            href={`/${language}/singleplayer`}
            icon={<User className="w-6 h-6" />}
            variant="cyan"
            className="w-full"
            personalBest={playerAllTimeBest ? {
              score: playerAllTimeBest.score,
              label: t('landing.personalBest'),
            } : undefined}
          />
        </motion.div>

        {/* Multiplayer (pink) */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.1 }}
          className="w-full h-full"
        >
          <ModeCard
            title={t('landing.multiplayer')}
            description={t('landing.multiplayerDesc')}
            href={`/${language}/multiplayer`}
            icon={<Users className="w-6 h-6" />}
            variant="pink"
            className="w-full"
            liveBadge={{
              openRooms,
              totalPlayers,
              roomsLabel: t('landing.openRooms'),
              playersLabel: t('landing.playersLive'),
            }}
            playerCount={{
              count: activePlayers,
              label: t('landing.playingNow'),
            }}
          />
        </motion.div>

        {/* Daily Challenge Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.15 }}
          className="col-span-1 sm:col-span-2 lg:col-span-1 w-full h-full"
        >
          <Suspense fallback={
            <div
              className="w-full h-full p-3 sm:p-4 rounded-neo border-3 border-neo-black shadow-hard-lg bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500"
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
        </motion.div>

        {/* Adventure Mode */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.25 }}
          className="col-span-1 sm:col-span-2 lg:col-span-1 w-full h-full"
        >
          <ModeCard
            title={t('landing.adventureMode')}
            description={t('landing.adventureModeDesc')}
            href={`/${language}/adventure`}
            icon={<Map className="w-6 h-6" />}
            variant="lime"
            className="w-full"
          />
        </motion.div>

        {/* Blast Mode (admin/blast_access only) */}
        {(isAdmin || hasBlastAccess) && (
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full max-w-md mx-auto">
            <ModeCard
              title={t('landing.blastMode')}
              description={t('landing.blastModeDesc')}
              href={`/${language}/blast`}
              icon={<Bomb className="w-6 h-6" />}
              variant="orange"
              secondary
              badge="ADMIN"
              className="w-full"
            />
          </div>
        )}

        {/* Leaderboard quick link */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.4 }}
          className="col-span-1 sm:col-span-2 lg:col-span-3 flex justify-center"
        >
          <Link
            href={`/${language}/leaderboard`}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5',
              'text-neo-white/80 hover:text-neo-white',
              'font-bold text-sm',
              'rounded-neo border-2 border-neo-white/15 hover:border-neo-yellow/40',
              'hover:bg-neo-white/5',
              'transition-all duration-200',
              'group'
            )}
          >
            <Trophy className="w-4 h-4 text-neo-yellow group-hover:scale-110 transition-transform" />
            <span>{t('footer.leaderboard')}</span>
          </Link>
        </motion.div>

        {/* Share banner */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-3">
          <LandingShareBanner onShareClick={onShareClick} />
        </div>
      </div>
    </div>
  );
}
