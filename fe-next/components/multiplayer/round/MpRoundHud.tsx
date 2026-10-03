'use client';

import { memo } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useLanguage } from '@/contexts/LanguageContext';
import { MpBackButton, MpHudBar, MpRankChip, MpScoreChip, MpTimer, type MpScoreGain, type MpTimerColor } from '../shell';
import { MpComboMeter } from './MpComboMeter';
import { MpRoundMute } from './MpRoundMute';
import { QuietBoundary } from './QuietBoundary';
import { useClassroomPressure } from '@/hooks/gameState/classroomPressureStore';
import {
  isLeaderboardHidden,
  isStudentTimerHidden,
  shouldSuppressTimerUrgency,
} from '@/shared/utils/classroomPressure';

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
  const { t } = useLanguage();

  // The teacher's pressure dials on the desktop shell (null outside a
  // classroom room): hidden leaderboard swaps rank for the reveal beat, top3
  // hides a sub-podium rank, timer off drops the clock, gentle calms it.
  const pressure = useClassroomPressure();
  const timerHidden = pressure ? isStudentTimerHidden(pressure) : false;
  const timerGentle = pressure ? shouldSuppressTimerUrgency(pressure) : false;
  const rankHidden = pressure ? isLeaderboardHidden(pressure) : false;
  const rankOffPodium = pressure?.leaderboard === 'top3' && rank > 3;

  return (
    <MpHudBar
      // Phone: the end group (combo · score · mute) is wider than the start
      // group, so a symmetric 1fr|auto|1fr grid pushed it into the clock.
      // auto|1fr|auto keeps every group whole; the timer centres in the middle.
      className="px-2 lg:px-0 grid-cols-[auto_minmax(0,1fr)_auto]"
      start={
        <>
          <MpBackButton kind="leave" onPress={onExit} />
          {rankHidden ? (
            <span
              data-testid="mp-rank-reveal-note"
              className="text-xs font-neo-body text-neo-cream/80"
            >
              {t('education.classroomGame.pressure.revealAtEnd')}
            </span>
          ) : (
            !rankOffPodium && (
              /* "#2/4" is a number, not prose: keep it LTR inside RTL layouts. */
              <span dir="ltr" className="inline-flex">
                <MpRankChip
                  rank={rank}
                  total={total}
                  flipKey={rankFlipKey}
                  // Desktop/TV: as tall as the score chip — the rank is the race.
                  className="lg:h-[calc(56px*var(--mp-u,1))] lg:px-3 lg:items-center lg:[&>[data-testid=mp-rank-value]]:text-3xl lg:[&>span:last-child]:text-base"
                />
              </span>
            )
          )}
        </>
      }
      center={
        !timerHidden && (
          <MpTimer
            remainingSec={remainingTime}
            totalSec={Math.max(totalTime, 1)}
            size={timerSize}
            colorFamily={timerColor}
            suppressUrgency={timerGentle}
            // One clock: the ring's own inner label duplicates the big m:ss digits.
            className="[&_svg~div]:hidden!"
          />
        )
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
