/**
 * Team Tiles stage: team picker + board + reveal verdict overlay.
 */
'use client';

import { Check, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TEAM_TILES_TEAM_COUNTS,
  type TeamTilesGameState,
  type TeamTilesTeamCount,
} from '@/lib/education/teamTilesUnpluggedGame';
import { wordVw } from '@/components/education/unplugged/UnpluggedStage';
import { TeamTilesBoard } from './TeamTilesBoard';

const BTN =
  'flex items-center justify-center gap-2 font-neo-display font-bold rounded-neo shadow-hard active:shadow-hard-pressed active:translate-y-[1px]';
const BTN_SOLID = 'border-[3px] border-neo-black';

const TEAM_CHIP = [
  'bg-neo-pink text-neo-black',
  'bg-neo-cyan text-neo-black',
  'bg-neo-lime text-neo-black',
  'bg-neo-yellow text-neo-black',
] as const;

export interface TeamTilesStageLabels {
  chooseTeams: string;
  teamLabel: (n: number) => string;
  activeTeam: string;
  flipHint: string;
  faceDown: string;
  gotIt: string;
  notYet: string;
  letters: string;
}

export interface TeamTilesStageProps {
  state: TeamTilesGameState;
  word: string;
  reducedMotion: boolean;
  labels: TeamTilesStageLabels;
  onChooseTeams: (n: TeamTilesTeamCount) => void;
  onFlip: (tileId: number) => void;
  onJudge: (got: boolean) => void;
}

export function TeamTilesStage({
  state,
  word,
  reducedMotion,
  labels,
  onChooseTeams,
  onFlip,
  onJudge,
}: TeamTilesStageProps) {
  const revealed = state.phase === 'revealed';
  const canPickTeams = state.phase === 'board' && state.judged === 0 && state.activeTileId === null;
  const fontSize = `clamp(2rem, ${wordVw(word.length).toFixed(1)}vw, 12rem)`;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 sm:gap-3">
      <div
        data-testid="team-tiles-scoreboard"
        className="shrink-0 flex flex-wrap items-center justify-center gap-2"
      >
        {state.teamScores.map((score, i) => (
          <div
            key={i}
            data-testid={`team-tiles-team-${i}`}
            data-active={String(i === state.activeTeam && !revealed)}
            className={cn(
              'min-w-[4.5rem] px-3 py-1.5 rounded-neo border-[3px] border-neo-black shadow-hard-sm text-center',
              TEAM_CHIP[i % TEAM_CHIP.length],
              i === state.activeTeam && !revealed && 'ring-4 ring-neo-cream',
            )}
          >
            <span className="block font-neo-body font-bold uppercase tracking-wider text-[clamp(0.5rem,0.9vw,0.75rem)]">
              {labels.teamLabel(i + 1)}
            </span>
            <span className="block font-neo-display font-bold tabular-nums text-[clamp(1rem,2.5vw,1.75rem)] leading-none">
              {score}
            </span>
          </div>
        ))}
      </div>

      {canPickTeams ? (
        <div
          data-testid="team-tiles-team-picker"
          className="shrink-0 flex flex-wrap items-center justify-center gap-2"
        >
          <span className="flex items-center gap-1 font-neo-body font-bold text-neo-cream text-[clamp(0.65rem,1.2vw,0.95rem)]">
            <Users className="w-4 h-4" aria-hidden />
            {labels.chooseTeams}
          </span>
          {TEAM_TILES_TEAM_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              data-testid={`team-tiles-count-${n}`}
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
              {n}
            </button>
          ))}
        </div>
      ) : (
        <p
          data-testid="team-tiles-active-hint"
          className="shrink-0 text-center font-neo-body font-bold text-neo-cyan text-[clamp(0.7rem,1.3vw,1.1rem)]"
        >
          {revealed
            ? labels.letters
            : `${labels.activeTeam} · ${labels.flipHint}`}
        </p>
      )}

      {revealed ? (
        <div
          data-testid="team-tiles-reveal"
          className={cn(
            'flex-1 min-h-0 flex flex-col items-center justify-center gap-3 sm:gap-4',
            'rounded-neo border-[3px] border-neo-cream bg-neo-navy-light shadow-hard px-3 py-4',
          )}
        >
          <p
            data-testid="team-tiles-word"
            className="font-neo-display font-bold text-neo-white text-center leading-none max-w-full break-words"
            style={{ fontSize }}
          >
            {word}
          </p>
          <div className="w-full max-w-xl flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              type="button"
              data-testid="team-tiles-got-it"
              onClick={() => onJudge(true)}
              className={cn(
                BTN,
                BTN_SOLID,
                'flex-1 py-3 sm:py-4 bg-neo-lime text-neo-black text-[clamp(0.95rem,1.8vw,1.4rem)]',
              )}
            >
              <Check className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden />
              {labels.gotIt}
            </button>
            <button
              type="button"
              data-testid="team-tiles-not-yet"
              onClick={() => onJudge(false)}
              className={cn(
                BTN,
                'flex-1 py-3 sm:py-4 border-[3px] border-neo-cream bg-neo-navy text-neo-cream text-[clamp(0.95rem,1.8vw,1.4rem)]',
              )}
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden />
              {labels.notYet}
            </button>
          </div>
        </div>
      ) : (
        <TeamTilesBoard
          tiles={state.tiles}
          activeTileId={state.activeTileId}
          reducedMotion={reducedMotion}
          onFlip={onFlip}
          faceDownLabel={labels.faceDown}
        />
      )}
    </div>
  );
}
