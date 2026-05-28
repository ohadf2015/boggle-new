'use client';

import { memo, useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { m, useMotionValue, useTransform, animate } from 'framer-motion';
import { ArrowLeft, Trophy, Crosshair, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { fireConfetti, fireVictoryConfetti } from '@/utils/confettiUtils';
import { clearSessionPreservingUsername } from '@/utils/session';
import { hasPlayedWordHuntToday } from '@/utils/dailyChallenge/storage';
import type { Language } from '@/shared/types/game';
import useReducedMotion from '@/hooks/useReducedMotion';
import { usePracticeStreak } from '@/hooks/usePracticeStreak';
import { CelebrationMascotWithEntrance } from '@/components/ui/CelebrationMascot';
import { MascotWithEntrance } from '@/components/ui/Mascot';
import {
  useGuestStatsSync,
  useLeaderboardSync,
  useGameHistory,
  useGameSessionLogging,
  useCoinRewards,
  useCognitiveScoring,
  useSignupPrompt,
} from '../results';
import { CatalystTeaser } from './CatalystTeaser';
import type { SinglePlayerResultsData } from '../SinglePlayerView';

const FirstWinSignupModal = dynamic(() => import('@/components/auth/FirstWinSignupModal'), { ssr: false });

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

const SPARKLE_COUNT = 10;

function FloatingSparkles({ tier }: { tier: Tier }) {
  const sparkles = useMemo(() => {
    const colors = TIER_CONFETTI[tier];
    return Array.from({ length: SPARKLE_COUNT }, (_, i) => ({
      id: i,
      left: `${8 + (i * 9) % 84}%`,
      size: 3 + (i % 4) * 2,
      delay: i * 0.35,
      duration: 2.5 + (i % 3),
      color: colors[i % colors.length],
    }));
  }, [tier]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {sparkles.map(s => (
        <m.div
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
            repeat: 2,
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
        ease: [0.16, 1, 0.3, 1],
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
    <m.p
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
        <m.span
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
        </m.span>
      ))}
    </m.p>
  );
}

// ─── Component ───

interface PracticeResultsProps {
  results: SinglePlayerResultsData;
  /** Reserved for future use; currently the screen exposes only daily-challenge + go-home actions. */
  onPlayAgain?: () => void;
  onBackToLobby: () => void;
}

const PracticeResults = memo(function PracticeResults({
  results,
  onBackToLobby,
}: PracticeResultsProps) {
  const { t, language } = useLanguage();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const reducedMotion = useReducedMotion();
  const router = useRouter();

  // ─── Daily challenge availability ───
  const dailyAlreadyPlayed = useMemo(
    () => hasPlayedWordHuntToday(language as Language),
    [language],
  );

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

  const { showSignupModal, setShowSignupModal } = useSignupPrompt({ isAuthenticated, hasUser: !!user, authLoading });

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

  // ─── Practice streak (break-proof) — record once on mount ───
  const { current: practiceStreak, record: recordPracticeStreak } = usePracticeStreak();
  const streakRecordedRef = useRef(false);
  useEffect(() => {
    if (streakRecordedRef.current) return;
    streakRecordedRef.current = true;
    recordPracticeStreak();
  }, [recordPracticeStreak]);

  // ─── Confetti on mount — celebratory for all tiers ───
  const confettiFired = useRef(false);
  useEffect(() => {
    if (confettiFired.current || reducedMotion) return;
    confettiFired.current = true;
    if (tier === 'legendary' || tier === 'great') {
      fireVictoryConfetti();
    } else {
      fireConfetti({
        particleCount: tier === 'nice' ? 60 : 40,
        spread: 80,
        origin: { y: 0.5 },
        colors: TIER_CONFETTI[tier],
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Navigation ───
  // Route into the practice flow for the next mode rather than the live daily —
  // keeps the player in no-pressure practice until they exit the chain.
  const handleWordHuntDaily = useCallback(() => {
    clearSessionPreservingUsername();
    router.push(`/${language}/practice/wordHunt`);
  }, [router, language]);

  const ctaPulseRepeat = reducedMotion ? 0 : 3;

  // ─── Tier colors for text ───
  const tierTextColor = tier === 'legendary'
    ? 'text-neo-lime'
    : tier === 'great'
      ? 'text-neo-cyan'
      : tier === 'nice'
        ? 'text-neo-pink'
        : 'text-neo-yellow';

  return (
    <div className="min-h-dvh bg-neo-navy text-white flex flex-col relative overflow-hidden">
      {!reducedMotion && <FloatingSparkles tier={tier} />}

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32 md:pb-8 pt-6 relative z-10">
        <div className="w-full max-w-md mx-auto space-y-5">

          {/* ── Hero: Mascot + Score + Encouragement ── */}
          <m.div
            initial={reducedMotion ? false : { opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="text-center"
          >
            {/* Large celebratory mascot */}
            <div className="flex justify-center mb-4">
              <m.div
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-neo-cream/90 border-4 border-neo-black shadow-hard-lg flex items-center justify-center"
                initial={reducedMotion ? false : { scale: 0, rotate: -15 }}
                animate={reducedMotion
                  ? { scale: 1 }
                  : { scale: [0, 1.15, 0.92, 1.05, 1], rotate: [-15, 8, -4, 2, 0] }
                }
                transition={{
                  delay: 0.2,
                  duration: 0.8,
                  times: [0, 0.4, 0.6, 0.8, 1],
                  ease: 'easeOut',
                }}
              >
                {tier === 'warmup' ? (
                  <MascotWithEntrance variant="encouraging" size="md" delay={0.4} clipBorder="none" />
                ) : (
                  <CelebrationMascotWithEntrance variant="celebration" size="md" delay={0.4} clipBorder="none" />
                )}
              </m.div>
            </div>

            {/* Encouragement text */}
            {reducedMotion ? (
              <p className={cn('text-sm font-black uppercase tracking-wider mb-1', tierTextColor)}>
                {t(encouragementKey)}
              </p>
            ) : (
              <StaggeredText
                text={t(encouragementKey)}
                delay={0.5}
                className={cn('text-sm font-black uppercase tracking-wider mb-1', tierTextColor)}
              />
            )}

            {/* Big score */}
            <m.div
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
            </m.div>

            {/* Words found */}
            <m.p
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white text-sm font-bold mt-1"
            >
              {t('practiceResults.wordsFound', { count: validWordCount })}
            </m.p>

            {/* Practice streak chip — break-proof, increments per UTC day */}
            {practiceStreak > 0 && (
              <m.div
                initial={reducedMotion ? false : { scale: 0, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.55, type: 'spring', stiffness: 380, damping: 18 }}
                data-testid="practice-streak-chip"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-neo-black bg-neo-orange px-3 py-1 font-black text-neo-black"
                aria-label={`Practice streak: ${practiceStreak} days`}
              >
                <span aria-hidden>🔥</span>
                <span className="text-sm">×{practiceStreak}</span>
              </m.div>
            )}

            {/* Subtitle */}
            <m.p
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white text-xs mt-2 max-w-[260px] mx-auto"
            >
              {t(subtitleKey)}
            </m.p>
          </m.div>


          {/* ── Catalyst teaser — surfaces what's coming in arena/adventure ── */}
          <CatalystTeaser t={t} />

          {/* ── Primary CTA: Word Hunt Daily — desktop big card; mobile uses sticky bottom only ── */}
          <m.div
            initial={reducedMotion ? false : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            {/* Big card hidden on mobile to avoid duplicate with sticky bottom */}
            <div className="hidden md:block">
              {dailyAlreadyPlayed ? (
                <div
                  className={cn(
                    'w-full flex items-center justify-center gap-3',
                    'px-6 py-4',
                    'bg-white/5 text-white',
                    'font-black text-base uppercase',
                    'border-3 border-white/10 rounded-neo',
                    'cursor-not-allowed',
                  )}
                >
                  <Lock className="w-5 h-5" />
                  <div className="text-start">
                    <span className="block">{t('practiceResults.wordHuntAlreadyPlayed')}</span>
                    <span className="text-xs font-medium text-white block">
                      {t('practiceResults.wordHuntAlreadyPlayedDesc')}
                    </span>
                  </div>
                </div>
              ) : (
                <m.button
                  onClick={handleWordHuntDaily}
                  animate={reducedMotion ? {} : { scale: [1, 1.03, 1] }}
                  transition={{
                    duration: 2.5,
                    repeat: ctaPulseRepeat,
                    ease: 'easeInOut',
                    repeatDelay: 0.5,
                  }}
                  whileHover={reducedMotion ? { opacity: 0.9 } : { scale: 1.06 }}
                  whileTap={reducedMotion ? {} : { scale: 0.96 }}
                  className={cn(
                    'w-full flex items-center justify-center gap-3',
                    'px-6 py-4',
                    'bg-amber-400 text-neo-black',
                    'font-black text-base uppercase',
                    'border-4 border-neo-black rounded-neo',
                    'shadow-hard-lg',
                    'transition-shadow duration-150',
                  )}
                >
                  <Crosshair className="w-6 h-6" />
                  <div className="text-start">
                    <span className="block">{t('practiceResults.wordHuntCta')}</span>
                    <span className="text-xs font-medium text-neo-black/60 block">
                      {t('practiceResults.wordHuntCtaDesc')}
                    </span>
                  </div>
                  <Trophy className="w-5 h-5 text-amber-600" />
                </m.button>
              )}
            </div>

            {/* ── Desktop secondary action: home only ── */}
            <div className="hidden md:flex gap-2.5 justify-center">
              <button
                onClick={onBackToLobby}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5',
                  'bg-white/10 text-white',
                  'font-bold text-sm uppercase',
                  'border-2 border-white/20 rounded-neo',
                  'transition-colors hover:bg-white/20',
                )}
              >
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                {t('practiceResults.goHome')}
              </button>
            </div>
          </m.div>
        </div>
      </div>

      {/* ── Mobile sticky bottom — single daily CTA + go home ── */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-neo-navy border-t-3 border-neo-black safe-area-bottom px-3 py-2.5">
        <div className="flex flex-col gap-2">
          {!dailyAlreadyPlayed && (
            <m.button
              onClick={handleWordHuntDaily}
              animate={reducedMotion ? {} : { scale: [1, 1.03, 1] }}
              transition={{ duration: 2, repeat: ctaPulseRepeat, ease: 'easeInOut', repeatDelay: 1 }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-400 text-neo-black font-black text-sm uppercase border-3 border-neo-black rounded-neo shadow-hard"
            >
              <Trophy className="w-4 h-4" />
              {t('practiceResults.wordHuntCta')}
            </m.button>
          )}
          <button
            onClick={onBackToLobby}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 text-white font-bold text-sm uppercase border-2 border-white/20 rounded-neo transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t('practiceResults.goHome')}
          </button>
        </div>
      </div>

      <FirstWinSignupModal isOpen={showSignupModal} onClose={() => setShowSignupModal(false)} variant="multiGames" />
    </div>
  );
});

export default PracticeResults;
