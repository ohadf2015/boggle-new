'use client';

import { getWavePassPct } from './utils/blastWaveTheme';
import { HelpCircle, Shield, Bomb, Zap, Sparkles, Clock, Heart, Target, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import ExitRoomButton from '@/components/ExitRoomButton';
import { formatTimeMMSS } from '@/shared/utils/timeFormatting';
import { computeTimerUrgency } from '@/lib/cosy/timerUrgency';
import { useSuppressTimerUrgency } from '@/contexts/AccessibilityContext';
import { BlastComboStreakBadge } from './BlastComboStreakBadge';
import BlastWalletHud from './BlastWalletHud';
import { BlastHudMuteButton } from '../v2/BlastHudMuteButton';
import { useRegisterHeaderAudioControl } from '@/contexts/NavigationContext';
import { BLAST_MAX_LIVES } from './utils/blastLives';
import type { ComboStreakState } from './hooks/useBlastComboStreak';
import { BlastHudDiamonds, comboTier, type BlastHudProgress } from '../progress/BlastHudProgress';
import { accentColor, getWaveTheme } from '../progress/waveTheme';
import type { BlastObjectiveProgress } from './types';
import { BlastObjectiveBanner } from './BlastObjectiveBanner';
import { useAnimatedScore } from './hud/useHudCounters';
import { BlastHudMoves } from './hud/BlastHudMoves';
import { BlastHudClearMeter } from './hud/BlastHudClearMeter';
import { BlastHudGoal } from './hud/BlastHudGoal';

/** Pre-game buff chip — shown in HUD top row when player claimed a rewarded-ad boost. */
type ActiveBuff = 'shield' | 'bomb' | 'combo2x';
const BUFF_META: Record<ActiveBuff, { Icon: typeof Shield; bg: string; label: string }> = {
  shield:  { Icon: Shield, bg: 'bg-neo-cyan',  label: 'blast.pregameBuff.shield' },
  bomb:    { Icon: Bomb,   bg: 'bg-neo-pink',  label: 'blast.pregameBuff.bomb' },
  combo2x: { Icon: Zap,    bg: 'bg-neo-lime',  label: 'blast.pregameBuff.combo2x' },
};

const NO_TEXT_SHADOW_STYLE = { textShadow: 'none' } as const;

/**
 * Compact countdown pill for the HUD top row (multiplayer only).
 *
 * MP Blast used to float a large CircularTimer in its own band below the HUD,
 * which crowded the board and read as a detached element. Since the wave chip
 * is hidden in MP, the top-row left slot is empty — so we dock the timer there
 * instead: balanced chrome, the board reclaims that vertical space, and the
 * countdown sits beside the rest of the stats where players already look.
 *
 * Urgency escalates the colour (cyan → yellow → red) and pulses when critical,
 * mirroring CircularTimer. Calm/Cosy mode suppresses the escalation.
 */
function BlastHUDTimer({
  remainingTime,
  totalTime,
  t,
}: {
  remainingTime: number;
  totalTime: number;
  t: (key: string, fallback?: string) => string | undefined;
}) {
  const suppressUrgency = useSuppressTimerUrgency();
  const { state } = computeTimerUrgency(remainingTime, suppressUrgency);
  const danger = state === 'veryLow' || state === 'critical';

  const colorClass =
    state === 'critical' || state === 'veryLow'
      ? 'border-neo-red/70 text-neo-red'
      : state === 'low'
        ? 'border-neo-yellow/70 text-neo-yellow'
        : 'border-neo-cyan/50 text-neo-cyan';

  return (
    <div
      data-testid="blast-mp-timer"
      data-urgency={state}
      role="timer"
      aria-label={`${t('blast.time') ?? 'Time'}: ${formatTimeMMSS(Math.max(0, Math.round(remainingTime)))}`}
      className={cn(
        'shrink-0 inline-flex items-center gap-1.5 rounded-lg border-2 bg-black/25 px-2 py-0.5',
        colorClass,
        danger && 'blast-heartbeat',
      )}
      style={NO_TEXT_SHADOW_STYLE}
      title={`${totalTime}s ${t('blast.time') ?? 'Time'}`}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />
      <div className="flex flex-col items-start leading-none">
        <span className="text-[8px] font-black uppercase tracking-[0.18em] opacity-70">
          {t('blast.time') ?? 'Time'}
        </span>
        <span className="text-sm font-black tabular-nums leading-tight">
          {formatTimeMMSS(Math.max(0, Math.round(remainingTime)))}
        </span>
      </div>
    </div>
  );
}

interface BlastHUDProps {
  score: number;
  wordsFoundCount: number;
  movesRemaining: number;
  totalMoves: number;
  waveNumber: number;
  /** Run-level lives left (3-lives model). Undefined hides the hearts (e.g. MP). */
  livesRemaining?: number;
  tilesCleared: number;
  totalTiles: number;
  onQuit: () => void;
  onShowHelp?: () => void;
  /** Combo streak state from useBlastComboStreak */
  comboStreak?: ComboStreakState;
  /** Ref for the SVG arc — driven at 60fps by useBlastComboStreak */
  comboStreakArcRef?: React.RefObject<SVGCircleElement | null>;
  /** Active rewarded-ad pre-game buff (null if none claimed). */
  activeBuff?: ActiveBuff | null;
  /** Whether the buff effect has been spent (e.g. shield revive used). Greys the chip. */
  buffConsumed?: boolean;
  /** DDA "Lucky Boost" — surfaces when 2+ consecutive failed words triggered
   *  the invisible spawn-rate boost. Sprint 1 visibility guard. */
  ddaBoostActive?: boolean;
  /** Optional hint button slot — rendered beside Help when present. Wave 6+ only. */
  hintSlot?: React.ReactNode;
  /** Whether this is multiplayer mode (timer-era, no waves). Hides wave chip in MP. */
  isMultiplayer?: boolean;
  /** MP countdown — seconds remaining. Rendered as a compact pill in the top row
   *  (the slot the wave chip would occupy in SP). Omitted in single-player. */
  remainingTime?: number | null;
  /** MP round length in seconds — drives the urgency calc + a11y label. */
  totalTime?: number;
  /** True when this HUD is the center canvas of the desktop 3-column shell.
   *  The shell's left-rail badge already renders the (server-synced) countdown,
   *  so the HUD must NOT render its own — two timers drifted apart otherwise. */
  isDesktopCanvas?: boolean;
  /** In-run coins balance (SP only) */
  coins?: number;
  /** SP run context — ribbon, run diamonds, target to beat. */
  progress?: BlastHudProgress;
  waveDiamonds?: number;
  /** Wave objectives; side goals render inside the goal card. */
  objectives?: BlastObjectiveProgress[];
  /** Active wave modifier chip; docks in the goal card's header row. */
  modifierSlot?: React.ReactNode;
  t: (key: string, fallback?: string) => string | undefined;
}

/**
 * BlastHUD — compact top-bar showing score, moves, wave, and tile progress.
 * Layout-stable: every show/hide chip has a reserved slot so the surrounding
 * columns never reflow. The progress bar carries an always-visible 90% target
 * marker and an explicit "current / 90%" label so the wave goal is unmissable.
 */
export function BlastHUD({
  score,
  wordsFoundCount,
  movesRemaining,
  totalMoves,
  waveNumber,
  livesRemaining,
  tilesCleared,
  totalTiles,
  onQuit,
  onShowHelp,
  comboStreak,
  comboStreakArcRef,
  activeBuff = null,
  buffConsumed = false,
  ddaBoostActive = false,
  hintSlot,
  isMultiplayer = false,
  remainingTime = null,
  totalTime,
  isDesktopCanvas = false,
  coins = 0,
  progress,
  waveDiamonds = 0,
  objectives,
  modifierSlot,
  t,
}: BlastHUDProps) {
  const ownMute = !isMultiplayer && !isDesktopCanvas;
  useRegisterHeaderAudioControl(ownMute);
  const showTimer =
    !isDesktopCanvas &&
    isMultiplayer && remainingTime !== null && remainingTime !== undefined && (totalTime ?? 0) > 0;
  const passPct = getWavePassPct(waveNumber);
  const goalMet = totalTiles > 0 && Math.round((tilesCleared / totalTiles) * 100) >= passPct;
  const isFiniteMoves = isFinite(totalMoves);
  const showProgress = !isMultiplayer && !!progress;
  // A run total keeps the score and the "X to pass" chip on the same number; wave goals show their own count.
  const { display: animatedScore, pulse: scorePulse } = useAnimatedScore(showProgress && progress ? progress.baseScore + score : score);
  const accent = showProgress ? accentColor(getWaveTheme(waveNumber)) : undefined;
  const scoreGoal = objectives?.find((p) => p.objective.type === 'score_target');
  const goalChips = objectives?.filter((p) => p !== scoreGoal);
  const combo = comboTier(comboStreak?.isActive ? comboStreak.level : 0);

  return (
    <div
      className={cn('flex flex-col gap-0 bg-neo-navy border-b-2 border-neo-black', showProgress && 'border-b-4')}
      style={accent ? { borderBottomColor: accent } : undefined}
      data-testid="blast-hud"
    >
      {/* Utility strip. The MP round frame hides this whole child, so nothing MP needs lives here. */}
      <div className="flex items-center justify-between gap-2 px-3 py-0.5 pt-safe min-h-[32px]">
        <div className="flex items-center gap-1.5 min-w-0">
          {showTimer && (
            <BlastHUDTimer remainingTime={remainingTime as number} totalTime={totalTime as number} t={t} />
          )}
          {!isMultiplayer && !showProgress && (
            <span
              className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border-2 border-neo-cyan text-neo-cyan tabular-nums"
              style={NO_TEXT_SHADOW_STYLE}
              aria-label={`${t('blast.wave')} ${waveNumber}`}
            >
              W{waveNumber}
            </span>
          )}
          {!isMultiplayer && livesRemaining !== undefined && (
            <span
              data-testid="blast-lives-chip"
              className="shrink-0 inline-flex h-6 items-center gap-0.5 rounded-md border-2 border-neo-black bg-neo-navy-light px-1 tv:h-9"
              aria-label={t('blast.livesLabel')?.replace('{lives}', String(livesRemaining)) ?? `${livesRemaining} lives`}
            >
              {Array.from({ length: BLAST_MAX_LIVES }).map((_, i) => (
                <Heart
                  key={`life-${i}`}
                  className={cn('h-3 w-3 tv:h-5 tv:w-5', i < livesRemaining ? 'text-neo-pink' : 'text-white/20')}
                  fill="currentColor"
                  strokeWidth={2}
                />
              ))}
            </span>
          )}
          {showProgress && progress && <BlastHudDiamonds progress={progress} waveDiamonds={waveDiamonds} />}
          {ddaBoostActive && (
            <span
              data-testid="blast-lucky-boost-chip"
              className="shrink-0 inline-flex items-center gap-1 rounded-lg border-2 border-black bg-neo-yellow px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-neo-navy shadow-hard animate-neo-pop"
              style={NO_TEXT_SHADOW_STYLE}
              aria-label={t('blast.luckyBoostDesc')}
              title={t('blast.luckyBoostDesc')}
            >
              <Sparkles className="h-3 w-3" strokeWidth={3} />
              {t('blast.luckyBoost', 'Lucky')}
            </span>
          )}
          <div
            data-testid="blast-buff-slot"
            className="shrink-0 flex items-center min-h-[24px] min-w-[24px]"
          >
            {activeBuff && (() => {
              const meta = BUFF_META[activeBuff];
              const Icon = meta.Icon;
              return (
                <span
                  data-testid="blast-active-buff-chip"
                  data-consumed={buffConsumed ? 'true' : 'false'}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-1 rounded-lg border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-neo-navy shadow-hard-sm transition-[background-color,color,opacity,box-shadow] animate-neo-pop',
                    buffConsumed ? 'bg-white/20 text-white line-through opacity-60 shadow-none' : meta.bg,
                  )}
                  style={NO_TEXT_SHADOW_STYLE}
                  aria-label={(t(meta.label) || activeBuff) + (buffConsumed ? ` (${t('common.used', 'used')})` : '')}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={3} />
                  {t(meta.label) || activeBuff}
                </span>
              );
            })()}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {!isMultiplayer && <BlastWalletHud coins={coins} />}
          {hintSlot}
          {ownMute && <BlastHudMuteButton className="h-7 w-7" />}
          {onShowHelp && (
            <button
              onClick={onShowHelp}
              className="grid h-7 w-7 place-items-center text-white hover:text-neo-lime transition-colors"
              aria-label={t('blast.help')}
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          )}
          <ExitRoomButton
            onClick={onQuit}
            label={t('common.quit') ?? 'Quit'}
            data-testid="blast-quit-btn"
            className="w-7 h-7 min-w-0 min-h-0"
          />
        </div>
      </div>

      {/* Hero row: moves (the hero number), score, combo. */}
      <div className="flex items-center gap-3 px-3 pb-2 pt-1 tv:gap-5 tv:px-4">
        {isFiniteMoves ? (
          <BlastHudMoves movesRemaining={movesRemaining} label={t('blast.movesLeft')} />
        ) : (
          <div className="flex flex-col items-center gap-0.5 w-[56px]" aria-live="polite">
            <span className="text-xl font-black text-neo-white tabular-nums">
              {wordsFoundCount}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-white">
              {t('blast.words')}
            </span>
          </div>
        )}

        <div
          className="flex min-w-0 flex-1 flex-col justify-center"
          aria-label={`${t('blast.score')}: ${animatedScore}`}
        >
          <span
            data-testid="blast-score-label"
            className="text-[9px] font-black uppercase tracking-[0.14em] text-white leading-none tv:text-xs"
          >
            {t('blast.score')}
          </span>
          <span
            data-board-score-target=""
            className={cn(
              'block w-fit font-neo-display text-[30px] font-black leading-tight tabular-nums text-neo-white transition-transform duration-150 origin-[0%_50%] rtl:origin-[100%_50%] tv:text-5xl',
              scorePulse && 'scale-110',
            )}
          >
            {animatedScore.toLocaleString()}
          </span>
          {scoreGoal && (
            <span
              data-testid="blast-hud-score-target"
              dir="ltr"
              className={cn(
                'flex w-fit items-center gap-1 text-[11px] font-black tabular-nums leading-none tv:text-sm',
                scoreGoal.isComplete ? 'text-neo-lime' : 'text-white/80',
              )}
            >
              {scoreGoal.isComplete
                ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                : <Target className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
              {Math.min(scoreGoal.current, scoreGoal.objective.target).toLocaleString()} / {scoreGoal.objective.target.toLocaleString()}
            </span>
          )}
        </div>

        {!isMultiplayer && <div aria-hidden="true" className="h-14 w-14 shrink-0 sm:hidden" />}

        <div
          data-testid="blast-combo-slot"
          data-combo-tier={combo}
          dir="ltr"
          className={cn(
            'w-[44px] h-[44px] shrink-0 flex items-center justify-center rounded-full transition-transform duration-200',
            combo === 2 && 'scale-110 shadow-[0_0_0_3px_var(--neo-pink)]',
            combo === 3 && 'scale-125 shadow-[0_0_0_3px_var(--neo-yellow)]',
          )}
        >
          {comboStreak?.isActive && comboStreakArcRef ? (
            <BlastComboStreakBadge streak={comboStreak} arcRef={comboStreakArcRef} />
          ) : (
            <span
              data-testid="blast-combo-idle"
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-full border-[3px] border-white/15 font-neo-display text-xs font-black text-white/35"
            >
              ×1
            </span>
          )}
        </div>

        {isMultiplayer && (
          <BlastHudClearMeter
            layout="strip"
            tilesCleared={tilesCleared}
            totalTiles={totalTiles}
            goalMet={goalMet}
            clearedLabel={t('blast.cleared')}
          />
        )}
      </div>

      {!isMultiplayer && (
        <BlastHudGoal
          waveNumber={waveNumber}
          passPct={passPct}
          tilesCleared={tilesCleared}
          totalTiles={totalTiles}
          goalMet={goalMet}
          accent={accent}
          showWave={showProgress}
          objectives={goalChips}
          modifierSlot={modifierSlot}
          t={t}
        />
      )}
      {isMultiplayer && objectives && <BlastObjectiveBanner objectives={objectives} t={t} />}
    </div>
  );
}
