'use client';

import { useEffect, useRef, useState } from 'react';
import { useExperiment } from '@/hooks/useExperiment';
import { m, AnimatePresence, useAnimationControls } from 'framer-motion';
import { ThumbsUp, ThumbsDown, ArrowRight, Flag, Check, Lightbulb, Eye } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';
import type { ConnectionPuzzle, GameState, PuzzleRating } from '@/lib/connections/types';
import ConnectionsKeyboard from './ConnectionsKeyboard';
import AnswerSlots from './AnswerSlots';
import { useBridgeTyping } from './useBridgeTyping';
import { MAX_GUESS_LEN } from '@/lib/connections/keyboard';
import { whyItWorks } from '@/lib/connections/whyItWorks';
import { freeHintsRemaining, consumeFreeHint } from '@/lib/connections/freeHints';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';

interface PuzzleCardProps {
  puzzle: ConnectionPuzzle;
  state: GameState;
  isAdmin: boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onGiveUp: () => void;
  onRevealHint: () => void;
  onRate: (rating: PuzzleRating) => void;
  onNext: () => void;
  /** Pyramid stages pass false — their onRate is a no-op, so the CTAs were dead noise. */
  showRating?: boolean;
}

const CARD_SPRING = { type: 'spring' as const, stiffness: 320, damping: 26 };

const WORD_CHIP_VARIANTS = {
  initial: { opacity: 0, scale: 0.75, y: 10 },
  animate: (delay: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 20, delay },
  }),
  exit: { opacity: 0, scale: 0.85, transition: { duration: 0.12 } },
};

const STATUS_BORDER: Record<string, string> = {
  correct: 'border-neo-lime',
  wrong: 'border-neo-red',
  playing: 'border-neo-purple',
  finished: 'border-neo-navy-light',
  gaveUp: 'border-neo-red',
  outOfLives: 'border-neo-red',
};

const STATUS_BG: Record<string, string> = {
  correct: 'bg-neo-lime/10',
  wrong: 'bg-neo-red/10',
  playing: 'bg-neo-navy-light/80',
  finished: 'bg-neo-navy-light',
  gaveUp: 'bg-neo-red/10',
  outOfLives: 'bg-neo-red/10',
};

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: 'border-neo-lime/50 text-neo-lime',
  medium: 'border-neo-cyan/50 text-neo-cyan',
  hard: 'border-neo-pink/50 text-neo-pink',
};

export default function PuzzleCard({
  puzzle,
  state,
  isAdmin,
  onInputChange,
  onSubmit,
  onGiveUp,
  onRevealHint,
  onRate,
  onNext,
  showRating = true,
}: PuzzleCardProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const shakeControls = useAnimationControls();
  const prevStatus = useRef(state.status);

  const borderColor = STATUS_BORDER[state.status] ?? STATUS_BORDER.playing;
  const bgColor = STATUS_BG[state.status] ?? STATUS_BG.playing;
  const isCorrect = state.status === 'correct';
  const isWrong = state.status === 'wrong';
  const isGaveUp = state.status === 'gaveUp';
  const isResolved = isCorrect || isGaveUp;
  const isDisabled = isResolved || state.status === 'finished' || state.status === 'outOfLives';
  const bridgeRevealed = isCorrect || isGaveUp;

  const { variant: hintGateVariant, trackExposure: trackHintGateExposure } =
    useExperiment('exp-connections-hint-gate-v1');
  const showFallbackHint =
    hintGateVariant === 'after-3-wrong' && state.wrongAttempts >= 3 && !isAdmin;
  useEffect(() => {
    if (showFallbackHint && puzzle.hint && !state.hintRevealed) trackHintGateExposure();
  }, [showFallbackHint, puzzle.hint, state.hintRevealed, trackHintGateExposure]);
  const hasRated = state.ratedIds.has(puzzle.id);
  const showHint = state.hintRevealed && !!puzzle.hint;

  // Rewarded-ad gate for non-admin reveal-answer
  const revealAnswerAd = useRewardedFeatureUnlock({
    placement: 'connections_reveal_answer',
    surface: 'hint',
    onUnlock: onGiveUp,
    disabled: isAdmin || isDisabled,
    context: { puzzleId: puzzle.id, difficulty: puzzle.difficulty },
  });

  // Every player gets FREE_HINTS_PER_DAY free reveals before the ad gate.
  const [freeHints, setFreeHints] = useState(() => freeHintsRemaining());
  const handleFreeHint = () => {
    setFreeHints(consumeFreeHint());
    onRevealHint();
  };

  // Rewarded-ad gate for non-admin reveal-hint
  const revealHintAd = useRewardedFeatureUnlock({
    placement: 'connections_reveal_hint',
    surface: 'hint',
    onUnlock: onRevealHint,
    disabled: isAdmin || state.hintRevealed || isDisabled || !puzzle.hint,
    context: { puzzleId: puzzle.id },
  });

  useEffect(() => {
    if (state.status === 'wrong' && prevStatus.current !== 'wrong') {
      shakeControls.start({
        x: [0, -14, 14, -11, 11, -7, 7, -3, 3, 0],
        transition: { duration: 0.5, ease: 'easeInOut' },
      });
    }
    prevStatus.current = state.status;
  }, [state.status, state.wrongAttempts, shakeControls]);

  const { keyboardRows, needsIME, slotCap, handleLetter, handleBackspace } = useBridgeTyping({
    input: state.input,
    answer: puzzle.bridge,
    locale: language,
    disabled: isDisabled,
    status: state.status,
    wrongAttempts: state.wrongAttempts,
    onInputChange,
    onSubmit,
  });
  // WYSIWYG buffer: render the typed base letters, applying the sofit/final
  // glyph at word-end for Hebrew (the value compared against the bridge stays base).
  const bufferDisplay = isRTL ? applyHebrewFinalLetters(state.input) : state.input;
  // On reveal (correct or gave-up) the slots settle on the actual bridge.
  const slotsValue = bridgeRevealed ? puzzle.bridge.replace(/[^\p{L}\p{N}]/gu, '') : bufferDisplay;

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={puzzle.id}
        animate={shakeControls}
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.97, transition: { duration: 0.18 } }}
        transition={CARD_SPRING}
        viewport={{ once: true }}
        className={[
          'relative rounded-neo border-neo-thick shadow-hard',
          borderColor,
          bgColor,
          'px-4 pb-5 pt-9 transition-colors duration-200',
        ].join(' ')}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {puzzle.difficulty && (
          <span
            className={[
              'absolute top-3 font-mono text-xs uppercase tracking-widest rtl:tracking-normal',
              'px-2 py-0.5 rounded border',
              isRTL ? 'left-3' : 'right-3',
              DIFFICULTY_STYLE[puzzle.difficulty] ?? 'border-neo-white/20 text-neo-white',
            ].join(' ')}
          >
            {t(`connections.difficulty.${puzzle.difficulty}`)}
          </span>
        )}

        <AnimatePresence mode="wait">
          <div key={`chain-${puzzle.id}`} className="relative flex items-center justify-center gap-2 mb-4 flex-wrap">
            {/* The "bridge built" moment: a hard beam draws across the chain on reveal. */}
            {bridgeRevealed && (
              <m.div
                data-testid="bridge-connector"
                aria-hidden="true"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className={[
                  'absolute inset-x-1 top-1/2 -z-10 h-2 -translate-y-1/2 rounded-full border border-black',
                  'origin-left rtl:origin-right',
                  isCorrect ? 'bg-neo-lime' : 'bg-neo-red/70',
                ].join(' ')}
              />
            )}
            <m.span
              custom={0}
              variants={WORD_CHIP_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              className="font-neo-display text-2xl text-neo-white font-bold tracking-wider px-3 py-1 rounded-neo border border-neo-white/20 bg-neo-navy shadow-hard-sm"
            >
              {puzzle.word1}
            </m.span>

            <m.span
              custom={0.06}
              variants={WORD_CHIP_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-neo-white text-xl font-mono select-none"
            >
              +
            </m.span>

            <m.div
              custom={0.12}
              variants={WORD_CHIP_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              className={[
                'min-w-[56px] h-10 px-3 rounded-neo border-2 flex items-center justify-center',
                'font-neo-display font-bold text-lg transition-all duration-300',
                isCorrect
                  ? 'border-neo-lime bg-neo-lime/20 text-neo-lime'
                  : isGaveUp
                  ? 'border-neo-red bg-neo-red/20 text-neo-red'
                  : 'border-neo-purple/70 bg-neo-purple/10 text-neo-purple',
              ].join(' ')}
            >
              {bridgeRevealed ? (
                <m.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring' as const, stiffness: 400, damping: 14 }}
                >
                  {puzzle.bridge}
                </m.span>
              ) : (
                <m.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                  ?
                </m.span>
              )}
            </m.div>

            <m.span
              custom={0.18}
              variants={WORD_CHIP_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-neo-white text-xl font-mono select-none"
            >
              +
            </m.span>

            <m.span
              custom={0.24}
              variants={WORD_CHIP_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              className="font-neo-display text-2xl text-neo-white font-bold tracking-wider px-3 py-1 rounded-neo border border-neo-white/20 bg-neo-navy shadow-hard-sm"
            >
              {puzzle.word2}
            </m.span>
          </div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {showHint && (
            <m.p
              key="hint"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="text-neo-yellow text-sm text-center mb-4 inline-flex items-center justify-center gap-2 w-full"
            >
              <Lightbulb className="w-4 h-4" aria-hidden="true" />
              {puzzle.hint}
            </m.p>
          )}

          {isCorrect && (
            <m.p
              key="correct"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 14 }}
              className="text-neo-lime text-center text-lg font-bold mb-4 inline-flex items-center justify-center gap-2 w-full"
            >
              {t('connections.correct')}
              <Check className="w-5 h-5" aria-hidden="true" />
            </m.p>
          )}

          {state.status === 'wrong' && (
            <m.p
              key="wrong"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-neo-red text-center text-sm mb-4"
            >
              {t('connections.wrong')}
            </m.p>
          )}

          {isGaveUp && (
            <m.p
              key="gaveUp"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              className="text-neo-red text-center text-sm font-bold mb-4"
            >
              {t('connections.solutionIs')}: <span className="text-neo-white">{puzzle.bridge}</span>
            </m.p>
          )}

          {bridgeRevealed && (() => {
            const { left, right } = whyItWorks(puzzle);
            return (
              <m.div
                key="why"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.15 }}
                className="mb-6 flex flex-col items-center gap-2 rounded-neo border-neo border-neo-lime/30 bg-neo-lime/5 px-3 py-3 shadow-hard-sm"
              >
                <span className="text-neo-lime/80 text-xs font-neo-body font-bold uppercase tracking-[0.18em]">
                  {t('connections.whyItWorks')}
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2" dir={isRTL ? 'rtl' : 'ltr'}>
                  <span className="rounded-neo border border-neo-lime/40 bg-neo-lime/10 px-2.5 py-1 font-neo-display font-bold text-sm text-neo-lime">
                    {left}
                  </span>
                  <span className="text-neo-white/40 text-sm select-none" aria-hidden="true">·</span>
                  <span className="rounded-neo border border-neo-lime/40 bg-neo-lime/10 px-2.5 py-1 font-neo-display font-bold text-sm text-neo-lime">
                    {right}
                  </span>
                </div>
              </m.div>
            );
          })()}
        </AnimatePresence>

        <div className="flex flex-col gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
          {needsIME ? (
            /* Scripts like Japanese can't fit an on-screen keyboard — use the
               device's native IME via a real text input. */
            !isDisabled && (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  lang={language}
                  inputMode="text"
                  enterKeyHint="done"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={t('connections.placeholder')}
                  value={state.input}
                  onChange={(e) => onInputChange(e.target.value.slice(0, MAX_GUESS_LEN))}
                  onKeyDown={(e) => {
                    // Don't submit mid-IME-composition (e.key === 'Process'/229).
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && state.input.trim().length > 0) {
                      e.preventDefault();
                      onSubmit();
                    }
                  }}
                  placeholder={t('connections.placeholder')}
                  className={[
                    'min-h-[3.25rem] w-full rounded-neo border-neo bg-neo-navy px-4 py-3 text-lg shadow-hard',
                    'font-neo-display font-bold text-neo-white placeholder:text-neo-white/40 placeholder:font-neo-body placeholder:font-normal',
                    'outline-none focus:border-neo-cyan transition-colors duration-200',
                    isCorrect ? 'border-neo-lime' : isWrong ? 'border-neo-red bg-neo-red/10' : 'border-neo-white/20',
                  ].join(' ')}
                />
                <m.button
                  type="button"
                  onClick={onSubmit}
                  whileTap={{ scale: 0.97 }}
                  disabled={state.input.trim().length === 0}
                  className="rounded-neo border-neo-thick border-neo-cyan bg-neo-cyan px-4 py-2.5 font-neo-display font-black text-neo-navy shadow-hard disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('connections.submit')}
                </m.button>
              </div>
            )
          ) : (
            <>
              {/* Wordle-style slots — on-screen keys and physical keys both feed this. */}
              <AnswerSlots
                value={slotsValue}
                slotCount={slotCap}
                state={isCorrect ? 'correct' : isWrong ? 'wrong' : 'idle'}
                dir={isRTL ? 'rtl' : 'ltr'}
                label={t('connections.placeholder')}
              />
              {!isDisabled && (
                <ConnectionsKeyboard
                  rows={keyboardRows}
                  dir={isRTL ? 'rtl' : 'ltr'}
                  onLetter={handleLetter}
                  onBackspace={handleBackspace}
                  onSubmit={onSubmit}
                  backspaceLabel={t('connections.backspace')}
                  submitLabel={t('connections.submit')}
                  canSubmit={state.input.trim().length > 0}
                  disabled={isDisabled}
                />
              )}
            </>
          )}
        </div>

        {/* Reveal-hint + reveal-answer / give-up row — active play only */}
        {(state.status === 'playing' || state.status === 'wrong') && (
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {/* Reveal hint button — only when puzzle has a hint and not yet revealed */}
            {puzzle.hint && !state.hintRevealed && (
              isAdmin ? (
                <m.button
                  type="button"
                  onClick={onRevealHint}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center gap-2 rounded-neo border-neo border-neo-yellow/70 bg-transparent text-neo-yellow font-neo-body text-sm px-4 py-2 hover:bg-neo-yellow/10 transition-colors"
                >
                  <Lightbulb className="w-4 h-4" aria-hidden="true" />
                  {t('connections.revealHint')}
                </m.button>
              ) : freeHints > 0 ? (
                <m.button
                  type="button"
                  onClick={handleFreeHint}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center gap-2 rounded-neo border-neo border-neo-yellow/70 bg-transparent text-neo-yellow font-neo-body text-sm px-4 py-2 hover:bg-neo-yellow/10 transition-colors"
                >
                  <Lightbulb className="w-4 h-4" aria-hidden="true" />
                  {t('connections.freeHint', { count: freeHints })}
                </m.button>
              ) : (revealHintAd.canShowAd || showFallbackHint) ? (
                <m.button
                  type="button"
                  onClick={revealHintAd.canShowAd ? revealHintAd.offer : onRevealHint}
                  whileTap={{ scale: 0.96 }}
                  disabled={revealHintAd.canShowAd && (revealHintAd.status === 'loading' || revealHintAd.status === 'showing')}
                  className="inline-flex items-center gap-1.5 text-neo-white/55 font-neo-body text-xs px-2 py-1 hover:text-neo-yellow underline-offset-4 hover:underline transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('connections.revealHintAd')}
                </m.button>
              ) : null
            )}

            {/* Reveal answer / give-up — admin gets free skip; non-admin gets ad-gated reveal */}
            {isAdmin ? (
              <m.button
                type="button"
                onClick={onGiveUp}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="inline-flex items-center gap-2 rounded-neo border-neo border-neo-red/70 bg-transparent text-neo-red font-neo-body text-sm px-4 py-2 hover:bg-neo-red/10 transition-colors"
              >
                <Flag className="w-4 h-4" aria-hidden="true" />
                {t('connections.adminGiveUp')}
              </m.button>
            ) : revealAnswerAd.canShowAd ? (
              <m.button
                type="button"
                onClick={revealAnswerAd.offer}
                whileTap={{ scale: 0.96 }}
                disabled={revealAnswerAd.status === 'loading' || revealAnswerAd.status === 'showing'}
                className="inline-flex items-center gap-1.5 text-neo-white/55 font-neo-body text-xs px-2 py-1 hover:text-neo-purple underline-offset-4 hover:underline transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                {t('connections.revealAnswerAd')}
              </m.button>
            ) : null}
          </div>
        )}

        {isResolved && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 22 }}
            className="mt-4 flex flex-col items-center gap-2"
          >
            {!showRating ? null : !hasRated ? (
              <div className="flex items-center gap-2">
                <span className="text-neo-white/45 text-[0.7rem] font-neo-body">
                  {t('connections.rateThis')}
                </span>
                <m.button
                  onClick={() => onRate('like')}
                  whileTap={{ scale: 0.9 }}
                  aria-label={t('connections.like')}
                  className="inline-flex items-center justify-center rounded-neo border border-neo-lime/40 bg-transparent text-neo-lime/80 p-1.5 hover:bg-neo-lime/10 hover:text-neo-lime transition-colors"
                >
                  <ThumbsUp className="w-4 h-4" aria-hidden="true" />
                </m.button>
                <m.button
                  onClick={() => onRate('dislike')}
                  whileTap={{ scale: 0.9 }}
                  aria-label={t('connections.dislike')}
                  className="inline-flex items-center justify-center rounded-neo border border-neo-red/40 bg-transparent text-neo-red/80 p-1.5 hover:bg-neo-red/10 hover:text-neo-red transition-colors"
                >
                  <ThumbsDown className="w-4 h-4" aria-hidden="true" />
                </m.button>
              </div>
            ) : (
              <p className="text-neo-cyan text-sm inline-flex items-center gap-2">
                <Check className="w-4 h-4" aria-hidden="true" />
                {t('connections.thanks')}
              </p>
            )}

            {/* Next button on BOTH correct + gaveUp so the rating CTA stays
                on screen long enough for the player to actually tap it. Auto-
                advance was hiding the prompt in 1.2s on correct answers
                (ConnectionsGame.tsx) — feedback signal is now user-driven. */}
            {isResolved && (
              <m.button
                onClick={onNext}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.96 }}
                className="mt-1 rounded-neo border-neo-thick border-neo-cyan bg-neo-cyan text-neo-navy font-neo-display font-bold px-6 py-2 shadow-hard inline-flex items-center gap-2"
              >
                {t('connections.next')}
                <DirectionalIcon icon={ArrowRight} className="w-4 h-4" />
              </m.button>
            )}
          </m.div>
        )}
      </m.div>
    </AnimatePresence>
  );
}
