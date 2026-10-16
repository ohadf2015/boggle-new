'use client';

import { memo, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Avatar from '../../../components/Avatar';
import { cn } from '../../../lib/utils';
import TvResultsSectionHeading from './TvResultsSectionHeading';
import { computeAwards, seededRandom, type AwardPlayer } from './awardsEngine';

interface TvResultsAwardsProps {
  players: AwardPlayer[];
  visible: boolean;
  gameDuration?: number; // in seconds
  t: (path: string, params?: Record<string, string | number>) => string;
}

const MASCOT_COMMENT_KEYS = [
  'tvResults.mascotComments.awardsIntro1',
  'tvResults.mascotComments.awardsIntro2',
  'tvResults.mascotComments.awardsIntro3',
  'tvResults.mascotComments.awardsIntro4',
  'tvResults.mascotComments.awardsIntro5',
];

/**
 * TvResultsAwards - Fun awards section
 * Recognizes players for special achievements beyond just winning.
 */
const TvResultsAwards = memo<TvResultsAwardsProps>(({
  players,
  visible,
  gameDuration = 180,
  t,
}) => {
  const seed = useMemo(() => players.reduce((s, p) => s + p.score, 0) || 1, [players]);

  const mascotComment = useMemo(() => {
    const rng = seededRandom(seed + 42);
    return t(MASCOT_COMMENT_KEYS[Math.floor(rng() * MASCOT_COMMENT_KEYS.length)]);
  }, [seed, t]);

  const awards = useMemo(
    () => computeAwards(players, gameDuration, t, seed),
    [players, gameDuration, t, seed]
  );

  if (awards.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ y: 24 }}
          animate={{ y: 0 }}
          exit={{ y: 24 }}
          className="flex h-full flex-col gap-3"
        >
          <TvResultsSectionHeading title={t('tvResults.specialAwards')} quip={mascotComment} />

          <div className="grid flex-1 grid-cols-3 gap-4">
            {awards.map((award, index) => (
              <m.div
                key={award.id}
                data-testid={`award-card-${award.id}`}
                initial={{ rotateY: -90, scale: 0.9 }}
                animate={{ rotateY: 0, scale: 1 }}
                transition={{ delay: index * 0.25, type: 'spring', stiffness: 250, damping: 18 }}
                className={cn(
                  'flex flex-col gap-2 rounded-neo border-4 border-neo-black p-4 shadow-hard',
                  award.color
                )}
              >
                <div className="flex items-start gap-3">
                  <h4 className="flex-1 font-neo-display text-[clamp(1rem,2.1vh,1.4rem)] font-black uppercase leading-tight text-neo-black">
                    {award.title}
                  </h4>
                  <m.div
                    data-testid="award-badge"
                    initial={{ scale: 0, rotate: -360 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: index * 0.25 + 0.35, type: 'spring', stiffness: 500, damping: 12 }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-3 border-neo-black bg-neo-cream shadow-hard-sm"
                  >
                    <award.icon className="h-6 w-6 text-neo-black" />
                  </m.div>
                </div>

                <p className="text-[clamp(0.8rem,1.5vh,1rem)] font-bold leading-snug text-neo-black/70 [@media(max-height:860px)]:hidden">
                  {award.description}
                </p>

                <div className="mt-auto flex items-center gap-3 border-t-2 border-neo-black/20 pt-2">
                  <m.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.25 + 0.5, type: 'spring', stiffness: 400, damping: 8 }}
                    className="shrink-0"
                  >
                    <Avatar
                      avatarImage={award.recipient.avatar?.avatarImage}
                      customAvatar={award.recipient.avatar?.customAvatar}
                      size="lg"
                      className="border-3 border-neo-black shadow-hard-sm"
                    />
                  </m.div>
                  <div className="min-w-0 flex-1">
                    <p
                      data-testid="award-recipient"
                      className="font-black leading-tight text-neo-black text-[clamp(0.95rem,1.9vh,1.25rem)] [overflow-wrap:anywhere]"
                    >
                      {award.recipient.username}
                    </p>
                    <p className="font-neo-display text-[clamp(1rem,2.2vh,1.5rem)] font-black leading-tight text-neo-black">
                      {award.value}
                    </p>
                  </div>
                </div>
              </m.div>
            ))}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
});

TvResultsAwards.displayName = 'TvResultsAwards';

export default TvResultsAwards;
