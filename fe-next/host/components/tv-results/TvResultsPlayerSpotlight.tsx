'use client';

import { memo, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Avatar from '../../../components/Avatar';
import { cn } from '../../../lib/utils';
import { assignArchetypes, type SpotlightPlayer } from './playerSpotlightEngine';
import type { Avatar as AvatarType } from '@/shared/types/game';

interface PlayerData {
  username: string;
  score: number;
  avatar?: AvatarType | null;
  allWords?: SpotlightPlayer['allWords'];
}

interface TvResultsPlayerSpotlightProps {
  players: PlayerData[];
  visible: boolean;
  gameDuration?: number;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const MAX_VISIBLE = 8;

const MASCOT_INTRO_KEYS = [
  'tvResults.spotlight.mascotIntro1',
  'tvResults.spotlight.mascotIntro2',
  'tvResults.spotlight.mascotIntro3',
  'tvResults.spotlight.mascotIntro4',
  'tvResults.spotlight.mascotIntro5',
];

// Seeded RNG (same as TvResultsAwards)
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const TvResultsPlayerSpotlight = memo<TvResultsPlayerSpotlightProps>(({
  players,
  visible,
  gameDuration = 180,
  t,
}) => {
  const seed = useMemo(() => {
    return players.reduce((s, p) => s + p.score, 0) || 1;
  }, [players]);

  // Mascot intro (deterministic per game, different offset than awards)
  const mascotIntro = useMemo(() => {
    const rng = seededRandom(seed + 99);
    const idx = Math.floor(rng() * MASCOT_INTRO_KEYS.length);
    return t(MASCOT_INTRO_KEYS[idx]);
  }, [seed, t]);

  // Compute archetype assignments
  const assignments = useMemo(() => {
    if (!players || players.length === 0) return [];
    const spotlightPlayers: SpotlightPlayer[] = players.map(p => ({
      username: p.username,
      score: p.score,
      allWords: p.allWords,
      avatar: p.avatar,
    }));
    return assignArchetypes(spotlightPlayers, gameDuration, seed);
  }, [players, gameDuration, seed]);

  if (assignments.length === 0) return null;

  const visibleAssignments = assignments.slice(0, MAX_VISIBLE);
  const remaining = assignments.length - MAX_VISIBLE;

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-4"
        >
          {/* Mascot Speech Bubble */}
          <m.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative inline-block bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard-sm px-4 py-2 mb-2"
          >
            <p className="font-black text-neo-black text-sm italic">
              {mascotIntro}
            </p>
            <div
              className="absolute -bottom-2 left-6 w-4 h-4 bg-neo-cream border-b-3 border-r-3 border-neo-black"
              style={{ transform: 'rotate(45deg)' }}
            />
          </m.div>

          {/* Section Heading */}
          <m.h3
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="text-xl font-black uppercase tracking-wide text-neo-cream"
          >
            {t('tvResults.spotlight.heading')}
          </m.h3>

          {/* Player Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleAssignments.map((assignment, index) => {
              const { player, archetype, quip, keyStat } = assignment;
              const originalPlayer = players.find(p => p.username === player.username);

              return (
                <m.div
                  key={player.username}
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.15,
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                  }}
                  className={cn(
                    'relative p-4 rounded-neo border-4 border-neo-black shadow-hard',
                    archetype.color
                  )}
                >
                  {/* Avatar (top-right) */}
                  <div className="absolute -top-3 -right-3">
                    <Avatar

                      avatarImage={originalPlayer?.avatar?.avatarImage}
                      customAvatar={originalPlayer?.avatar?.customAvatar}
                      size="sm"
                      className="border-3 border-neo-black shadow-hard-sm"
                    />
                  </div>

                  {/* Archetype Title */}
                  <h4 className="font-black text-base uppercase text-neo-black mb-1 pe-10">
                    {t(archetype.titleKey)}
                  </h4>

                  {/* Quip */}
                  <p className="text-xs font-bold text-neo-black/60 italic mb-3 line-clamp-2">
                    {t(quip)}
                  </p>

                  {/* Divider */}
                  <div className="border-t-2 border-neo-black/20 mb-2" />

                  {/* Player name + stat */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-neo-black truncate text-sm">
                      {player.username}
                    </p>
                    <p className="font-black text-neo-black/80 text-sm whitespace-nowrap">
                      {keyStat.formatted}
                    </p>
                  </div>
                </m.div>
              );
            })}
          </div>

          {/* "+X more" indicator */}
          {remaining > 0 && (
            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: MAX_VISIBLE * 0.15 + 0.3 }}
              className="text-sm font-bold text-neo-cream/60 text-center mt-2"
            >
              {t(remaining === 1
                ? 'tvResults.spotlight.andMore'
                : 'tvResults.spotlight.andMorePlural',
                { count: remaining }
              )}
            </m.p>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
});

TvResultsPlayerSpotlight.displayName = 'TvResultsPlayerSpotlight';

export default TvResultsPlayerSpotlight;
