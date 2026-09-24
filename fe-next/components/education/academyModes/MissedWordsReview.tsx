'use client';

/**
 * Missed Words Review — a fast 10-card spaced-retrieval run: see a word, pick
 * its meaning, or unscramble it. Streak meter + combo SFX, then a chest that
 * pays the XP the server recorded. Cards arrive pre-built
 * (lib/education/missedWordsReview.ts); `onFinish` records the run and
 * resolves to the server's XP (null when it could not be recorded).
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Flame, RotateCcw, Check, X, Target, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { summarizeReviewRun, scoreReviewAnswer, type ReviewCard } from '@/lib/education/missedWordsReview';
import { REVIEW_MASCOT_ART, reviewMascotMood } from '@/lib/education/academyReactions';
import { cn } from '@/lib/utils';
import {
  AcademyModeFrame,
  AcademyPlayerChip,
  usePreloadImages,
  primaryButtonClass,
  secondaryButtonClass,
  type AcademyPlayer,
} from './AcademyChrome';
import { AcademyReward } from './AcademyReward';
import ReviewCardView from './ReviewCardView';
import { ReviewMascot, ReviewRing } from './ReviewStage';
import { ReviewVaultIntro } from './ReviewVaultIntro';

export interface MissedWordsReviewProps {
  cards: ReviewCard[];
  lessonName: string;
  onBack: () => void;
  onFinish: (answers: boolean[]) => Promise<number | null>;
  onPlayAgain?: () => void;
  /** Pause on the answer before the next card (0 = advance immediately). */
  feedbackMs?: number;
  /** The signed-in student (avatar + name) for the HUD. */
  player?: AcademyPlayer;
}

type Phase = 'intro' | 'playing' | 'done';

export default function MissedWordsReview({ cards, lessonName, onBack, onFinish, onPlayAgain, feedbackMs = 800, player }: MissedWordsReviewProps) {
  const { t } = useLanguage();
  const sfx = useSoundEffects();
  // The chest meter loops forever — gate it on the OS setting AND the app's reduced-effects switch.
  const prefersReduced = useReducedMotion();
  const [reducedEffects] = useReducedEffects();
  const reduce = Boolean(prefersReduced) || reducedEffects;
  usePreloadImages(Object.values(REVIEW_MASCOT_ART));
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [xp, setXp] = useState<number | null>(null);
  const [recordFailed, setRecordFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setGameActive } = sfx;

  // Combo SFX are gated on an active game.
  useEffect(() => {
    setGameActive?.(true);
    return () => {
      setGameActive?.(false);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [setGameActive]);

  const streak = (() => {
    let s = 0;
    for (let i = answers.length - 1; i >= 0 && answers[i]; i--) s++;
    return s;
  })();

  const finish = (all: boolean[]) => {
    setPhase('done');
    sfx.playQuestCompleteSound?.();
    setXp(null);
    setRecordFailed(false);
    void onFinish(all).then(
      (value) => (value === null ? setRecordFailed(true) : setXp(value)),
      () => setRecordFailed(true),
    );
  };

  const answer = (correct: boolean) => {
    const all = [...answers, correct];
    setAnswers(all);
    let run = 0;
    for (let i = all.length - 1; i >= 0 && all[i]; i--) run++;
    if (correct) {
      void sfx.playComboSound?.(Math.max(1, run));
      if (run === 3) sfx.playStreakFireSound?.();
      setLastPoints(scoreReviewAnswer(true, run));
    } else {
      sfx.playWordRejectedSound?.();
      setLastPoints(0);
    }
    const advance = () => {
      setLastPoints(null);
      if (all.length >= cards.length) finish(all);
      else setIndex(all.length);
    };
    if (feedbackMs <= 0) advance();
    else timer.current = setTimeout(advance, feedbackMs);
  };

  const title = t('academy.modes.review.title', 'Missed Words Review');
  const playerChip = player ? <AcademyPlayerChip player={player} className="max-w-[32%] sm:max-w-[40%]" /> : null;
  const chestName = (tier: 'bronze' | 'silver' | 'gold') =>
    t(`academy.modes.review.chest.${tier}`, { bronze: 'Bronze chest', silver: 'Silver chest', gold: 'Gold chest' }[tier]);

  if (cards.length === 0) {
    return (
      <AcademyModeFrame title={title} onBack={onBack} accent="cyan" theme="vault" testId="review-screen" right={playerChip}>
        <div data-testid="review-empty" className="flex w-full max-w-md flex-col items-center gap-3 text-center lg:max-w-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- static art */}
          <img src={REVIEW_MASCOT_ART.cheer} alt="" className="h-40 w-40 object-contain drop-shadow-[5px_5px_0_#000] lg:h-72 lg:w-72" />
          <h2 className="font-neo-display text-3xl font-black uppercase text-neo-white lg:text-7xl" style={{ textShadow: '3px 3px 0 #000' }}>
            {t('academy.modes.review.emptyTitle', 'Nothing to review!')}
          </h2>
          <p className="font-neo-body text-base text-neo-cream lg:text-2xl">
            {t('academy.modes.review.emptyBody', 'Play a class game or a lesson, and the words you miss will show up here for a rematch.')}
          </p>
          <button type="button" data-testid="review-back" onClick={onBack} className={cn(primaryButtonClass, 'w-full lg:max-w-xl')}>
            {t('academy.modes.backToAcademy', 'Back to Academy')}
          </button>
        </div>
      </AcademyModeFrame>
    );
  }

  if (phase === 'intro') {
    const words = [...new Set(cards.map((c) => c.word))];
    return (
      <AcademyModeFrame title={title} onBack={onBack} accent="cyan" theme="vault" testId="review-screen" right={playerChip}>
        <ReviewVaultIntro
          lessonName={lessonName}
          words={words}
          onStart={() => { setPhase('playing'); setIndex(0); setAnswers([]); }}
        />
      </AcademyModeFrame>
    );
  }

  if (phase === 'done') {
    const s = summarizeReviewRun(answers);
    const perfect = s.total > 0 && s.correct === s.total;
    return (
      <AcademyModeFrame title={title} onBack={onBack} accent="cyan" theme="vault" testId="review-screen" right={playerChip}>
        <div data-testid="review-results" className="flex h-full min-h-0 w-full flex-col items-center justify-center">
          <AcademyReward
            tier={s.chest}
            headline={perfect ? t('academy.modes.review.perfect', 'Perfect run!') : t('academy.modes.review.runDone', 'Run complete!')}
            chestLabel={chestName(s.chest)}
            xp={recordFailed ? 0 : xp}
            aside={
              // eslint-disable-next-line @next/next/no-img-element -- static art
              <img
                src={perfect || s.bestStreak >= 3 ? REVIEW_MASCOT_ART.fire : REVIEW_MASCOT_ART.cheer}
                alt=""
                className="absolute bottom-[6%] end-0 h-20 w-20 object-contain drop-shadow-[4px_4px_0_#000] sm:h-28 sm:w-28 lg:h-56 lg:w-56"
              />
            }
            note={
              recordFailed ? (
                <p className="font-neo-body text-xs text-neo-pink lg:text-lg">{t('academy.modes.review.xpNotSaved', "Couldn't save XP this time. Your boxes still moved.")}</p>
              ) : null
            }
            stats={[
              { icon: <Target />, value: String(s.correct), suffix: t('academy.modes.review.outOf', '/{total}', { total: s.total }), label: t('academy.modes.review.statCorrect', 'Correct') },
              { icon: <Flame />, value: String(s.bestStreak), label: t('academy.modes.review.statStreak', 'Best streak') },
              { icon: <Trophy />, value: String(s.score), label: t('academy.modes.review.statPoints', 'Points') },
            ]}
            actions={
              <>
                {onPlayAgain && (
                  <button type="button" data-testid="review-again" onClick={onPlayAgain} className={cn(primaryButtonClass, 'flex-1 whitespace-nowrap px-3 text-base sm:text-xl')}>
                    <RotateCcw className="h-5 w-5 lg:h-8 lg:w-8" aria-hidden />
                    {t('academy.modes.playAgain', 'Play again')}
                  </button>
                )}
                <button type="button" data-testid="review-back" onClick={onBack} className={cn(secondaryButtonClass, 'flex-1 px-3 text-sm sm:text-base')}>
                  {t('academy.modes.backToAcademy', 'Back to Academy')}
                </button>
              </>
            }
          />
        </div>
      </AcademyModeFrame>
    );
  }

  const card = cards[index];
  const projected = answers.length ? summarizeReviewRun(answers).chest : 'gold';
  const answered = answers.length > index;
  const lastCorrect = answered ? answers[index] : null;
  const mood = reviewMascotMood({ answered, correct: lastCorrect, streak });
  const progressText = t('academy.modes.review.progress', '{n} / {total}', { n: index + 1, total: cards.length });
  return (
    <AcademyModeFrame
      title={title}
      onBack={onBack}
      accent="cyan"
      theme="vault"
      testId="review-screen"
      right={
        <motion.div
          key={streak}
          data-testid="review-streak"
          initial={reduce || streak === 0 ? false : { scale: 1.4 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 12 }}
          className={cn(
            'flex items-center gap-1 rounded-neo border-[3px] px-2.5 py-1 font-neo-display text-lg font-black shadow-hard lg:px-4 lg:text-3xl',
            streak >= 3 ? 'border-black bg-neo-orange text-black' : streak > 0 ? 'border-black bg-neo-yellow text-black' : 'border-neo-cream bg-neo-navy-elevated text-neo-cream',
          )}
          style={streak >= 3 ? { boxShadow: '3px 3px 0 #000, 0 0 22px rgba(255,107,53,0.8)' } : undefined}
          aria-label={t('academy.modes.review.streak', 'Streak {count}', { count: streak })}
        >
          <Flame className="h-5 w-5 lg:h-8 lg:w-8" aria-hidden />
          {streak}
        </motion.div>
      }
    >
      <div className="flex min-h-0 w-full flex-1 flex-col lg:grid lg:max-w-[110rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,52rem)_minmax(0,1fr)] lg:items-center lg:gap-10">
        {/* Upper stage (phones) / side columns (desktop): mascot + the run ring around the chest. */}
        <div className="flex min-h-0 flex-1 items-end justify-center gap-2 pb-3 lg:contents">
          <ReviewMascot mood={mood} big className="shrink-0 lg:order-1 lg:justify-self-end" />
          <div className="flex min-h-0 flex-col items-center justify-end gap-1 lg:order-3 lg:justify-self-start">
            <ReviewRing
              answers={answers}
              index={index}
              total={cards.length}
              streak={streak}
              chestLabel={chestName(projected)}
              progressLabel={progressText}
            />
            <span data-testid="review-progress" dir="ltr" className="mt-2 font-neo-display text-base font-black text-neo-cream lg:text-3xl">
              {progressText}
            </span>
          </div>
        </div>
        <div className="relative flex w-full shrink-0 items-center justify-center pb-1 lg:order-2">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={card.id}
              initial={reduce ? false : { x: 60, rotate: 3, opacity: 0.4 }}
              animate={lastCorrect === false && !reduce ? { x: [0, -10, 10, -6, 0], rotate: 0, opacity: 1 } : { x: 0, rotate: 0, opacity: 1 }}
              exit={reduce ? undefined : { x: -60, rotate: -3, opacity: 0 }}
              // Springs only take two keyframes — the 5-frame miss shake must be a tween or framer throws and the run freezes.
              transition={lastCorrect === false ? { duration: 0.4, ease: 'easeOut' } : { type: 'spring', stiffness: 380, damping: 26 }}
              className="w-full"
            >
              <ReviewCardView card={card} answered={answered} correct={lastCorrect} onAnswer={answer} onTile={() => sfx.playTileSelectSound?.()} />
            </motion.div>
          </AnimatePresence>
          <AnimatePresence>
            {lastPoints !== null && (
              <motion.div
                key={`pts-${answers.length}`}
                initial={reduce ? false : { y: 10, scale: 0.6 }}
                animate={{ y: -8, scale: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'pointer-events-none absolute -top-5 z-10 flex items-center gap-1 rounded-neo border-[3px] border-black px-3 py-1 font-neo-display text-xl font-black shadow-hard lg:text-4xl',
                  lastPoints > 0 ? 'bg-neo-lime text-black' : 'bg-neo-pink text-black',
                )}
              >
                {lastPoints > 0 ? <Check className="h-5 w-5" aria-hidden /> : <X className="h-5 w-5" aria-hidden />}
                {lastPoints > 0 ? `+${lastPoints}` : card.word}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AcademyModeFrame>
  );
}
