'use client';

import { memo, useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ArrowRight, ArrowLeft, Trophy, Users, Swords, RotateCcw } from 'lucide-react';
import { calculateWordScore } from '@/shared/utils/scoring';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { fireConfetti } from '@/utils/confettiUtils';
import { clearSessionPreservingUsername } from '@/utils/session';
import useReducedMotion from '@/hooks/useReducedMotion';
import { CelebrationMascotWithEntrance } from '@/components/ui/CelebrationMascot';
import { MascotWithEntrance } from '@/components/ui/Mascot';
import MissedWordsSection from './components/MissedWordsSection';
import {
  useGuestStatsSync,
  useLeaderboardSync,
  useGameHistory,
  useGameSessionLogging,
  useCoinRewards,
  useCognitiveScoring,
  useSignupPrompt,
  useAchievementsSave,
} from '../results';
import type { SinglePlayerResultsData } from '../SinglePlayerView';

// ─── Encouragement tiers — always positive ───

type Tier = 'legendary' | 'great' | 'nice' | 'warmup';

function getEncouragementTier(score: number): Tier {
  if (score >= 200) return 'legendary';
  if (score >= 100) return 'great';
  if (score >= 30) return 'nice';
  return 'warmup';
}

// ─── Tier-matched confetti colors ───

const TIER_CONFETTI: Record<Tier, string[]> = {
  legendary: ['#BFFF00', '#FFE135', '#f59e0b', '#fbbf24', '#a855f7'],
  great:     ['#00FFFF', '#06b6d4', '#22d3ee', '#BFFF00', '#67e8f9'],
  nice:      ['#FF1493', '#ec4899', '#f472b6', '#00FFFF', '#BFFF00'],
  warmup:    ['#BFFF00', '#FF1493', '#00FFFF', '#FFE135', '#a855f7'],
};

// ─── Floating sparkle particle (CSS-only, compositor-friendly) ───

const SPARKLE_COUNT = 8;

function FloatingSparkles({ tier }: { tier: Tier }) {
  const sparkles = useMemo(() => {
    const colors = TIER_CONFETTI[tier];
    return Array.from({ length: SPARKLE_COUNT }, (_, i) => ({
      id: i,
      left: `${10 + (i * 11) % 80}%`,
      size: 3 + (i % 3) * 2,
      delay: i * 0.4,
      duration: 3 + (i % 3),
      color: colors[i % colors.length],
    }));
  }, [tier]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {sparkles.map(s => (
        <motion.div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: s.left,
            bottom: '-10px',
            width: s.size,
            height: s.size,
            backgroundColor: s.color,
            opacity: 0,
          }}
          animate={{
            y: [0, -400, -600],
            opacity: [0, 0.8, 0],
            scale: [0.5, 1, 0.3],
          }}
          transition={{
            duration: s.duration,
            delay: 0.5 + s.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// ─── Animated score counter hook ───

function useCountUp(target: number, duration = 1.2, delay = 0.3) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, v => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const controls = animate(motionVal, target, {
        duration,
        ease: [0.16, 1, 0.3, 1], // Fast start, slow end
      });
      return () => controls.stop();
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [target, duration, delay, motionVal]);

  useEffect(() => {
    const unsub = rounded.on('change', v => setDisplay(v));
    return unsub;
  }, [rounded]);

  return display;
}

// ─── Encouragement text with per-character stagger ───

function StaggeredText({ text, className, delay = 0 }: {
  text: string;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.p
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.04, delayChildren: delay } },
      }}
      aria-label={text}
    >
      {text.split('').map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          variants={{
            hidden: { opacity: 0, y: 10, scale: 0.8 },
            visible: { opacity: 1, y: 0, scale: 1 },
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="inline-block"
          style={{ whiteSpace: char === ' ' ? 'pre' : undefined }}
        >
          {char}
        </motion.span>
      ))}
    </motion.p>
  );
}

// ─── Mode suggestion cards ───

interface ModeSuggestion {
  titleKey: string;
  descKey: string;
  href: string;
  icon: React.ReactNode;
  bg: string;
  iconBg: string;
}

interface PracticeResultsProps {
  results: SinglePlayerResultsData;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

const PracticeResults = memo(function PracticeResults({
  results,
  onPlayAgain,
  onBackToLobby,
}: PracticeResultsProps) {
  const { t, language, dir } = useLanguage();
  const { user, isAuthenticated, profile, updateProfile, loading: authLoading } = useAuth();
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const isRTL = dir === 'rtl';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  // ─── Data persistence hooks (invisible to user) ───
  const validWordCount = results.playerWordData?.filter(w => w.isValid).length || 0;
  const totalComboBonus = results.playerWordData?.reduce((sum, w) => sum + (w.comboBonus || 0), 0) || 0;
  const totalFireRoundBonus = results.playerWordData?.reduce((sum, w) => sum + (w.fireRoundBonus || 0), 0) || 0;

  const { hasUpdatedStats } = useGuestStatsSync({
    isAuthenticated, results, isWinner: false, totalComboBonus, totalFireRoundBonus, playerArchetype: null,
  });

  useLeaderboardSync({ isAuthenticated, results, hasUpdatedStats });

  useGameHistory({
    results, playerRank: 1, totalParticipants: 1,
    isWinner: false, totalComboBonus, totalFireRoundBonus, playerArchetype: null,
  });

  useGameSessionLogging({ results, language: language as string, userId: user?.id, playerRank: 1 });

  useCoinRewards({ results, playerRank: 1, totalParticipants: 1 });

  useCognitiveScoring({ userId: user?.id, mode: 'practice', results });

  useSignupPrompt({ isAuthenticated, hasUser: !!user, authLoading });

  useAchievementsSave({ isAuthenticated, profile, results, updateProfile });

  // ─── Missed words from board solver ───
  const allBoardMissedWords = useMemo(() => {
    if (!results.allPossibleWords || results.allPossibleWords.length === 0) return [];
    const playerFoundSet = new Set(
      (results.playerWordData || [])
        .filter(w => w.isValid)
        .map(w => w.word.toLowerCase())
    );
    return results.allPossibleWords
      .filter(word => !playerFoundSet.has(word.toLowerCase()))
      .map(word => ({ word, score: calculateWordScore(word) }))
      .sort((a, b) => b.score - a.score || b.word.length - a.word.length);
  }, [results.allPossibleWords, results.playerWordData]);

  // ─── Encouragement content ───
  const tier = getEncouragementTier(results.playerScore);
  const encouragementKey = `practiceResults.encouragement.${tier}` as const;
  const subtitleKey = `practiceResults.subtitle.${tier}` as const;

  // ─── Animated score (counts up from 0) ───
  const displayScore = useCountUp(
    results.playerScore,
    reducedMotion ? 0 : 1.2,
    reducedMotion ? 0 : 0.3,
  );

  // ─── Confetti on mount (tier-matched colors) ───
  const confettiFired = useRef(false);
  useEffect(() => {
    if (confettiFired.current) return;
    if (results.playerScore > 0 && !reducedMotion) {
      confettiFired.current = true;
      const count = tier === 'legendary' ? 120 : tier === 'great' ? 80 : 40;
      fireConfetti({
        particleCount: count,
        spread: 70,
        origin: { y: 0.6 },
        colors: TIER_CONFETTI[tier],
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Mode suggestions ───
  const suggestions: ModeSuggestion[] = useMemo(() => [
    {
      titleKey: 'practiceResults.tryDaily',
      descKey: 'practiceResults.tryDailyDesc',
      href: `/${language}/daily`,
      icon: <Trophy className="w-5 h-5" />,
      bg: 'bg-amber-400',
      iconBg: 'bg-amber-500',
    },
    {
      titleKey: 'practiceResults.tryBots',
      descKey: 'practiceResults.tryBotsDesc',
      href: `/${language}/singleplayer?preset=bots`,
      icon: <Swords className="w-5 h-5" />,
      bg: 'bg-neo-cyan',
      iconBg: 'bg-neo-cyan-dark',
    },
    {
      titleKey: 'practiceResults.tryMultiplayer',
      descKey: 'practiceResults.tryMultiplayerDesc',
      href: `/${language}/multiplayer`,
      icon: <Users className="w-5 h-5" />,
      bg: 'bg-neo-pink',
      iconBg: 'bg-neo-pink-dark',
    },
  ], [language]);

  const handleNavigate = useCallback((href: string) => {
    clearSessionPreservingUsername();
    router.push(href);
  }, [router]);

  const inf = reducedMotion ? 0 : Infinity;

  return (
    <div className="min-h-dvh bg-neo-navy text-white flex flex-col relative overflow-hidden">
      {/* ── Floating sparkle particles (reduced-motion safe) ── */}
      {!reducedMotion && <FloatingSparkles tier={tier} />}

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-28 md:pb-8 pt-6 relative z-10">
        <div className="w-full max-w-md mx-auto space-y-6">

          {/* ── Hero: Score + Encouragement ── */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="text-center"
          >
            {/* Mascot with bounce-wobble after entrance */}
            <div className="flex justify-center mb-3">
              <motion.div
                className="w-20 h-20 rounded-full bg-neo-cream/90 border-4 border-neo-black shadow-hard-lg flex items-center justify-center"
                initial={reducedMotion ? false : { scale: 0, rotate: -15 }}
                animate={reducedMotion
                  ? { scale: 1 }
                  : { scale: [0, 1.2, 0.9, 1.05, 1], rotate: [-15, 8, -4, 2, 0] }
                }
                transition={{
                  delay: 0.2,
                  duration: 0.8,
                  times: [0, 0.4, 0.6, 0.8, 1],
                  ease: 'easeOut',
                }}
              >
                {tier === 'legendary' ? (
                  <CelebrationMascotWithEntrance variant="trophy" size="sm" delay={0.4} />
                ) : (
                  <MascotWithEntrance variant="happy" size="sm" delay={0.4} />
                )}
              </motion.div>
            </div>

            {/* Encouragement text with per-character stagger */}
            {reducedMotion ? (
              <p className={cn(
                'text-sm font-black uppercase tracking-wider mb-1',
                tier === 'legendary' ? 'text-neo-lime' : tier === 'great' ? 'text-neo-cyan' : 'text-neo-pink',
              )}>
                {t(encouragementKey)}
              </p>
            ) : (
              <StaggeredText
                text={t(encouragementKey)}
                delay={0.5}
                className={cn(
                  'text-sm font-black uppercase tracking-wider mb-1',
                  tier === 'legendary' ? 'text-neo-lime' : tier === 'great' ? 'text-neo-cyan' : 'text-neo-pink',
                )}
              />
            )}

            {/* Big score — counting up animation */}
            <motion.div
              initial={reducedMotion ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="font-neo-display font-black text-[72px] sm:text-[96px] leading-none text-white"
              style={{
                WebkitTextStroke: '3px rgba(0,0,0,0.8)',
                textShadow: '5px 5px 0px rgba(0,0,0,0.4)',
              }}
            >
              {displayScore}
            </motion.div>

            {/* Words found stat */}
            <motion.p
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/70 text-sm font-bold mt-1"
            >
              {t('practiceResults.wordsFound', { count: validWordCount })}
            </motion.p>

            {/* Subtitle */}
            <motion.p
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white/50 text-xs mt-2 max-w-[260px] mx-auto"
            >
              {t(subtitleKey)}
            </motion.p>
          </motion.div>

          {/* ── Words You Missed section ── */}
          {allBoardMissedWords.length > 0 && (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <MissedWordsSection
                words={allBoardMissedWords}
                playerFoundCount={validWordCount}
                totalBoardWords={results.allPossibleWords?.length || undefined}
                initialDisplayCount={10}
              />
            </motion.div>
          )}

          {/* ── Play Again button with gentle pulse ── */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center"
          >
            <motion.button
              onClick={onPlayAgain}
              animate={reducedMotion ? {} : { scale: [1, 1.04, 1] }}
              transition={{
                duration: 2,
                repeat: inf,
                ease: 'easeInOut',
                repeatDelay: 1,
              }}
              whileHover={reducedMotion ? { opacity: 0.9 } : { scale: 1.08 }}
              whileTap={reducedMotion ? {} : { scale: 0.95 }}
              className={cn(
                'inline-flex items-center gap-2.5',
                'px-8 py-3.5',
                'bg-neo-lime text-neo-black',
                'font-black text-base uppercase',
                'border-4 border-neo-black rounded-neo',
                'shadow-hard-lg',
                'transition-shadow duration-150',
              )}
            >
              <RotateCcw className="w-5 h-5" />
              {t('practiceResults.playAgain')}
            </motion.button>
          </motion.div>

          {/* ── Divider with "or try something new" ── */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-3"
          >
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] font-bold uppercase text-white/40 tracking-wider">
              {t('practiceResults.orTrySomethingNew')}
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </motion.div>

          {/* ── Mode suggestion cards with jelly wobble hover ── */}
          <div className="space-y-2.5">
            {suggestions.map((s, i) => (
              <motion.button
                key={s.titleKey}
                initial={reducedMotion ? false : { opacity: 0, x: isRTL ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.65 + i * 0.1 }}
                whileHover={reducedMotion
                  ? { opacity: 0.9 }
                  : { scaleX: 1.03, scaleY: 0.97 }
                }
                whileTap={reducedMotion ? {} : { scale: 0.97 }}
                onClick={() => handleNavigate(s.href)}
                className={cn(
                  'w-full flex items-center gap-3 p-3',
                  s.bg,
                  'border-3 border-neo-black rounded-neo shadow-hard',
                  'text-start',
                )}
                style={{ transition: 'box-shadow 150ms' }}
              >
                <motion.div
                  className={cn(
                    'w-10 h-10 rounded-neo border-2 border-neo-black flex items-center justify-center shrink-0',
                    s.iconBg, 'text-neo-black',
                  )}
                  animate={reducedMotion ? {} : { rotate: [0, -8, 8, -4, 0] }}
                  transition={{
                    delay: 1.2 + i * 0.15,
                    duration: 0.5,
                    ease: 'easeInOut',
                  }}
                >
                  {s.icon}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <span className="font-black text-neo-black text-sm uppercase block">
                    {t(s.titleKey)}
                  </span>
                  <span className="text-neo-black/70 text-xs font-medium block truncate">
                    {t(s.descKey)}
                  </span>
                </div>
                <ArrowIcon className="w-5 h-5 text-neo-black/60 shrink-0" />
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile sticky bottom — play again + back ── */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-neo-navy/95 backdrop-blur-sm border-t-3 border-neo-black safe-area-bottom px-3 py-2.5">
        <div className="flex gap-2">
          <button
            onClick={onBackToLobby}
            className="flex items-center justify-center gap-1 px-3 py-2.5 bg-white/10 text-white/80 font-bold text-xs uppercase border-2 border-white/20 rounded-neo transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            {t('nextStep.backToLobby')}
          </button>
          <motion.button
            onClick={onPlayAgain}
            animate={reducedMotion ? {} : { scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: inf, ease: 'easeInOut', repeatDelay: 1 }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-neo-lime text-neo-black font-black text-sm uppercase border-3 border-neo-black rounded-neo shadow-hard"
          >
            <RotateCcw className="w-4 h-4" />
            {t('practiceResults.playAgain')}
          </motion.button>
        </div>
      </div>
    </div>
  );
});

export default PracticeResults;
