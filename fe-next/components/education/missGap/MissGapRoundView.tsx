/**
 * One homework round: a 4-choice tap or a tap-to-spell.
 *
 * Blooket's homework loop is four flat colour rectangles on a plain field. This
 * one keeps the "four fat tiles" muscle memory — that part is right — and adds
 * what it is missing: colour-coded neo tiles with hard shadows, a timer that is
 * a visible bar rather than a number, and a mascot that reacts on the spot.
 *
 * Feedback rules: the chosen tile turns lime (right) or pink (wrong), the right
 * answer is always revealed, and nothing moves until the student taps — no
 * fullscreen opacity tween anywhere (pitfalls Class 5).
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { MissGapRound } from '@/lib/education/missGapQuiz';
import { MASCOT_IMAGES } from '@/components/ui/mascotData';

export type RoundOutcome = 'correct' | 'wrong';

export interface MissGapRoundViewProps {
  round: MissGapRound;
  /** Remaining seconds, owned by the game shell so one timer drives everything. */
  secondsLeft: number;
  /** Set once the round is answered; drives the reveal. */
  outcome: RoundOutcome | null;
  /** The label the student picked, so we can mark that exact tile. */
  pickedLabel: string | null;
  onAnswer: (correct: boolean, label: string) => void;
  onTapFeedback: () => void;
}

/**
 * Answer-tile fills. Black ink on every one of them: white on `neo-pink` is
 * 3.64:1 and on `neo-purple` 4.23:1, both under the 4.5:1 floor, while black
 * clears it on all four (5.8 / 5.0 / 16.8 / 17.5). Each fill also clears 3:1
 * against the navy surface on its own, so the tiles read as controls without
 * relying on the black border (which is only 1.23:1 on navy).
 */
const TILE_TONES = [
  'bg-neo-cyan text-neo-black border-neo-black',
  'bg-neo-pink text-neo-black border-neo-black',
  'bg-neo-purple text-neo-black border-neo-black',
  'bg-neo-lime text-neo-black border-neo-black',
];

/**
 * Spent / not-chosen states. A navy-light fill is 1.07:1 against navy — it
 * vanishes — so these keep a cream border to stay visibly a control, and the
 * ink sits at 70% (8.4:1) rather than the 25-45% that fell under AA.
 */
const MUTED_TILE = 'bg-neo-navy-light text-neo-cream border-neo-cream';

export function MissGapRoundView({
  round,
  secondsLeft,
  outcome,
  pickedLabel,
  onAnswer,
  onTapFeedback,
}: MissGapRoundViewProps) {
  const { t } = useLanguage();
  const [typed, setTyped] = useState<number[]>([]);
  // The letters so far also live in a ref. Two taps inside one task (a fast
  // thumb, a double-tap, an assistive device) would otherwise both read the
  // SAME render's `typed`, so the second letter saw an empty prefix and a
  // correctly spelled word was scored wrong. The ref is always current.
  const typedRef = useRef<number[]>([]);

  useEffect(() => {
    typedRef.current = [];
    setTyped([]);
  }, [round.id]);

  const target = round.word.toUpperCase();
  const spelled = typed.map((i) => round.tiles[i]).join('');
  const timePct = Math.max(0, Math.min(100, (secondsLeft / round.seconds) * 100));
  const locked = outcome !== null;

  const prompt = useMemo(() => {
    if (round.kind === 'meaning') return t('education.homework.promptMeaning');
    if (round.kind === 'spelling') return t('education.homework.promptSpelling');
    return t('education.homework.promptSpell');
  }, [round.kind, t]);

  const pickTile = (index: number) => {
    if (locked) return;
    onTapFeedback();
    const next = [...typedRef.current, index];
    typedRef.current = next;
    setTyped(next);
    const attempt = next.map((i) => round.tiles[i]).join('');
    if (attempt === target) {
      onAnswer(true, round.word);
      return;
    }
    if (!target.startsWith(attempt)) {
      onAnswer(false, attempt);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* Timer bar — a shrinking strip reads faster than a number on a phone. */}
      <div
        className="h-3 w-full rounded-neo border-[2px] border-neo-cream bg-neo-navy-light overflow-hidden shrink-0"
        role="timer"
        aria-label={t('education.homework.timeLeft', { seconds: Math.ceil(secondsLeft) })}
      >
        <div
          data-testid="miss-gap-timer-fill"
          className={cn(
            'h-full transition-[width] duration-300 ease-linear',
            timePct > 30 ? 'bg-neo-lime' : 'bg-neo-orange',
          )}
          style={{ width: `${timePct}%` }}
        />
      </div>

      {/* Phone: prompt, then answers, then the mascot row — one column, one
          scroller. From `lg` the same two blocks sit side by side, because at
          1440 the single column left ~280px of empty navy between the word and
          the tiles with half the screen unused. Nothing about the phone layout
          changes; only the desktop breakpoint adds a grid. */}
      <div
        data-testid="miss-gap-round-body"
        className="flex flex-col flex-1 min-h-0 gap-3 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-stretch"
      >
      {/* Centred inside its own half at lg; the answers column next to it
          stretches, so neither side floats in the middle of a 900px screen. */}
      <div className="shrink-0 lg:flex lg:flex-col lg:justify-center">
        <p
          data-testid="miss-gap-round-prompt"
          className="text-neo-cyan font-bold text-xs uppercase tracking-widest"
        >
          {prompt}
        </p>
        {round.kind === 'meaning' || round.kind === 'spell' ? (
          <p
            data-testid="miss-gap-round-word"
            className="text-neo-white font-neo-display font-bold text-3xl lg:text-5xl leading-tight break-words"
          >
            {/* A spell round hides the word ONLY when a definition is there to
                go on. With no definition there is nothing to recall from, so
                masking it would leave the student guessing letters blind. */}
            {round.kind === 'spell' && round.hint && !locked
              ? target.replace(/./g, '•')
              : round.word}
          </p>
        ) : (
          <p className="text-neo-cream font-neo-body text-sm">
            {t('education.homework.promptSpellingHint')}
          </p>
        )}
        {round.kind === 'spell' && round.hint ? (
          <p className="text-neo-cream font-neo-body text-sm mt-1">{round.hint}</p>
        ) : null}
      </div>

      {/* The one scrolling region. Answers sit centred so a four-tile round on
          a tall phone is thumb-reachable instead of pinned to the top. */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center">
        {round.kind === 'spell' ? (
          // Claims the leftover height the same way the answer stack does, and
          // splits it: slots stay up under the word, the letter tiles drop to
          // the bottom where the thumb already is. Centring both (the old
          // `flex flex-col gap-3`) left ~230px of bare navy above and below on
          // a 390x844 phone while the meaning round filled the same screen.
          <div
            data-testid="miss-gap-spell-block"
            className="flex flex-col flex-1 min-h-0 justify-between gap-4 py-1"
          >
            <div
              data-testid="miss-gap-spell-slots"
              className="flex flex-wrap gap-1.5 justify-center min-h-[3rem]"
            >
              {target.split('').map((letter, i) => (
                <span
                  key={`${round.id}-slot-${i}`}
                  className={cn(
                    'w-10 h-12 grid place-items-center rounded-neo border-[3px]',
                    'font-neo-display font-bold text-2xl',
                    locked && outcome === 'correct'
                      ? 'bg-neo-lime text-neo-black border-neo-black'
                      : spelled[i]
                        ? 'bg-neo-cyan text-neo-black border-neo-black'
                        : 'bg-neo-navy text-neo-cream border-neo-cream',
                  )}
                >
                  {locked ? letter : (spelled[i] ?? '')}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {round.tiles.map((letter, index) => (
                <button
                  key={`${round.id}-tile-${index}`}
                  type="button"
                  data-testid="miss-gap-letter-tile"
                  disabled={locked || typed.includes(index)}
                  onClick={() => pickTile(index)}
                  className={cn(
                    'w-14 h-14 rounded-neo border-[3px] shadow-hard-sm',
                    'font-neo-display font-bold text-2xl transition-transform',
                    'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                    typed.includes(index)
                      ? MUTED_TILE
                      : 'bg-neo-cream text-neo-black border-neo-black',
                  )}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Flex column that CLAIMS the leftover height, not a content-sized
          // grid. Centred intrinsic tiles left ~200px of empty navy above the
          // first answer and ~180px under the last at 390x844; sharing the
          // space puts four fat, thumb-sized tiles on the screen instead.
          // `min-h` on the item is the floor that keeps a one-line answer
          // tappable when the space runs short.
          <ul className="flex flex-col gap-2.5 flex-1 min-h-0">
            {round.choices.map((choice, index) => {
              const isPicked = pickedLabel === choice.label;
              const reveal = locked && choice.correct;
              return (
                <li key={choice.id} className="flex flex-1 min-h-[3.25rem]">
                  <button
                    type="button"
                    data-testid="miss-gap-choice"
                    data-correct={choice.correct ? 'true' : 'false'}
                    disabled={locked}
                    onClick={() => {
                      onTapFeedback();
                      onAnswer(choice.correct, choice.label);
                    }}
                    className={cn(
                      'w-full h-full flex items-center text-start px-4 py-3 rounded-neo border-[3px]',
                      'font-neo-display font-bold text-base leading-snug shadow-hard-sm',
                      'transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                      reveal
                        ? 'bg-neo-lime text-neo-black border-neo-black'
                        : isPicked
                          ? 'bg-neo-pink text-neo-black border-neo-black'
                          : locked
                            ? MUTED_TILE
                            : TILE_TONES[index % TILE_TONES.length],
                    )}
                  >
                    {choice.label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      </div>

      {/* Mascot — present for the whole round, not only the reveal. Same box
          either way, so the reveal never moves the layout under a thumb. */}
      <div className="h-16 shrink-0 flex items-center gap-2" aria-live="polite">
        <Image
          src={
            !locked
              ? MASCOT_IMAGES.explorerNobg
              : outcome === 'correct'
                ? MASCOT_IMAGES.powerup
                : MASCOT_IMAGES.cryingNobg
          }
          alt=""
          width={56}
          height={56}
          unoptimized
          aria-hidden
          className="w-14 h-14 shrink-0"
        />
        <p
          data-testid="miss-gap-round-feedback"
          className={cn(
            'font-neo-display font-bold',
            locked ? 'text-xl' : 'text-base',
            !locked
              ? 'text-neo-cream'
              : outcome === 'correct'
                ? 'text-neo-lime'
                : 'text-neo-cream',
          )}
        >
          {!locked
            ? t('education.homework.cheer')
            : outcome === 'correct'
              ? t('education.homework.correct')
              : t('education.homework.almost', { word: round.word })}
        </p>
      </div>
    </div>
  );
}
