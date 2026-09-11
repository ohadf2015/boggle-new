/**
 * The projector stage: masked word → countdown → reveal → class verdict.
 *
 * Type size is set inline because Tailwind v4 only emits arbitrary values that
 * appear as a LITERAL class string, and this size is computed per word. The
 * formula keeps the rendered line at roughly constant width, so a 6-letter word
 * lands at 13vw and a 12-letter word still clears the 10vw back-row floor.
 */
'use client';

import { Check, Eye, Hand, Minus, Play, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UNPLUGGED_PRESETS_MS, type UnpluggedGameState } from '@/lib/education/unpluggedReteachGame';
import { UnpluggedRingTimer } from './UnpluggedRingTimer';

/**
 * Constant-width heuristic, floored at the 10vw back-row legibility bar.
 *
 * The floor is 10, NOT the natural 120/length taper: at 13+ letters the taper
 * drops under 10vw and the word stops being readable from the back of the room.
 * Past that point the line is allowed to wrap instead (`max-w-full break-words`)
 * — two readable lines beat one unreadable one.
 */
export function wordVw(length: number): number {
  if (length <= 0) return 13;
  return Math.max(10, Math.min(13, 120 / length));
}


export interface UnpluggedStageLabels {
  secondsUnit: string;
  timerLabel: string;
  letters: string;
  start: string;
  revealNow: string;
  gotIt: string;
  notYet: string;
  hands: string;
  handsMore: string;
  handsFewer: string;
  writeNow: string;
  chooseTime: string;
}

export interface UnpluggedStageProps {
  state: UnpluggedGameState;
  word: string;
  secondsLeft: number;
  remainingMs: number;
  urgent: boolean;
  reducedMotion: boolean;
  labels: UnpluggedStageLabels;
  onChooseDuration: (ms: number) => void;
  onStart: () => void;
  onReveal: () => void;
  onJudge: (got: boolean) => void;
  onAdjustHands: (delta: number) => void;
}

/**
 * Border width is `border-[3px]`, never the `border-neo` utility: `border-neo`
 * and `border-neo-black` land in the SAME twMerge group, so cn() drops the
 * width and Tailwind's preflight (`border-width: 0`) leaves the control with no
 * border at all. Each caller supplies its own `border-[3px] border-<colour>`,
 * which keeps the width and lets a colour override win cleanly.
 */
const BTN =
  'flex items-center justify-center gap-2 font-neo-display font-bold rounded-neo shadow-hard active:shadow-hard-pressed active:translate-y-[1px] transition-shadow';

/** Primary/affirmative: solid neo fill, black edge. */
const BTN_SOLID = 'border-[3px] border-neo-black';
/**
 * Secondary on the navy shell: a black border scores 1.23:1 on navy and reads
 * as no control at all (DESIGN-ADDENDUM), so the edge is cream at >=3:1 and the
 * fill still differs from the surrounding surface.
 */
const BTN_OUTLINE = 'border-[3px] border-neo-cream bg-neo-navy-light text-neo-cream';

export function UnpluggedStage({
  state,
  word,
  secondsLeft,
  remainingMs,
  urgent,
  reducedMotion,
  labels,
  onChooseDuration,
  onStart,
  onReveal,
  onJudge,
  onAdjustHands,
}: UnpluggedStageProps) {
  const revealed = state.phase === 'revealed';
  const running = state.phase === 'running';
  const fontSize = `clamp(2rem, ${wordVw(word.length).toFixed(1)}vw, 15rem)`;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 sm:gap-3">
      <div
        data-testid="unplugged-reteach-word"
        data-revealed={String(revealed)}
        className={cn(
          'flex-1 min-h-0 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-8 px-3 sm:px-6 py-3',
          'rounded-neo border-[3px] border-neo-black bg-neo-navy-light shadow-hard',
        )}
      >
        <UnpluggedRingTimer
          progress={state.durationMs > 0 ? remainingMs / state.durationMs : 0}
          secondsLeft={secondsLeft}
          urgent={urgent}
          running={running}
          spent={revealed}
          label={labels.timerLabel}
          reducedMotion={reducedMotion}
          className="w-[26vw] sm:w-[18vw] max-w-[220px] min-w-[72px]"
        />

        <div className="min-w-0 w-full sm:flex-1 flex flex-col items-center justify-center text-center">
          {revealed ? (
            <span
              className="font-neo-display font-bold text-neo-lime leading-none tracking-tight max-w-full break-words"
              style={{ fontSize }}
            >
              {word}
            </span>
          ) : (
            // Blanks are sized in `em` off the SAME font-size the revealed word
            // uses, so the mask occupies exactly the width the word will — it
            // can never wrap where the word fits, at any viewport.
            <span
              aria-hidden
              data-testid="unplugged-word-mask"
              data-letters={word.length}
              className="flex items-center justify-center gap-[0.08em] h-[0.9em] max-w-full"
              style={{ fontSize }}
            >
              {Array.from({ length: Math.max(1, word.length) }, (_, i) => (
                <span
                  key={i}
                  className="w-[0.55em] h-[0.1em] min-h-[3px] rounded-full bg-neo-white/30 shrink-0"
                />
              ))}
            </span>
          )}
          <span
            className={cn(
              'mt-3 sm:mt-6 font-neo-display font-bold uppercase tracking-widest leading-tight',
              'text-[clamp(0.8rem,1.8vw,1.7rem)]',
              running ? 'text-neo-pink' : revealed ? 'text-neo-white/60' : 'text-neo-cyan',
            )}
          >
            {revealed ? labels.letters : running ? labels.writeNow : labels.chooseTime}
          </span>
        </div>
      </div>

      <div data-testid="unplugged-controls" data-phase={state.phase} className="shrink-0">
        {state.phase === 'ready' ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <div
              role="group"
              aria-label={labels.chooseTime}
              className="flex shrink-0 gap-2 justify-center"
            >
              {UNPLUGGED_PRESETS_MS.map((ms) => {
                const secs = ms / 1000;
                const active = state.durationMs === ms;
                return (
                  <button
                    key={ms}
                    type="button"
                    data-testid={`unplugged-preset-${secs}`}
                    aria-pressed={active}
                    onClick={() => onChooseDuration(ms)}
                    className={cn(
                      BTN,
                      'px-3 sm:px-5 py-3 text-[clamp(0.9rem,1.5vw,1.3rem)]',
                      // Selected vs unselected differ by FILL (cyan vs navy-light),
                      // not by text colour alone.
                      active
                        ? cn(BTN_SOLID, 'bg-neo-cyan text-neo-black')
                        : cn(BTN_OUTLINE, 'shadow-hard-sm'),
                    )}
                  >
                    {secs}
                    {labels.secondsUnit}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              data-testid="unplugged-start"
              onClick={onStart}
              className={cn(
                BTN,
                BTN_SOLID,
                'flex-1 py-3 sm:py-5 bg-neo-lime text-neo-black text-[clamp(1.1rem,2.6vw,2.2rem)] uppercase',
              )}
            >
              <Play className="w-5 h-5 sm:w-8 sm:h-8" aria-hidden />
              {labels.start}
            </button>
          </div>
        ) : null}

        {running ? (
          <button
            type="button"
            data-testid="unplugged-reteach-reveal"
            onClick={onReveal}
            className={cn(
              BTN,
              BTN_SOLID,
              'w-full py-3 sm:py-5 bg-neo-pink text-neo-black text-[clamp(1.1rem,2.6vw,2.2rem)] uppercase',
            )}
          >
            <Eye className="w-5 h-5 sm:w-8 sm:h-8" aria-hidden />
            {labels.revealNow}
          </button>
        ) : null}

        {revealed ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex shrink-0 items-center gap-1 px-2 py-1 rounded-neo border-[3px] border-neo-black bg-neo-navy-light shadow-hard-sm">
              <Hand className="w-4 h-4 sm:w-5 sm:h-5 text-neo-cyan shrink-0" aria-hidden />
              <span className="sr-only">{labels.hands}</span>
              <button
                type="button"
                data-testid="unplugged-hands-down"
                aria-label={labels.handsFewer}
                onClick={() => onAdjustHands(-1)}
                className="grid place-items-center w-8 h-8 sm:w-10 sm:h-10 rounded-neo border-[3px] border-neo-cream bg-neo-navy text-neo-cream"
              >
                <Minus className="w-4 h-4" aria-hidden />
              </button>
              <span
                data-testid="unplugged-hands-count"
                className="w-8 text-center font-neo-display font-bold text-neo-white tabular-nums text-[clamp(1rem,1.8vw,1.5rem)]"
              >
                {state.hands}
              </span>
              <button
                type="button"
                data-testid="unplugged-hands-up"
                aria-label={labels.handsMore}
                onClick={() => onAdjustHands(1)}
                className="grid place-items-center w-8 h-8 sm:w-10 sm:h-10 rounded-neo border-[3px] border-neo-cream bg-neo-navy text-neo-cream"
              >
                <Plus className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <button
              type="button"
              data-testid="unplugged-not-yet"
              onClick={() => onJudge(false)}
              className={cn(
                BTN,
                BTN_OUTLINE,
                'flex-1 py-3 sm:py-5 text-[clamp(1rem,2.2vw,1.8rem)] uppercase',
              )}
            >
              <X className="w-5 h-5 sm:w-7 sm:h-7" aria-hidden />
              {labels.notYet}
            </button>
            <button
              type="button"
              data-testid="unplugged-got-it"
              onClick={() => onJudge(true)}
              className={cn(
                BTN,
                BTN_SOLID,
                'flex-[2] py-3 sm:py-5 bg-neo-lime text-neo-black text-[clamp(1.1rem,2.6vw,2.2rem)] uppercase',
              )}
            >
              <Check className="w-5 h-5 sm:w-8 sm:h-8" aria-hidden />
              {labels.gotIt}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
