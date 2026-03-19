'use client';

import { motion } from 'framer-motion';
import { User, Users, Map, Bomb } from 'lucide-react';
import ModeCard from './ModeCard';
import DailyChallengeBanner from '@/components/daily/DailyChallengeBanner';

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

/** Scroll-triggered entrance — only animates when cards enter viewport */
const cardInitial = { opacity: 0, y: 20, scale: 0.96 };
const cardVisible = { opacity: 1, y: 0, scale: 1 };
const cardViewport = { once: true, margin: '-40px' };

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
    <div className="w-full max-w-4xl mx-auto xl:max-w-5xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 items-stretch">
        {/* Single Player (cyan) */}
        <motion.div initial={cardInitial} whileInView={cardVisible} viewport={cardViewport} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.0 }} className="w-full h-full">
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
        <motion.div initial={cardInitial} whileInView={cardVisible} viewport={cardViewport} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.07 }} className="w-full h-full">
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
        <motion.div initial={cardInitial} whileInView={cardVisible} viewport={cardViewport} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.14 }} className="w-full h-full">
          <DailyChallengeBanner preloadedStats={dailyChallengeStats} />
          {solveRate !== null && (
            <p className="text-center text-neo-white/50 text-xs mt-1 font-medium">
              {t('landing.solvedPercent').replace('{percent}', String(solveRate))}
            </p>
          )}
        </motion.div>

        {/* Adventure Mode */}
        <motion.div initial={cardInitial} whileInView={cardVisible} viewport={cardViewport} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.21 }} className="w-full h-full">
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
          <motion.div initial={cardInitial} whileInView={cardVisible} viewport={cardViewport} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.28 }} className="w-full h-full max-w-md mx-auto xl:max-w-none">
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
