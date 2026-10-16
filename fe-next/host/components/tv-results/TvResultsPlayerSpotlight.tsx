'use client';

import { memo, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Avatar from '../../../components/Avatar';
import { cn } from '../../../lib/utils';
import { assignArchetypes, type SpotlightPlayer } from './playerSpotlightEngine';
import { seededRandom } from './awardsEngine';
import TvResultsSectionHeading from './TvResultsSectionHeading';
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
  /** Cards the lower band can hold; the rest collapse into "+N more". */
  maxVisible?: number;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const MAX_VISIBLE = 4;

const MASCOT_INTRO_KEYS = [
  'tvResults.spotlight.mascotIntro1',
  'tvResults.spotlight.mascotIntro2',
  'tvResults.spotlight.mascotIntro3',
  'tvResults.spotlight.mascotIntro4',
  'tvResults.spotlight.mascotIntro5',
];


const TvResultsPlayerSpotlight = memo<TvResultsPlayerSpotlightProps>(({
  players,
  visible,
  gameDuration = 180,
  maxVisible = MAX_VISIBLE,
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

  const visibleAssignments = assignments.slice(0, maxVisible);
  const remaining = assignments.length - maxVisible;

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ y: 24 }}
          animate={{ y: 0 }}
          exit={{ y: 24 }}
          className="flex h-full flex-col gap-3"
        >
          <TvResultsSectionHeading
            title={t('tvResults.spotlight.heading')}
            quip={mascotIntro}
            aside={remaining > 0
              ? t(remaining === 1 ? 'tvResults.spotlight.andMore' : 'tvResults.spotlight.andMorePlural', { count: remaining })
              : undefined}
          />

          <div className="grid flex-1 auto-rows-fr grid-cols-2 gap-3">
            {visibleAssignments.map((assignment, index) => {
              const { player, archetype, quip, keyStat } = assignment;
              const originalPlayer = players.find(p => p.username === player.username);

              return (
                <m.div
                  key={player.username}
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ delay: index * 0.15, type: 'spring', stiffness: 300, damping: 20 }}
                  className={cn(
                    'flex flex-col gap-1 rounded-neo border-4 border-neo-black px-3 py-2 shadow-hard',
                    archetype.color
                  )}
                >
                  <h4 className="font-neo-display text-[clamp(0.9rem,1.8vh,1.2rem)] font-black uppercase leading-tight text-neo-black">
                    {t(archetype.titleKey)}
                  </h4>
                  <p className="text-[clamp(0.75rem,1.4vh,0.95rem)] font-bold italic leading-snug text-neo-black/70">
                    {t(quip)}
                  </p>
                  <div className="mt-auto flex items-center gap-2 border-t-2 border-neo-black/20 pt-1.5">
                    <Avatar
                      avatarImage={originalPlayer?.avatar?.avatarImage}
                      customAvatar={originalPlayer?.avatar?.customAvatar}
                      size="md"
                      className="shrink-0 border-2 border-neo-black"
                    />
                    <p
                      data-testid="spotlight-name"
                      className="min-w-0 flex-1 text-[clamp(0.85rem,1.6vh,1.05rem)] font-black leading-tight text-neo-black [overflow-wrap:anywhere]"
                    >
                      {player.username}
                    </p>
                    <p className="shrink-0 font-neo-display text-[clamp(0.9rem,1.7vh,1.15rem)] font-black text-neo-black">
                      {keyStat.formatted}
                    </p>
                  </div>
                </m.div>
              );
            })}
          </div>

        </m.div>
      )}
    </AnimatePresence>
  );
});

TvResultsPlayerSpotlight.displayName = 'TvResultsPlayerSpotlight';

export default TvResultsPlayerSpotlight;
