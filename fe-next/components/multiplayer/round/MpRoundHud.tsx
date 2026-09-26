'use client';

import { memo } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MpBackButton, MpHudBar, MpRankChip, MpScoreChip, MpTimer, type MpScoreGain, type MpTimerColor } from '../shell';
import { MpComboMeter } from './MpComboMeter';
import { MpRoundMute } from './MpRoundMute';
import { QuietBoundary } from './QuietBoundary';

export interface MpRoundHudProps {
  remainingTime: number;
  totalTime: number;
  score: number;
  gain: MpScoreGain | null;
  rank: number;
  total: number;
  rankFlipKey?: string;
  comboLevel: number;
  timerColor: MpTimerColor;
  onExit: () => void;
}

/**
 * The single in-round top bar: [exit · rank] [timer + m:ss] [combo · score · mute].
 * Structure is CSS; only the ring/chip SIZE tier reads a media query — the
 * round mounts behind the solid countdown, so it has resolved long before GO.
 */
function MpRoundHudImpl({ remainingTime, totalTime, score, gain, rank, total, rankFlipKey, comboLevel, timerColor, onExit }: MpRoundHudProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTv = useMediaQuery('(min-width: 1800px) and (min-height: 1000px)');
  const timerSize = isTv ? 'xl' : isDesktop ? 'lg' : 'md';
  return (
    <MpHudBar
      className="px-2 lg:px-0"
      start={
        <>
          <MpBackButton kind="leave" onPress={onExit} />
          <MpRankChip rank={rank} total={total} flipKey={rankFlipKey} />
        </>
      }
      center={
        <MpTimer
          remainingSec={remainingTime}
          totalSec={Math.max(totalTime, 1)}
          size={timerSize}
          colorFamily={timerColor}
          // One clock: the ring's own inner label duplicates the big m:ss digits.
          className="[&_svg~div]:hidden!"
        />
      }
      end={
        <>
          <MpComboMeter level={comboLevel} />
          <MpScoreChip value={score} gain={gain} size={isDesktop ? 'lg' : 'md'} />
          <QuietBoundary>
            <MpRoundMute />
          </QuietBoundary>
        </>
      }
    />
  );
}

export const MpRoundHud = memo(MpRoundHudImpl);
MpRoundHud.displayName = 'MpRoundHud';
