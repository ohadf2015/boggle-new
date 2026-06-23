'use client';

import React, { useEffect, useState } from 'react';
import { m, animate as fmAnimate } from 'framer-motion';
import { Star, ArrowRight, ArrowLeft, Flame, Crown, Zap, Type, Home, Sparkles, Gem } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { cn } from '@/lib/utils';
import { scoreWord } from '@/utils/dailyChallenge/wordWheelScoring';
import { selectRareFindCelebration, type RareFind } from '@/lib/wordWheel/wordRarity';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { usePracticeFlag } from '@/hooks/usePracticeFlag';
import PracticeChainCta from '@/components/practice/PracticeChainCta';
import DailyInsightStack from './DailyInsightStack';
import TabbedDailyLeaderboard from './TabbedDailyLeaderboard';
import WordWheelSignupCta from './WordWheelSignupCta';
import WordWheelReplayCta from './WordWheelReplayCta';
import CatchUpSuggestion from './CatchUpSuggestion';
import MpModeCrossPromo from './MpModeCrossPromo';
import { wasSignupModalDismissedRecently } from '@/utils/dailyChallenge';
import type { Language } from '@/types';
import type { WordWheelGameResult } from './WordWheelGame';

// Threshold for the "exceptional run" celebration — covers two cases:
//   • score ≥ EXCELLENT_SCORE: graded run, almost-all-words tier
//   • wordsFound ≥ EXCELLENT_WORD_COUNT: brute-coverage signal
// Either trigger flips on extra confetti, layered sound, and the banner.
const EXCELLENT_SCORE = 80;
const EXCELLENT_WORD_COUNT = 20;

interface WordWheelResultsProps {
  result: WordWheelGameResult;
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;
  hasPlayedWordHunt: boolean;
  currentPlayerId?: string | null;
  currentGuestFingerprint?: string | null;
  /** Whether the viewer is signed in. Gates the guest signup CTA. */
  isAuthenticated?: boolean;
  /** Current daily-streak length (getDailyStreak().currentStreak) — surfaced as a chip + signup hook. */
  streakDays?: number;
  /** True on the player's first-ever daily completion (welcome framing). */
  isFirstCompletion?: boolean;
  /** True when this is the terminal 'already-played' view (returning player) — enables the practice CTA. */
  alreadyPlayed?: boolean;
  /** True when this was a catch-up play (past day) — shows catch-up suggestion. */
  isCatchup?: boolean;
}

function getResultTier(score: number): {
  key: string; color: string; bg: string; icon: React.ReactNode; glowColor: string;
} {
  if (score >= 80) return {
    key: 'wordWheel.excellent', color: 'text-neo-lime', bg: 'bg-neo-lime/10',
    icon: <Crown className="w-8 h-8" />, glowColor: 'shadow-[0_0_30px_rgba(191,255,0,0.4)]',
  };
  if (score >= 50) return {
    key: 'wordWheel.great', color: 'text-neo-cyan', bg: 'bg-neo-cyan/10',
    icon: <Flame className="w-8 h-8" />, glowColor: 'shadow-[0_0_25px_rgba(0,255,255,0.3)]',
  };
  if (score >= 25) return {
    key: 'wordWheel.good', color: 'text-neo-purple', bg: 'bg-neo-purple/10',
    icon: <Zap className="w-8 h-8" />, glowColor: 'shadow-[0_0_20px_rgba(139,92,246,0.3)]',
  };
  return {
    key: 'wordWheel.tryAgain', color: 'text-neo-pink', bg: 'bg-neo-pink/10',
    icon: <Star className="w-8 h-8" />, glowColor: '',
  };
}

// Pre-generated confetti configs (pure — no Math.random in render)
interface ConfettiConfig {
  left: number; size: number; heightRatio: number;
  duration: number; rotation: number; xDrift: number; isRound: boolean;
}

function generateConfettiConfigs(count: number): ConfettiConfig[] {
  const configs: ConfettiConfig[] = [];
  // Simple seeded-ish spread using golden ratio
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const phi = (1 + Math.sqrt(5)) / 2;
    const pseudo = ((i * phi) % 1);
    const pseudo2 = ((i * phi * phi) % 1);
    const pseudo3 = (((i + 7) * phi) % 1);
    configs.push({
      left: t * 100,
      size: 6 + pseudo * 8,
      heightRatio: 0.6 + pseudo2 * 0.8,
      duration: 2 + pseudo * 2,
      rotation: pseudo2 * 720 - 360,
      xDrift: (pseudo3 - 0.5) * 200,
      isRound: pseudo > 0.5,
    });
  }
  return configs;
}

const CONFETTI_CONFIGS = generateConfettiConfigs(40);

function ConfettiParticle({ delay, color, config }: { delay: number; color: string; config: ConfettiConfig }) {
  return (
    <m.div
      className="absolute pointer-events-none"
      style={{
        left: `${config.left}%`,
        top: -10,
        width: config.size,
        height: config.size * config.heightRatio,
        backgroundColor: color,
        borderRadius: config.isRound ? '50%' : '2px',
      }}
      initial={{ y: -20, opacity: 1, rotate: 0 }}
      animate={{
        y: typeof window !== 'undefined' ? window.innerHeight + 20 : 800,
        opacity: [1, 1, 0.8, 0],
        rotate: config.rotation,
        x: config.xDrift,
      }}
      transition={{ duration: config.duration, delay, ease: 'easeIn' }}
    />
  );
}

const CONFETTI_COLORS = ['#BFFF00', '#00FFFF', '#FF1493', '#8B5CF6', '#FFD700', '#FF3366', '#44FF44'];

const WordWheelResults: React.FC<WordWheelResultsProps> = ({
  result, puzzleNumber, puzzleDate, language: gameLang, hasPlayedWordHunt,
  currentPlayerId, currentGuestFingerprint,
  isAuthenticated = false, streakDays = 0, isFirstCompletion = false, alreadyPlayed = false,
  isCatchup = false,
}) => {
  const { t, language } = useLanguage();
  const { submitLeaderboardScore } = useCrazyGames();
  const { playSound } = useSoundEffects();
  const isPractice = usePracticeFlag();
  const tier = getResultTier(result.score);
  const isExceptional = result.score >= EXCELLENT_SCORE || result.wordsFound.length >= EXCELLENT_WORD_COUNT;
  const [showConfetti, setShowConfetti] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [rareFind, setRareFind] = useState<RareFind | null>(null);

  // Rarest-find celebration: pull the day's distinct-player count per word and
  // surface the player's rarest find ("only you found X — so far" / "rare find").
  // Skipped in practice (no shared field to compare against). Best-effort: any
  // fetch/parse failure simply yields no card.
  useEffect(() => {
    if (isPractice || result.wordsFound.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/daily-challenge/word-wheel/word-rarity/${puzzleDate}/${gameLang}`);
        if (!res.ok) return;
        const json = await res.json();
        const counts = (json?.counts ?? {}) as Record<string, number>;
        const find = selectRareFindCelebration(result.wordsFound, counts);
        if (!cancelled && find) setRareFind(find);
      } catch { /* rarity is best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [isPractice, result.wordsFound, puzzleDate, gameLang]);

  // Animate score counting up with natural deceleration
  useEffect(() => {
    if (result.score === 0) return;
    const controls = fmAnimate(0, result.score, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setAnimatedScore(Math.round(v)),
    });
    return () => controls.stop();
  }, [result.score]);

  // Submit completion score to CrazyGames leaderboard (no-op off-platform).
  // Drives CG retention metrics by tying daily-challenge engagement to the
  // platform leaderboard the player can return to.
  useEffect(() => {
    if (result.score > 0) {
      submitLeaderboardScore(result.score);
    }
  }, [result.score, submitLeaderboardScore]);

  // Trigger confetti for good scores
  useEffect(() => {
    if (result.score >= 25) {
      const timer = setTimeout(() => setShowConfetti(true), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [result.score]);

  // Layered celebration for exceptional runs — partyTada lands ~700ms after
  // the existing victoryFanfare from WordWheelGame so they sequence, not stack.
  // crownVictory follows another ~500ms later to cap the moment.
  useEffect(() => {
    if (!isExceptional || isPractice) return;
    const t1 = setTimeout(() => playSound('partyTada', { volume: 0.7, requiresGameActive: false }), 700);
    const t2 = setTimeout(() => playSound('crownVictory', { volume: 0.6, requiresGameActive: false }), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isExceptional, isPractice, playSound]);

  const confettiCount = isExceptional ? 80 : result.score >= 50 ? 25 : 15;

  return (
    <m.div
      className="relative flex flex-col items-center gap-5 w-full max-w-md mx-auto px-4 py-8 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* DOM Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {CONFETTI_CONFIGS.slice(0, confettiCount).map((config, i) => (
            <ConfettiParticle
              key={`confetti-${i}`}
              delay={i * 0.08}
              color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
              config={config}
            />
          ))}
        </div>
      )}

      {/* Back to daily landing */}
      <div className="w-full flex justify-start z-10">
        <Link
          href={`/${language}/daily`}
          className="inline-flex items-center text-sm text-neo-white hover:text-neo-white transition-colors"
        >
          <ArrowLeft className="me-2 rtl:rotate-180 w-4 h-4" />
          {t('common.back')}
        </Link>
      </div>

      {/* Title */}
      <m.div
        className="text-center z-10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="font-neo-display font-black text-2xl text-neo-white mb-1">
          {t('wordWheel.results.title')}
        </h2>
        <span className="text-neo-white text-sm">#{puzzleNumber}</span>
      </m.div>

      {/* Score circle */}
      <m.div
        className={cn(
          'relative flex flex-col items-center justify-center w-36 h-36 rounded-full',
          'border-3 border-neo-black shadow-hard-lg z-10',
          tier.bg, tier.glowColor,
        )}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
      >
        <m.div
          className={tier.color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
        >
          {tier.icon}
        </m.div>
        <span className={cn('font-neo-display font-black text-4xl', tier.color)}>
          {animatedScore}
        </span>
        <span className="text-neo-white text-xs">{t('wordWheel.scoreLabel')}</span>
      </m.div>

      {/* Tier message */}
      <m.p
        className={cn('font-neo-display font-bold text-xl z-10', tier.color)}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        {t(tier.key)}
      </m.p>

      {/* Daily streak chip — surfaces the streak that was previously computed and
          thrown away. The single strongest daily-habit signal; orange = streak
          semantic. Hidden in practice (no streak persisted). */}
      {!isPractice && streakDays >= 1 && (
        <m.div
          data-testid="word-wheel-streak-chip"
          className="z-10 flex items-center gap-1.5 px-3 py-1 rounded-neo border-3 border-neo-black bg-neo-orange text-neo-black shadow-hard"
          initial={{ scale: 0, y: -6 }}
          animate={{ scale: [0, 1.15, 1], y: 0 }}
          transition={{ delay: 0.9, duration: 0.45, type: 'spring', stiffness: 360, damping: 16 }}
        >
          <Flame className="w-4 h-4" strokeWidth={2.5} aria-hidden />
          <span className="font-neo-display font-black text-sm tracking-wide uppercase">
            {t('wordWheel.results.streakChip', { count: streakDays })}
          </span>
        </m.div>
      )}

      {/* Exceptional-run banner — only renders for the top tier (almost-all
          words / score ≥ 80). Mass + double Sparkles + spring scale gives it
          the "this was special" feel without competing with the score circle. */}
      {isExceptional && (
        <m.div
          data-testid="word-wheel-perfect-banner"
          className="z-10 flex items-center gap-2 px-4 py-1.5 rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black shadow-[3px_3px_0px_black,0_0_24px_rgba(191,255,0,0.55)]"
          initial={{ scale: 0, y: -6 }}
          animate={{ scale: [0, 1.18, 1], y: 0 }}
          transition={{ delay: 1.0, duration: 0.55, type: 'spring', stiffness: 380, damping: 16 }}
        >
          <Sparkles className="w-4 h-4" strokeWidth={2.5} aria-hidden />
          <span className="font-neo-display font-black text-sm tracking-wider uppercase">
            {t('wordWheel.results.perfectBanner', 'Word Wizard!')}
          </span>
          <Sparkles className="w-4 h-4" strokeWidth={2.5} aria-hidden />
        </m.div>
      )}

      {/* Rarest-find celebration — "only you found X (so far)" or a rare-but-
          shared find. Honesty gates live in selectRareFindCelebration. */}
      {rareFind && (
        <m.div
          data-testid="word-wheel-rare-find"
          data-exclusive={rareFind.isExclusive ? 'true' : 'false'}
          className={cn(
            'z-10 flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-neo border-3 border-neo-black shadow-hard-lg',
            rareFind.isExclusive
              ? 'bg-neo-yellow text-neo-black shadow-[3px_3px_0px_black,0_0_24px_rgba(255,225,53,0.5)]'
              : 'bg-neo-purple text-neo-white',
          )}
          initial={{ scale: 0, y: -6 }}
          animate={{ scale: [0, 1.15, 1], y: 0 }}
          transition={{ delay: 1.1, duration: 0.5, type: 'spring', stiffness: 360, damping: 16 }}
        >
          <span className="flex items-center gap-1.5 font-neo-display font-black text-xs sm:text-sm tracking-wide uppercase">
            <Gem className="w-4 h-4" strokeWidth={2.5} aria-hidden />
            {rareFind.isExclusive
              ? t('wordWheel.results.onlyYouFound', 'Only you found this — so far!')
              : t('wordWheel.results.rareFind', { count: rareFind.playerCount })}
            <Gem className="w-4 h-4" strokeWidth={2.5} aria-hidden />
          </span>
          <span dir="auto" className="font-neo-body font-black text-lg tracking-widest">
            {gameLang === 'he' ? applyHebrewFinalLetters(rareFind.word) : rareFind.word}
          </span>
        </m.div>
      )}

      {/* Stats */}
      <m.div
        className="grid grid-cols-2 gap-3 w-full z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex flex-col items-center p-3 rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard">
          <span className="text-neo-lime font-black text-xl">{result.wordsFound.length}</span>
          <span className="text-neo-white text-xs">{t('wordWheel.results.wordsFound')}</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard">
          <span className="text-neo-cyan font-black text-xl">
            {Math.floor(result.timeSeconds / 60)}:{(result.timeSeconds % 60).toString().padStart(2, '0')}
          </span>
          <span className="text-neo-white text-xs">{t('wordWheel.results.time')}</span>
        </div>
      </m.div>

      {/* Daily Insight Cards — personalized analytics on challenge performance */}
      <m.div
        className="w-full z-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, type: 'spring', stiffness: 300, damping: 26 }}
      >
        <DailyInsightStack mode="word_wheel" date={puzzleDate} />
      </m.div>

      {/* Returning-player anti-bounce: terminal 'already-played' view gets a
          practice-wheel CTA so an engaged returner has an instant next game
          instead of a dead-end. Experiment-gated (wheel-replay-cta-v1). */}
      {!isPractice && alreadyPlayed && <WordWheelReplayCta />}

      {/* Guest signup conversion — Word Wheel bypasses the generic guest-stats
          signup gate, so this restores a value-led signup surface for the mode.
          Experiment-gated (wheel-signup-offer-v1); framing via selectWheelSignupOffer. */}
      {!isPractice && (
        <WordWheelSignupCta
          isAuthenticated={isAuthenticated}
          isPractice={isPractice}
          streakDays={streakDays}
          isFirstCompletion={isFirstCompletion}
          dismissedRecently={wasSignupModalDismissedRecently()}
          score={result.score}
        />
      )}

      {/* Catch-up suggestion: nudge the player to replay other missed dailies */}
      {!isPractice && (
        <m.div
          className="w-full z-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, type: 'spring', stiffness: 300, damping: 26 }}
        >
          <CatchUpSuggestion mode="word-wheel" excludeDate={puzzleDate} />
        </m.div>
      )}

      {/* Practice mode: replace cross-promos + leaderboard with chain CTA so the
          player flows from one practice mode to the next without dead-ends. */}
      {isPractice && (
        <m.div
          className="w-full z-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 26 }}
        >
          <PracticeChainCta currentMode="wheelRush" />
        </m.div>
      )}

      {/* PRIMARY CROSS-PROMO: Word Hunt CTA — promoted above leaderboard so users
          finish today's daily-pair (mirrors Word Hunt results page treatment). */}
      {!isPractice && !hasPlayedWordHunt && (
        <m.div
          className="w-full z-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 26 }}
        >
          <div className="relative">
            <span className="absolute -top-2 left-4 z-10 inline-block px-2 py-0.5 rounded-full bg-neo-lime text-neo-black text-[10px] font-neo-display font-black tracking-wider border-2 border-neo-black shadow-hard-sm">
              {t('wordHunt.results.stepBadge', 'STEP 2 OF 2')}
            </span>
            <Link
              href={`/${language}/daily/word-hunt`}
              onClick={() => trackGrowthEvent('cross_promo_click', {
                target: 'word_hunt',
                source: 'word_wheel_results',
                placement: 'primary',
                score: result.score,
                language,
              })}
              className="flex items-center justify-between gap-3 w-full p-5 rounded-neo border-3 border-neo-black bg-neo-lime shadow-hard-lg hover:scale-[1.02] active:translate-x-px active:translate-y-px active:shadow-hard-pressed transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-neo border-2 border-neo-black bg-neo-navy shrink-0">
                  <Type className="w-7 h-7 text-neo-lime" />
                </div>
                <div>
                  <span className="block font-neo-display font-black text-neo-black text-base leading-tight">
                    {t('wordHunt.results.completeDailyTitle', "Finish today's challenge")}
                  </span>
                  <p className="text-neo-black/70 text-xs mt-0.5">
                    {t('wordHunt.results.completeDailyDesc', 'Play Word Hunt to complete your Daily Challenge')}
                  </p>
                </div>
              </div>
              <m.div
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.2, repeat: 3, repeatDelay: 0.4, ease: 'easeInOut' }}
              >
                <ArrowRight className="w-6 h-6 text-neo-black shrink-0" />
              </m.div>
            </Link>
          </div>
        </m.div>
      )}

      {/* Back to Daily Hub — both challenges complete */}
      {!isPractice && hasPlayedWordHunt && (
        <m.div
          className="w-full z-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 26 }}
        >
          <Link
            href={`/${language}/daily`}
            data-testid="back-to-daily-link"
            className="flex items-center justify-between gap-3 w-full p-3 rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard-sm hover:bg-neo-navy active:translate-x-px active:translate-y-px transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-neo border-2 border-neo-black bg-neo-navy shrink-0">
                <Home className="w-5 h-5 text-neo-cyan" />
              </div>
              <div>
                <span className="block font-neo-display font-black text-neo-white text-sm leading-tight">
                  {t('wordWheel.results.backToDaily', 'Back to Daily Hub')}
                </span>
                <p className="text-neo-white/55 text-xs mt-0.5">
                  {t('wordWheel.results.backToDailyDesc', "See today's leaderboard")}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-neo-white/40 shrink-0" />
          </Link>
        </m.div>
      )}

      {/* Multiplayer cross-promo — only once today's daily pair is complete, so it
          never competes with the "finish today's challenge" daily↔daily CTA. */}
      {!isPractice && hasPlayedWordHunt && (
        <m.div
          className="w-full z-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.58, type: 'spring', stiffness: 300, damping: 26 }}
        >
          <MpModeCrossPromo language={language} source="word_wheel_results" t={t} />
        </m.div>
      )}

      {/* Words found list */}
      {result.wordsFound.length > 0 && (
        <m.div
          className="w-full z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-neo-white text-xs font-bold uppercase mb-2">
            {t('wordWheel.foundWords')}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {result.wordsFound.map((word, i) => (
              <m.span
                key={word}
                className="px-2 py-0.5 rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-white text-xs font-semibold shadow-hard-xs"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7 + i * 0.05 }}
              >
                {gameLang === 'he' ? applyHebrewFinalLetters(word) : word}{' '}
                <span className="text-neo-lime">+{scoreWord(word)}</span>
              </m.span>
            ))}
          </div>
        </m.div>
      )}

      {/* Hint: tap a player row to see diff */}
      {!isPractice && result.wordsFound.length > 0 && (
        <p className="text-xs text-neo-white text-center font-medium -mb-1">
          {t('wordWheel.results.tapPlayerHint', 'Tap a player to see what you missed')}
        </p>
      )}

      {/* Leaderboard — hidden in practice (no score persisted, would only confuse). */}
      {!isPractice && (
        <m.div
          className="w-full z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <TabbedDailyLeaderboard
            puzzleDate={puzzleDate}
            language={gameLang}
            currentPlayerId={currentPlayerId}
            currentGuestFingerprint={currentGuestFingerprint}
            scope="word-wheel"
            defaultTab="today"
            t={t}
            maxVisible={5}
            compact
            myWheelWordsFound={result.wordsFound}
          />
        </m.div>
      )}

    </m.div>
  );
};

export default WordWheelResults;
