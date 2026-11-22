'use client';

import { useEffect, useRef } from 'react';
import { m, AnimatePresence, useAnimationControls, useReducedMotion } from 'framer-motion';
import { Check, Lightbulb } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import type { ConnectionPuzzle, GameState, PuzzleRating } from '@/lib/connections/types';
import ConnectionsKeyboard from './ConnectionsKeyboard';
import BridgeSubmitButton from './BridgeSubmitButton';
import ConnectionsMascot from './ConnectionsMascot';
import AnswerSlots from './AnswerSlots';
import BridgeStage from './BridgeStage';
import { PuzzleActions, PuzzleResolution } from './PuzzleActions';
import { useBridgeTyping, focusOnFinePointer } from './useBridgeTyping';
import { MAX_GUESS_LEN } from '@/lib/connections/keyboard';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { BridgeSolveReveal } from './BridgeSolveReveal';
import BridgeCelebration from './BridgeCelebration';
import { fireConfetti } from '@/utils/confettiUtils';

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
  /** Daily only: after this many misses, a free skip when no ad reveal is available. */
  skipAfterMisses?: number;
  /** False when the host already has a mascot on screen (the pyramid's explorer). */
  showMascot?: boolean;
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
  skipAfterMisses,
  showMascot = true,
}: PuzzleCardProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const reducedMotion = useReducedMotion();
  const shakeControls = useAnimationControls();
  // Locks the body to the viewport (no page scroll) and hides the bottom nav while a puzzle is up.
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);
  const prevStatus = useRef(state.status);
  const stageRef = useRef<HTMLDivElement>(null);

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
    if (state.status === 'correct' && prevStatus.current !== 'correct' && !reducedMotion) {
      const rect = stageRef.current?.getBoundingClientRect();
      if (rect && typeof window !== 'undefined') {
        void fireConfetti({
          particleCount: 46,
          spread: 75,
          startVelocity: 34,
          scalar: 0.9,
          origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
        });
      }
    }
    prevStatus.current = state.status;
  }, [state.status, state.wrongAttempts, shakeControls, reducedMotion]);

  const { keyboardRows, needsIME, slotCap, handleLetter, handleBackspace, handleClear, pressedKey } = useBridgeTyping({
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

  // Points this solve added, for the celebration chip.
  const scoreAtStartRef = useRef({ id: puzzle.id, score: state.score });
  if (scoreAtStartRef.current.id !== puzzle.id) scoreAtStartRef.current = { id: puzzle.id, score: state.score };
  const solvePoints = Math.max(0, state.score - scoreAtStartRef.current.score);

  return (
    <AnimatePresence mode="wait">
      {/* Transform only — never `opacity: 0`. `m` stays frozen on `initial`
          until LazyMotion's features load, so a transparent start renders the
          whole puzzle blank whenever that chunk is slow or blocked. */}
      <m.div
        key={`entrance-${puzzle.id}`}
        initial={reducedMotion ? false : { y: 24, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={reducedMotion ? { duration: 0 } : CARD_SPRING}
        className="flex min-h-0 flex-1 flex-col"
      >
        <m.div
          key={puzzle.id}
          data-testid="puzzle-card"
          data-status={state.status}
          animate={shakeControls}
          exit={{ opacity: 0, y: -16, scale: 0.97, transition: { duration: 0.18 } }}
          transition={reducedMotion ? { duration: 0 } : CARD_SPRING}
          className={[
            'group/card relative flex min-h-0 flex-1 flex-col rounded-neo border-neo-thick bg-neo-navy-light px-2 pb-1.5 pt-1.5 shadow-hard transition-colors duration-200 sm:px-3 sm:pb-3 sm:pt-2 shell:px-6 shell:pb-5 shell:pt-4',
            STATUS_BORDER[state.status] ?? STATUS_BORDER.playing,
          ].join(' ')}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="flex min-h-11 items-center gap-1.5">
            {showMascot && (
              <span data-testid="puzzle-mascot" className="pointer-events-none shrink-0 group-has-[input:focus]/card:hidden">
                <ConnectionsMascot status={state.status} className="h-9 w-9 [@media(min-height:780px)]:h-12 [@media(min-height:780px)]:w-12 shell:h-14 shell:w-14" />
              </span>
            )}
            {puzzle.difficulty && (
              <span
                className={[
                  'shrink-0 rounded border-2 px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase leading-tight tracking-wider rtl:tracking-normal',
                  DIFFICULTY_STYLE[puzzle.difficulty] ?? 'border-neo-cream/40 text-neo-white',
                ].join(' ')}
              >
                {t(`connections.difficulty.${puzzle.difficulty}`)}
              </span>
            )}
            <div className="ms-auto flex min-w-0 flex-1 justify-end">
              <PuzzleActions
                puzzle={puzzle}
                state={state}
                isAdmin={isAdmin}
                isDisabled={isDisabled}
                onGiveUp={onGiveUp}
                onRevealHint={onRevealHint}
                skipAfterMisses={skipAfterMisses}
              />
            </div>
          </div>

          {/* Everything above the dock shrinks, then clips, before the dock leaves the screen. */}
          <div data-testid="puzzle-play-area" className="flex min-h-0 flex-1 flex-col overflow-y-clip">
            {/* Verdict line (correct / wrong / gave up) gets its own fixed slot above the stage, so it
                never shares a row with the hint and never shifts the stage or keyboard. */}
            <div data-testid="puzzle-verdict" className="flex h-6 shrink-0 items-center justify-center" aria-live="polite">
              <AnimatePresence mode="wait">
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

            {/* Size container: BridgeStage caps its plates, tiles and river by this box's
                height (cqh), so they shrink to fit instead of spilling over the action row
                above or the feedback line below. `safe` centering never pushes content
                past the top edge; the floor keeps a readable stage if a host ever
                leaves this box without a flex height. A host that is a height
                container (the pyramid's phone root) lowers the floor on short
                screens, so the keyboard dock is never pushed below the fold. */}
            <div
              ref={stageRef}
              data-testid="puzzle-stage"
              className="relative flex min-h-[11rem] flex-1 flex-col [@media(max-height:700px)]:min-h-[7rem] [@container(42rem<height<=54rem)]:min-h-[8.5rem] [@container(36rem<height<=42rem)]:min-h-[7rem] [@container(height<=36rem)]:min-h-[6rem] justify-center-safe py-2 group-has-[input:focus]/card:py-0 shell:py-4"
              style={{ containerType: 'size' }}
            >
              <BridgeStage word1={puzzle.word1} word2={puzzle.word2} isCorrect={isCorrect} isGaveUp={isGaveUp} isRTL={isRTL}>
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
              {isCorrect && <BridgeCelebration streak={state.streak} points={solvePoints} />}
            </div>

            {/* Hint: its own full-width row between the stage and the keyboard dock. The
                min-height reserves two wrapped lines up front (so revealing it never moves
                the dock) and the bottom margin keeps the pill off the keys. */}
            {puzzle.hint && !isResolved && (
              <div data-testid="puzzle-hint-row" className="mb-2 flex min-h-[3rem] w-full shrink-0 items-center justify-center [@media(max-height:700px)]:mb-1 [@media(max-height:700px)]:min-h-[2.5rem] [@container(max-height:36rem)]:min-h-0 [@container(max-height:36rem)]:mb-1">
                <AnimatePresence>
                {showHint && !isResolved && (
                  <m.p
                    key="hint"
                    initial={reducedMotion ? false : { y: -8, scale: 0.9 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                    className="inline-flex w-full max-w-full items-center justify-center gap-2 rounded-2xl border-2 border-neo-yellow bg-neo-yellow/10 px-3 py-1 text-center text-sm font-bold leading-tight text-neo-yellow"
                  >
                    <Lightbulb className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="line-clamp-2">{puzzle.hint}</span>
                  </m.p>
                )}
                </AnimatePresence>
              </div>
            )}

          </div>

          {/* The dock: keyboard while playing, the payoff + Next once resolved —
              same reserved height, so the page never grows into a scroll. The one-line
              IME input skips the reservation so the plates get that room instead. */}
          <div
            className={`flex shrink-0 flex-col justify-end [--conn-dock:13.375rem] sm:[--conn-dock:15.25rem] [@media(max-height:700px)]:[--conn-dock:11.625rem] [@media(max-width:639px)_and_(min-height:780px)]:[--conn-dock:14.875rem] [@container(max-height:42rem)]:[--conn-dock:11.625rem] shell:mx-auto shell:w-full shell:max-w-[40rem] ${needsIME && !isResolved ? '' : 'min-h-[calc(var(--conn-dock)+max(0.75rem,env(safe-area-inset-bottom,0px)))] [html.has-global-bottom-nav_&]:min-h-[calc(var(--conn-dock)+0.75rem)] [html.has-admob-banner_&]:min-h-[calc(var(--conn-dock)+0.75rem)] [html.has-web-anchor-ad_&]:min-h-[calc(var(--conn-dock)+0.75rem)]'}`}
          >
            {isResolved ? (
              <div className="flex flex-col gap-2">
                <BridgeSolveReveal puzzle={puzzle} language={language} isCorrect={isCorrect} />
                <PuzzleResolution hasRated={hasRated} showRating={showRating} onRate={onRate} onNext={onNext} />
              </div>
            ) : needsIME ? (
              /* Scripts like Japanese can't fit an on-screen keyboard — use the
                 device's native IME via a real text input. */
              !isDisabled && (
                <div className="flex flex-col gap-2 px-1 pb-3 [html:not(.has-global-bottom-nav):not(.has-admob-banner):not(.has-web-anchor-ad)_&]:pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
                  <input
                    ref={focusOnFinePointer}
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
                      'min-h-[3.25rem] w-full min-w-0 rounded-neo border-2 bg-neo-navy px-3 py-2.5 text-lg shadow-hard',
                      'font-neo-display font-bold text-neo-white outline-none transition-colors duration-200 placeholder:font-neo-body placeholder:font-normal placeholder:text-neo-white/40 focus:border-neo-cyan',
                      isWrong ? 'border-neo-red bg-neo-red/10' : 'border-neo-cream/40',
                    ].join(' ')}
                  />
                  <BridgeSubmitButton
                    label={t('connections.submit')}
                    onSubmit={onSubmit}
                    disabled={state.input.trim().length === 0}
                  />
                </div>
              )
            ) : (
              !isDisabled && (
                <ConnectionsKeyboard
                  rows={keyboardRows}
                  onLetter={handleLetter}
                  onBackspace={handleBackspace}
                  onClear={handleClear}
                  onSubmit={onSubmit}
                  backspaceLabel={t('connections.backspace')}
                  submitLabel={t('connections.submit')}
                  canSubmit={state.input.trim().length > 0}
                  disabled={isDisabled}
                  pressedKey={pressedKey}
                  ready={!isWrong && state.input.length >= slotCap}
                  typeHint={t('connections.typeHint')}
                />
              )
            )}
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
