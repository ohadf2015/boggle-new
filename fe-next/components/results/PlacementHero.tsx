'use client';

import React, { useEffect, useState, memo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Crown, Medal, TrendingUp, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import useReducedMotion from '@/hooks/useReducedMotion';
import Avatar from '../Avatar';
import { fireRankConfetti } from '@/utils/confettiUtils';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

// ============================================================
// TYPES
// ============================================================

interface PlacementHeroProps {
  rank: number;
  score: number;
  totalPlayers: number;
  username?: string;
  avatar?: {
    emoji?: string;
    color?: string;
    profilePictureUrl?: string | null;
    avatarImage?: string;
    customAvatar?: CustomAvatarConfig | null;
  };
  /** Gap to winner in points (0 if winner) */
  gapToWinner?: number;
}

// ============================================================
// RANK THEME CONFIG
// ============================================================

interface RankTheme {
  bg: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  rankBg: string;
  rankText: string;
  scoreBg: string;
  glowColor: string;
  textShadow: string;
  icon: typeof Crown;
  message: string;
  mascotGif: string;
}

const RANK_THEMES: Record<number, RankTheme> = {
  1: {
    bg: 'from-amber-400 via-yellow-300 to-amber-500',
    accent: 'border-amber-600',
    textPrimary: 'text-neo-black',
    textSecondary: 'text-neo-black/70',
    rankBg: 'bg-neo-black',
    rankText: 'text-amber-400',
    scoreBg: 'bg-neo-cream',
    glowColor: 'rgba(255,225,53,0.4)',
    textShadow: '2px 2px 0px rgba(0,0,0,0.15)',
    icon: Crown,
    message: 'results.youWon',
    mascotGif: '/mascot/trophy-nobg.gif',
  },
  2: {
    bg: 'from-slate-400 via-slate-300 to-slate-500',
    accent: 'border-slate-600',
    textPrimary: 'text-neo-black',
    textSecondary: 'text-neo-black/60',
    rankBg: 'bg-neo-black',
    rankText: 'text-slate-300',
    scoreBg: 'bg-neo-cream',
    glowColor: 'rgba(148,163,184,0.4)',
    textShadow: '2px 2px 0px rgba(0,0,0,0.15)',
    icon: Medal,
    message: 'results.secondPlace',
    mascotGif: '/mascot/flexing-nobg.gif',
  },
  3: {
    bg: 'from-amber-600 via-orange-400 to-amber-600',
    accent: 'border-amber-700',
    textPrimary: 'text-neo-black',
    textSecondary: 'text-neo-black/60',
    rankBg: 'bg-neo-black',
    rankText: 'text-amber-500',
    scoreBg: 'bg-neo-cream',
    glowColor: 'rgba(245,158,11,0.4)',
    textShadow: '2px 2px 0px rgba(0,0,0,0.15)',
    icon: Medal,
    message: 'results.thirdPlace',
    mascotGif: '/mascot/encouraging-nobg.gif',
  },
  0: {
    bg: 'from-neo-pink via-purple-500 to-neo-pink',
    accent: 'border-purple-700',
    textPrimary: 'text-white',
    textSecondary: 'text-white/70',
    rankBg: 'bg-white/20',
    rankText: 'text-white',
    scoreBg: 'bg-neo-cream',
    glowColor: 'rgba(255,20,147,0.3)',
    textShadow: '2px 2px 0px rgba(0,0,0,0.15)',
    icon: TrendingUp,
    message: 'results.betterLuckNextTime',
    mascotGif: '/mascot/oops-nobg.gif',
  },
};

// ============================================================
// MASCOT GIF
// ============================================================

const MascotGif: React.FC<{ src: string; alt: string; size: number; className?: string }> = ({
  src, alt, size, className = '',
}) => (
  /* eslint-disable-next-line @next/next/no-img-element */
  <img
    src={src}
    alt={alt}
    width={size}
    height={size}
    className={`object-contain drop-shadow-lg ${className}`}
    loading="eager"
  />
);

// ============================================================
// ANIMATED SCORE COUNTER
// ============================================================

const AnimatedScore: React.FC<{ target: number; className?: string; delay?: number }> = ({
  target,
  className,
  delay = 0.6,
}) => {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(motionVal, target, {
      type: 'spring',
      stiffness: 60,
      damping: 18,
      mass: 0.8,
      delay,
    });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [target, motionVal, rounded, delay]);

  return <span className={className}>{display.toLocaleString()}</span>;
};

// ============================================================
// FLOATING SPARKLES (winner only)
// ============================================================

const SPARKLES = [
  { x: '12%', y: '18%', size: 8, delay: 0 },
  { x: '85%', y: '25%', size: 6, delay: 0.4 },
  { x: '22%', y: '72%', size: 7, delay: 0.8 },
  { x: '78%', y: '68%', size: 5, delay: 1.2 },
  { x: '50%', y: '12%', size: 9, delay: 0.6 },
  { x: '92%', y: '50%', size: 6, delay: 1.0 },
];

const FloatingSparkles: React.FC = () => (
  <>
    {SPARKLES.map((s, i) => (
      <motion.div
        key={i}
        className="absolute pointer-events-none text-neo-cream/60"
        style={{ left: s.x, top: s.y, fontSize: s.size }}
        animate={{
          y: [0, -8, 0],
          opacity: [0.3, 0.8, 0.3],
          scale: [0.8, 1.3, 0.8],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 2.5,
          delay: s.delay,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        ✦
      </motion.div>
    ))}
  </>
);

// ============================================================
// ORDINAL SUFFIX
// ============================================================

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ============================================================
// MAIN COMPONENT
// ============================================================

const PlacementHero = memo<PlacementHeroProps>(({
  rank,
  score,
  totalPlayers,
  username,
  avatar,
  gapToWinner = 0,
}) => {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const theme = RANK_THEMES[rank <= 3 ? rank : 0];
  const RankIcon = theme.icon;

  // Fire confetti for top 3
  useEffect(() => {
    if (rank <= 3 && !reducedMotion) {
      const timer = setTimeout(() => fireRankConfetti(rank, 'light'), 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [rank, reducedMotion]);

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.85, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 180,
        damping: 20,
        staggerChildren: 0.12,
      },
    },
  };

  const childVariants = {
    hidden: { opacity: 0, y: 28, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 300, damping: 22 },
    },
  };

  // Rank number slam-in: overshoots then settles
  const rankSlamVariants = {
    hidden: { opacity: 0, scale: 3, rotate: -15 },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 350,
        damping: 15,
        mass: 0.6,
        delay: 0.3,
      },
    },
  };

  // Mascot slides in from the side with rotation
  const mascotVariants = {
    hidden: { opacity: 0, x: -30, rotate: -12 },
    visible: {
      opacity: 1,
      x: 0,
      rotate: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 250,
        damping: 18,
        delay: 0.5,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial={reducedMotion ? 'visible' : 'hidden'}
      animate="visible"
      className="w-full mb-4"
    >
      <div
        className={`
          relative overflow-hidden
          bg-gradient-to-br ${theme.bg}
          border-4 border-neo-black rounded-neo-lg shadow-hard-xl
          cursor-pointer transition-transform hover:scale-[1.005] active:scale-[0.995]
        `}
        onClick={() => rank <= 3 && !reducedMotion && fireRankConfetti(rank)}
      >
        {/* Halftone texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[radial-gradient(circle,rgb(var(--neo-black))_1px,transparent_1px)] bg-[length:10px_10px]" />

        {/* Floating sparkles for winner */}
        {rank === 1 && !reducedMotion && <FloatingSparkles />}

        {/* Shimmer sweep */}
        {!reducedMotion && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.25) 50%, transparent 65%)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={{ duration: 2.5, delay: 1, ease: 'easeInOut', repeat: Infinity, repeatDelay: 4 }}
          />
        )}

        {/* Winner glow ring */}
        {rank === 1 && !reducedMotion && (
          <motion.div
            className="absolute inset-0 rounded-neo-lg pointer-events-none"
            animate={{
              boxShadow: [
                `inset 0 0 0 0 ${theme.glowColor}, 0 0 0 ${theme.glowColor}`,
                `inset 0 0 30px ${theme.glowColor}, 0 0 50px ${theme.glowColor}`,
                `inset 0 0 0 0 ${theme.glowColor}, 0 0 0 ${theme.glowColor}`,
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Main content */}
        <div className="relative z-10 px-4 py-7 sm:px-6 sm:py-10 flex flex-col items-center text-center gap-4 sm:gap-5">
          {/* Row 1: Mascot GIF + Rank badge */}
          <motion.div variants={childVariants} className="flex items-center gap-3 sm:gap-4">
            {/* Mascot GIF — desktop */}
            <motion.div
              className="shrink-0 hidden xs:block sm:block"
              variants={reducedMotion ? undefined : mascotVariants}
            >
              <motion.div
                animate={!reducedMotion ? { y: [0, -6, 0], rotate: [0, 2, -2, 0] } : undefined}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <MascotGif src={theme.mascotGif} alt={t(theme.message)} size={80} />
              </motion.div>
            </motion.div>

            <motion.div
              className="relative"
              variants={reducedMotion ? childVariants : rankSlamVariants}
            >
              {/* Rank circle */}
              <motion.div
                className={`
                  ${theme.rankBg} border-4 border-neo-black rounded-full shadow-hard-lg
                  flex items-center justify-center
                  w-20 h-20 sm:w-24 sm:h-24
                `}
                animate={
                  !reducedMotion && rank <= 3
                    ? {
                        rotate: rank === 1 ? [0, -3, 3, -2, 0] : undefined,
                        scale: [1, 1.06, 1],
                        boxShadow: [
                          `0 0 0 0px ${theme.glowColor}`,
                          `0 0 0 8px ${theme.glowColor}`,
                          `0 0 0 0px ${theme.glowColor}`,
                        ],
                      }
                    : undefined
                }
                transition={
                  rank <= 3
                    ? { duration: rank === 1 ? 2 : 2.5, delay: 1.2, repeat: Infinity, ease: 'easeInOut' }
                    : undefined
                }
              >
                <span
                  className={`${theme.rankText} font-black text-4xl sm:text-5xl leading-none`}
                  style={{ textShadow: theme.textShadow }}
                >
                  {rank}
                </span>
              </motion.div>

              {/* Rank icon floating top-right */}
              <motion.div
                className={`
                  absolute -top-2 -end-2 sm:-top-3 sm:-end-3
                  bg-neo-cream border-3 border-neo-black rounded-full shadow-hard-sm
                  w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center
                `}
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 5 }}
                transition={{ delay: 0.7, type: 'spring', stiffness: 400, damping: 12 }}
              >
                <RankIcon className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
              </motion.div>
            </motion.div>

            {/* Mascot GIF — mobile (smaller) */}
            <motion.div
              className="shrink-0 xs:hidden sm:hidden"
              variants={reducedMotion ? undefined : mascotVariants}
            >
              <motion.div
                animate={!reducedMotion ? { y: [0, -4, 0] } : undefined}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <MascotGif src={theme.mascotGif} alt={t(theme.message)} size={56} />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Row 2: Ordinal placement text */}
          <motion.div variants={childVariants}>
            <span
              className={`
                inline-block font-black uppercase text-sm sm:text-base tracking-widest
                ${theme.textPrimary}
                bg-neo-black/10 px-3 py-1 rounded-neo border-2 border-neo-black/20
              `}
            >
              {getOrdinalSuffix(rank)} {t('results.yourPlace', { place: rank, total: totalPlayers })}
            </span>
          </motion.div>

          {/* Row 3: Avatar + Username */}
          <motion.div
            variants={childVariants}
            className="flex items-center gap-2.5"
          >
            {avatar && (
              <motion.div
                className="border-3 border-neo-black rounded-full shadow-hard-sm bg-neo-cream p-0.5"
                animate={!reducedMotion ? {
                  boxShadow: [
                    '4px 4px 0px rgba(0,0,0,1)',
                    '4px 4px 0px rgba(0,204,204,0.6)',
                    '4px 4px 0px rgba(0,0,0,1)',
                  ],
                } : undefined}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
              >
                <Avatar
                  profilePictureUrl={avatar.profilePictureUrl ?? undefined}
                  avatarImage={avatar.avatarImage}
                  customAvatar={avatar.customAvatar}
                  size="lg"
                />
              </motion.div>
            )}
            <h2
              className={`font-black text-xl sm:text-2xl uppercase ${theme.textPrimary} leading-tight`}
              style={{ textShadow: theme.textShadow }}
            >
              {username}
            </h2>
          </motion.div>

          {/* Row 4: Score — the star of the show */}
          <motion.div variants={childVariants}>
            <motion.div
              className={`
                ${theme.scoreBg} border-4 border-neo-black rounded-neo shadow-hard-lg
                px-6 py-3 sm:px-8 sm:py-4 inline-flex flex-col items-center
                relative overflow-hidden
              `}
              animate={
                !reducedMotion
                  ? {
                      boxShadow: rank === 1
                        ? [
                            '6px 6px 0px rgba(0,0,0,1)',
                            '6px 6px 0px rgba(0,204,204,0.8), 0 0 20px rgba(0,255,255,0.3)',
                            '6px 6px 0px rgba(0,0,0,1)',
                          ]
                        : [
                            '6px 6px 0px rgba(0,0,0,1)',
                            `6px 6px 0px ${theme.glowColor}`,
                            '6px 6px 0px rgba(0,0,0,1)',
                          ],
                    }
                  : undefined
              }
              transition={{ duration: 2, delay: 2, repeat: Infinity, ease: 'easeInOut' }}
              {...(!reducedMotion && rank === 1
                ? {
                    whileHover: {
                      scale: 1.05,
                      rotate: [-1, 1, 0],
                      transition: { duration: 0.3 },
                    },
                  }
                : {})}
            >
              {/* Score shine sweep */}
              {!reducedMotion && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
                    backgroundSize: '200% 100%',
                  }}
                  animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                  transition={{ duration: 1.5, delay: 2.5, ease: 'easeInOut' }}
                />
              )}
              <motion.div
                initial={{ scale: 1 }}
                animate={
                  !reducedMotion && rank === 1
                    ? { scale: [1, 1.15, 0.95, 1.05, 1] }
                    : !reducedMotion
                      ? { scale: [1, 1.08, 1] }
                      : undefined
                }
                transition={{ delay: 2, duration: rank === 1 ? 0.6 : 0.4, ease: 'easeOut' }}
              >
                <AnimatedScore
                  target={score}
                  className="font-black text-neo-black text-5xl sm:text-6xl md:text-7xl leading-none tabular-nums relative z-10"
                  delay={0.4}
                />
              </motion.div>
              <span className="font-bold text-neo-black/50 uppercase text-xs sm:text-sm tracking-wider mt-1 relative z-10">
                {t('results.points')}
              </span>
            </motion.div>
          </motion.div>

          {/* Row 5: Rank message with icon */}
          <motion.div
            variants={childVariants}
            className="flex items-center gap-2"
          >
            {rank === 1 && (
              <motion.div
                animate={!reducedMotion ? { rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] } : undefined}
                transition={{ duration: 1.5, delay: 1.8, repeat: Infinity, repeatDelay: 3 }}
              >
                <Zap className={`w-5 h-5 sm:w-6 sm:h-6 ${theme.textPrimary} fill-current`} />
              </motion.div>
            )}
            <span
              className={`
                inline-block font-black uppercase text-base sm:text-lg tracking-wide
                ${theme.textPrimary}
              `}
              style={{ textShadow: theme.textShadow }}
            >
              {t(theme.message)}
            </span>
            {rank === 1 && (
              <motion.div
                animate={!reducedMotion ? { rotate: [0, -15, 15, 0], scale: [1, 1.2, 1] } : undefined}
                transition={{ duration: 1.5, delay: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Zap className={`w-5 h-5 sm:w-6 sm:h-6 ${theme.textPrimary} fill-current`} />
              </motion.div>
            )}
          </motion.div>

          {/* Row 6: Gap to winner (only for non-winners) */}
          {rank > 1 && gapToWinner > 0 && (
            <motion.div
              variants={childVariants}
              className={`
                flex items-center gap-1.5
                bg-neo-black/15 px-3 py-1.5 rounded-neo border-2 border-neo-black/20
              `}
            >
              <TrendingUp className={`w-4 h-4 ${theme.textSecondary}`} />
              <span className={`text-xs sm:text-sm font-bold ${theme.textSecondary}`}>
                {t('results.pointsBehind', { points: gapToWinner })}
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

PlacementHero.displayName = 'PlacementHero';

export default PlacementHero;
