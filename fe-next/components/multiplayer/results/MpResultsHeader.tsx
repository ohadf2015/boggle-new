'use client';

import { Trophy, Volume2, VolumeX } from 'lucide-react';
import { useMasterMute } from '@/hooks/useMasterMute';
import { useRegisterHeaderAudioControl } from '@/contexts/NavigationContext';
import { MpHudBar } from '../shell/MpHudBar';
import { MpBackButton } from '../shell/MpBackButton';
import { getModePresentation } from '@/lib/multiplayer/modePresentation';
import { classroomRoundModeMeta } from '../round/roundModes';
import { cn } from '@/lib/utils';
import { MODE_TONE } from './MpNextModeCard';
import fx from './mpResults.module.css';

type TFn = (key: string, params?: Record<string, string | number>) => string;

export interface MpResultsHeaderProps {
  /** null until the TIME! beat is over (the branch is read only then). */
  branch: 'final' | 'intermission' | null;
  round: number;
  totalRounds: number;
  playedMode: string | undefined;
  onLeave: () => void;
  t: TFn;
}

/**
 * [leave] [TIME! → "Round 2/5 done" · mode | "Final results"] [sound].
 * The sound toggle lives in the bar (it registers as the header audio control,
 * so the global mute FAB stands down instead of landing on this bar).
 * The exit sits in the MpHudBar START slot — the same edge as in-game, so it
 * never jumps sides on the game → results transition.
 */
export function MpResultsHeader({ branch, round, totalRounds, playedMode, onLeave, t }: MpResultsHeaderProps) {
  const mode = getModePresentation(playedMode);
  const classroomOnly = playedMode === 'wordcraft' || playedMode === 'vocab-quiz' ? classroomRoundModeMeta(playedMode) : null;
  const tone = MODE_TONE[classroomOnly?.color ?? mode.color];
  const modeLabelKey = classroomOnly?.nameKey ?? mode.labelKey;
  return (
    <MpHudBar
      className="border-b-[3px] border-neo-black bg-neo-navy"
      start={<MpBackButton kind="leave" onPress={onLeave} />}
      center={
        branch === null ? (
          <span
            data-testid="mp-results-time"
            className={cn('font-neo-display font-bold uppercase text-neo-lime text-[calc(30px*var(--mp-u,1))] leading-none [text-shadow:3px_3px_0_#000]', fx.timeSlam)}
          >
            {t('mpUi.results.time')}
          </span>
        ) : (
          <span className={cn('flex flex-col items-center min-w-0 leading-tight', fx.titleDrop)}>
            <span className="flex items-center gap-1.5 font-neo-display font-bold uppercase text-neo-white text-[calc(18px*var(--mp-u,1))] whitespace-nowrap">
              {branch === 'final' && <Trophy aria-hidden="true" className="w-[calc(18px*var(--mp-u,1))] h-[calc(18px*var(--mp-u,1))] text-neo-yellow" />}
              {branch === 'final' ? t('mpUi.results.finalTitle') : t('mpUi.results.roundDone', { round, total: totalRounds })}
            </span>
            <span className="flex items-center gap-1.5">
              {playedMode && <span className={cn('text-[calc(11px*var(--mp-u,1))] font-bold uppercase tracking-wider', tone.text)}>{t(modeLabelKey)}</span>}
              {branch === 'intermission' && totalRounds > 1 && (
                <span aria-hidden="true" className="flex items-center gap-0.5">
                  {Array.from({ length: totalRounds }, (_, i) => (
                    <span key={i} className={cn('block w-[calc(6px*var(--mp-u,1))] h-[calc(6px*var(--mp-u,1))] rounded-full border border-neo-black', i < round ? 'bg-neo-lime' : 'bg-neo-white/20')} />
                  ))}
                </span>
              )}
            </span>
          </span>
        )
      }
      end={<MpResultsMute />}
    />
  );
}

function MpResultsMute() {
  useRegisterHeaderAudioControl();
  const { allMuted, toggle, label, title } = useMasterMute();
  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="mp-results-mute"
      aria-label={label}
      aria-pressed={!allMuted}
      title={title}
      className="inline-flex items-center justify-center w-11 h-11 tv:w-16 tv:h-16 shrink-0 rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-white shadow-hard-sm"
    >
      {allMuted ? <VolumeX aria-hidden="true" className="w-5 h-5" /> : <Volume2 aria-hidden="true" className="w-5 h-5" />}
    </button>
  );
}
