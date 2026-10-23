'use client';

import { useEffect, useRef } from 'react';
import { m, AnimatePresence, useAnimationControls, useReducedMotion } from 'framer-motion';
import { Check, Lightbulb } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ConnectionPuzzle, GameState, PuzzleRating } from '@/lib/connections/types';
import ConnectionsKeyboard from './ConnectionsKeyboard';
import ConnectionsMascot from './ConnectionsMascot';
import AnswerSlots from './AnswerSlots';
import BridgeStage from './BridgeStage';
import { PuzzleActions, PuzzleResolution } from './PuzzleActions';
import { useBridgeTyping } from './useBridgeTyping';
import { MAX_GUESS_LEN } from '@/lib/connections/keyboard';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { BridgeSolveReveal } from './BridgeSolveReveal';

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

const STATUS_BORDER: Record<string, string> = {
  correct: 'border-neo-lime',
  wrong: 'border-neo-red',
  playing: 'border-neo-cream/40',
  finished: 'border-neo-cream/40',
  gaveUp: 'border-neo-red',
  outOfLives: 'border-neo-red',
};

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: 'border-neo-lime text-neo-lime',
  medium: 'border-neo-cyan text-neo-cyan',
  hard: 'border-neo-pink text-neo-pink',
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
  const reducedMotion = useReducedMotion();
  const shakeControls = useAnimationControls();
  const prevStatus = useRef(state.status);

  const isCorrect = state.status === 'correct';
  const isWrong = state.status === 'wrong';
  const isGaveUp = state.status === 'gaveUp';
  const isResolved = isCorrect || isGaveUp;
  const isDisabled = isResolved || state.status === 'finished' || state.status === 'outOfLives';
  const showHint = state.hintRevealed && !!puzzle.hint;
  const hasRated = state.ratedIds.has(puzzle.id);

  useEffect(() => {
    if (state.status === 'wrong' && prevStatus.current !== 'wrong') {
      // Escalate with each miss so the last life feels riskier than the first.
      const intensity = reducedMotion ? 0 : Math.min(1 + state.wrongAttempts * 0.2, 1.7);
      shakeControls.start({
        x: [0, -14, 14, -11, 11, -7, 7, -3, 3, 0].map((v) => v * intensity),
        transition: reducedMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeInOut' },
      });
    }
    prevStatus.current = state.status;
  }, [state.status, state.wrongAttempts, shakeControls, reducedMotion]);

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
  // WYSIWYG buffer: typed base letters, with the sofit glyph applied at word-end
  // for Hebrew (the value compared against the bridge stays base).
  const bufferDisplay = isRTL ? applyHebrewFinalLetters(state.input) : state.input;
  const slotsValue = isResolved ? puzzle.bridge.replace(/[^\p{L}\p{N}]/gu, '') : bufferDisplay;
  const slotState = isCorrect ? 'correct' : isWrong ? 'wrong' : 'idle';

  return (
    <AnimatePresence mode="wait">
      {/* Transform only — never `opacity: 0`. `m` stays frozen on `initial`
          until LazyMotion's features load, so a transparent start renders the
          whole puzzle blank whenever that chunk is slow or blocked. */}
      <m.div
        key={`entrance-${puzzle.id}`}
        initial={reducedMotion ? false : { y: 32, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        transition={reducedMotion ? { duration: 0 } : CARD_SPRING}
      >
        <m.div
          key={puzzle.id}
          data-testid="puzzle-card"
          animate={shakeControls}
          exit={{ opacity: 0, y: -16, scale: 0.97, transition: { duration: 0.18 } }}
          transition={reducedMotion ? { duration: 0 } : CARD_SPRING}
          className={[
            'relative rounded-neo border-neo-thick bg-neo-navy-light px-3 pb-4 pt-3 shadow-hard transition-colors duration-200',
            STATUS_BORDER[state.status] ?? STATUS_BORDER.playing,
          ].join(' ')}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="mb-2 flex items-center justify-between">
            <span data-testid="puzzle-mascot" className="pointer-events-none">
              <ConnectionsMascot status={state.status} className="h-12 w-12" />
            </span>
            {puzzle.difficulty && (
              <span
                className={[
                  'rounded border-2 px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-widest rtl:tracking-normal',
                  DIFFICULTY_STYLE[puzzle.difficulty] ?? 'border-neo-cream/40 text-neo-white',
                ].join(' ')}
              >
                {t(`connections.difficulty.${puzzle.difficulty}`)}
              </span>
            )}
          </div>

          <BridgeStage word1={puzzle.word1} word2={puzzle.word2} isCorrect={isCorrect} isGaveUp={isGaveUp}>
            {needsIME ? (
              <p
                data-testid="ime-echo"
                className="min-h-[3rem] py-1 text-center font-neo-display text-3xl font-black leading-[3rem] text-neo-cream"
              >
                {isResolved ? puzzle.bridge : state.input || <span className="text-neo-cream/40">?</span>}
              </p>
            ) : (
              <AnswerSlots
                value={slotsValue}
                slotCount={slotCap}
                state={slotState}
                dir={isRTL ? 'rtl' : 'ltr'}
                label={t('connections.placeholder')}
              />
            )}
          </BridgeStage>

          <div className="mt-3 flex min-h-[2.25rem] flex-col items-center justify-center" aria-live="polite">
            <AnimatePresence mode="wait">
              {showHint && !isResolved && (
                <m.p
                  key="hint"
                  initial={{ y: -6 }}
                  animate={{ y: 0 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center justify-center gap-2 text-center text-sm text-neo-yellow"
                >
                  <Lightbulb className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {puzzle.hint}
                </m.p>
              )}
              {isCorrect && (
                <m.p
                  key="correct"
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 14 }}
                  className="inline-flex items-center gap-2 font-neo-display text-xl font-black text-neo-lime"
                >
                  {t('connections.correct')}
                  <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
                </m.p>
              )}
              {isWrong && (
                <m.p key="wrong" initial={{ y: -4 }} animate={{ y: 0 }} className="text-center text-sm font-bold text-neo-red">
                  {t('connections.wrong')}
                </m.p>
              )}
              {isGaveUp && (
                <m.p
                  key="gaveUp"
                  initial={{ y: -6 }}
                  animate={{ y: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                  className="text-center text-sm font-bold text-neo-red"
                >
                  {t('connections.solutionIs')}: <span className="text-neo-white">{puzzle.bridge}</span>
                </m.p>
              )}
            </AnimatePresence>
          </div>

          {isResolved && <BridgeSolveReveal puzzle={puzzle} language={language} isCorrect={isCorrect} />}

          <div className="mt-2 flex flex-col gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
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
                      'min-h-[3.25rem] w-full rounded-neo border-2 bg-neo-navy px-4 py-3 text-lg shadow-hard',
                      'font-neo-display font-bold text-neo-white outline-none transition-colors duration-200 placeholder:font-neo-body placeholder:font-normal placeholder:text-neo-white/40 focus:border-neo-cyan',
                      isWrong ? 'border-neo-red bg-neo-red/10' : 'border-neo-cream/40',
                    ].join(' ')}
                  />
                  <m.button
                    type="button"
                    onClick={onSubmit}
                    whileTap={{ scale: 0.97 }}
                    disabled={state.input.trim().length === 0}
                    className="rounded-neo border-neo-thick border-neo-black bg-neo-cyan px-4 py-2.5 font-neo-display font-black text-neo-navy shadow-hard disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t('connections.submit')}
                  </m.button>
                </div>
              )
            ) : (
              !isDisabled && (
                <ConnectionsKeyboard
                  rows={keyboardRows}
                  onLetter={handleLetter}
                  onBackspace={handleBackspace}
                  onSubmit={onSubmit}
                  backspaceLabel={t('connections.backspace')}
                  submitLabel={t('connections.submit')}
                  canSubmit={state.input.trim().length > 0}
                  disabled={isDisabled}
                />
              )
            )}
          </div>

          <PuzzleActions
            puzzle={puzzle}
            state={state}
            isAdmin={isAdmin}
            isDisabled={isDisabled}
            onGiveUp={onGiveUp}
            onRevealHint={onRevealHint}
          />

          {isResolved && (
            <PuzzleResolution hasRated={hasRated} showRating={showRating} onRate={onRate} onNext={onNext} />
          )}
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
