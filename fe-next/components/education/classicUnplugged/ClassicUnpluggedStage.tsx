/**
 * Classic Unplugged stage: class/team picker + masked prompt → reveal → submit.
 */
'use client';

import { Check, Eye, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CLASSIC_UNPLUGGED_TEAM_COUNTS,
  isClassMode,
  type ClassicUnpluggedGameState,
  type ClassicUnpluggedTeamCount,
} from '@/lib/education/classicUnpluggedGame';
import { wordVw } from '@/components/education/unplugged/UnpluggedStage';

const BTN =
  'flex items-center justify-center gap-2 font-neo-display font-bold rounded-neo shadow-hard active:shadow-hard-pressed active:translate-y-[1px]';
const BTN_SOLID = 'border-[3px] border-neo-black';

const TEAM_CHIP = [
  'bg-neo-pink text-neo-black',
  'bg-neo-cyan text-neo-black',
  'bg-neo-lime text-neo-black',
  'bg-neo-yellow text-neo-black',
] as const;

export interface ClassicUnpluggedStageLabels {
  chooseMode: string;
  classMode: string;
  teamLabel: (n: number) => string;
  activeTeam: string;
  discussHint: string;
  reveal: string;
  submitGotIt: string;
  submitNotYet: string;
  letters: string;
}

export interface ClassicUnpluggedStageProps {
  state: ClassicUnpluggedGameState;
  word: string;
  reducedMotion: boolean;
  labels: ClassicUnpluggedStageLabels;
  onChooseTeams: (n: ClassicUnpluggedTeamCount) => void;
  onReveal: () => void;
  onSubmit: (got: boolean) => void;
}

export function ClassicUnpluggedStage({
  state,
  word,
  reducedMotion,
  labels,
  onChooseTeams,
  onReveal,
  onSubmit,
}: ClassicUnpluggedStageProps) {
  const revealed = state.phase === 'revealed';
  const canPick = state.phase === 'prompt' && state.judged === 0;
  const fontSize = `clamp(2rem, ${wordVw(word.length).toFixed(1)}vw, 15rem)`;
  const classMode = isClassMode(state);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 sm:gap-3">
      <div
        data-testid="classic-unplugged-scoreboard"
        className="shrink-0 flex flex-wrap items-center justify-center gap-2"
      >
        {state.teamScores.map((score, i) => (
          <div
            key={i}
            data-testid={`classic-unplugged-team-${i}`}
            data-active={String(i === state.activeTeam && !revealed)}
            className={cn(
              'min-w-[4.5rem] px-3 py-1.5 rounded-neo border-[3px] border-neo-black shadow-hard-sm text-center',
              TEAM_CHIP[i % TEAM_CHIP.length],
              i === state.activeTeam && !revealed && 'ring-4 ring-neo-cream',
            )}
          >
            <span className="block font-neo-body font-bold uppercase tracking-wider text-[clamp(0.5rem,0.9vw,0.75rem)]">
              {classMode ? labels.classMode : labels.teamLabel(i + 1)}
            </span>
            <span className="block font-neo-display font-bold tabular-nums text-[clamp(1rem,2.5vw,1.75rem)] leading-none">
              {score}
            </span>
          </div>
        ))}
      </div>

      {canPick ? (
        <div
          data-testid="classic-unplugged-mode-picker"
          className="shrink-0 flex flex-wrap items-center justify-center gap-2"
        >
          <span className="flex items-center gap-1 font-neo-body font-bold text-neo-cream text-[clamp(0.65rem,1.2vw,0.95rem)]">
            <Users className="w-4 h-4" aria-hidden />
            {labels.chooseMode}
          </span>
          {CLASSIC_UNPLUGGED_TEAM_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              data-testid={`classic-unplugged-count-${n}`}
              aria-pressed={state.teamCount === n}
              onClick={() => onChooseTeams(n)}
              className={cn(
                BTN,
                BTN_SOLID,
                'px-3 py-1.5 text-sm',
                state.teamCount === n
                  ? 'bg-neo-lime text-neo-black'
                  : 'bg-neo-navy-light text-neo-cream border-neo-cream',
              )}
            >
              {n === 1 ? labels.classMode : n}
            </button>
          ))}
        </div>
      ) : (
        <p
          data-testid="classic-unplugged-active-hint"
          className="shrink-0 text-center font-neo-body font-bold text-neo-cyan text-[clamp(0.7rem,1.3vw,1.1rem)]"
        >
          {revealed
            ? labels.letters
            : classMode
              ? labels.discussHint
              : `${labels.activeTeam} · ${labels.discussHint}`}
        </p>
      )}

      <div
        data-testid="classic-unplugged-word"
        data-revealed={String(revealed)}
        className={cn(
          'flex-1 min-h-0 flex flex-col items-center justify-center gap-3 sm:gap-4',
          'rounded-neo border-[3px] border-neo-cream bg-neo-navy-light shadow-hard px-3 py-4',
          !reducedMotion && revealed && 'animate-in fade-in zoom-in-95 duration-200',
        )}
      >
        {revealed ? (
          <p
            data-testid="classic-unplugged-word-text"
            className="font-neo-display font-bold text-neo-lime text-center leading-none max-w-full break-words"
            style={{ fontSize }}
          >
            {word}
          </p>
        ) : (
          <span
            aria-hidden
            data-testid="classic-unplugged-word-mask"
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

        {revealed ? (
          <div className="w-full max-w-xl flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              type="button"
              data-testid="classic-unplugged-submit-got-it"
              onClick={() => onSubmit(true)}
              className={cn(
                BTN,
                BTN_SOLID,
                'flex-1 py-3 sm:py-4 bg-neo-lime text-neo-black text-[clamp(0.95rem,1.8vw,1.4rem)]',
              )}
            >
              <Check className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden />
              {labels.submitGotIt}
            </button>
            <button
              type="button"
              data-testid="classic-unplugged-submit-not-yet"
              onClick={() => onSubmit(false)}
              className={cn(
                BTN,
                'flex-1 py-3 sm:py-4 border-[3px] border-neo-cream bg-neo-navy text-neo-cream text-[clamp(0.95rem,1.8vw,1.4rem)]',
              )}
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden />
              {labels.submitNotYet}
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="classic-unplugged-reveal"
            onClick={onReveal}
            className={cn(
              BTN,
              BTN_SOLID,
              'w-full max-w-xl py-3 sm:py-5 bg-neo-cyan text-neo-black text-[clamp(1.1rem,2.6vw,2rem)] uppercase',
            )}
          >
            <Eye className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden />
            {labels.reveal}
          </button>
        )}
      </div>
    </div>
  );
}
