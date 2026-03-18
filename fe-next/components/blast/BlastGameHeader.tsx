/**
 * BlastGameHeader — Header bar and stats row for BlastGameLayout.
 * Extracted from BlastGameLayout.tsx for file size management.
 */
import { ArrowLeft, Bomb, BookOpen, HelpCircle } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Button } from '@/components/ui/button';
import CircularTimer from '@/components/CircularTimer';
import { BlastMoveCounter } from './BlastMoveCounter';
import { BlastProgressBar } from './BlastProgressBar';
import { BlastComboStreakBadge } from './BlastComboStreakBadge';
import ComboDisplay from '@/components/game/ComboDisplay';
import { cn } from '@/lib/utils';
import { formatScore } from '@/utils/scoreDisplay';
import type { ComboStreakState } from './hooks/useBlastComboStreak';
import type { BlastComboType } from './utils/blastCombos';

interface BlastGameHeaderProps {
  // Multiplayer
  isMultiplayer: boolean;
  remainingTime?: number | null;
  totalTime?: number;
  // Wave
  waveNumber: number;
  // Combo
  comboLevel: number;
  comboTimeRemaining: number | null;
  comboDanger: boolean;
  streak?: ComboStreakState;
  arcRef?: React.RefObject<SVGCircleElement | null>;
  // Score
  score: number;
  personalBestScore?: number | null;
  // Game state
  wordsFoundCount: number;
  movesRemaining: number;
  totalMoves: number;
  tilesCleared: number;
  totalTiles: number;
  bonusMoveAwarded?: number;
  // Codex
  discoveredCombos?: Set<BlastComboType>;
  // Callbacks
  onQuitRequest: () => void;
  onShowHelp: () => void;
  onShowCodex: () => void;
  onShowEndGame: () => void;
  onToggleFoundWords: () => void;
  // Translation
  t: (key: string) => string | undefined;
}

export function BlastGameHeader({
  isMultiplayer, remainingTime, totalTime,
  waveNumber,
  comboLevel, comboTimeRemaining, comboDanger, streak, arcRef,
  score, personalBestScore,
  wordsFoundCount, movesRemaining, totalMoves, tilesCleared, totalTiles, bonusMoveAwarded,
  discoveredCombos,
  onQuitRequest, onShowHelp, onShowCodex, onShowEndGame, onToggleFoundWords,
  t,
}: BlastGameHeaderProps) {
  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between px-4 shrink-0 relative z-30 pb-1" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
        <Button
          variant="destructive"
          size="sm"
          onClick={onQuitRequest}
          className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none font-bold text-xs tracking-widest"
        >
          <ArrowLeft className="me-1.5 h-4 w-4 rtl:rotate-180" />
          <span className="hidden sm:inline">
            {isMultiplayer ? t('common.leave') : t('common.quit')}
          </span>
        </Button>

        {isMultiplayer && remainingTime != null && (
          <CircularTimer remainingTime={remainingTime} totalTime={totalTime} size="xs" />
        )}

        {!isMultiplayer && waveNumber > 1 && (
          <AdaptiveMotion.div
            key={waveNumber}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-2 py-0.5 rounded-neo border-2 border-fuchsia-400/60 bg-fuchsia-500/20"
          >
            <span className="font-black text-xs text-fuchsia-300 uppercase tracking-wider">
              {t('blast.waveBadge')?.replace('{wave}', String(waveNumber)) || `Wave ${waveNumber}`}
            </span>
          </AdaptiveMotion.div>
        )}

        <div className="flex items-center gap-1">
          {discoveredCombos && (
            <Button variant="ghost" size="sm" onClick={onShowCodex} className="text-white/60 hover:text-white" aria-label={t('blast.comboCodex')}>
              <BookOpen className="h-5 w-5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onShowHelp} className="text-white/60 hover:text-white" aria-label={t('blast.helpTitle')}>
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>

        {!isMultiplayer && (
          <Button variant="secondary" size="sm" onClick={onShowEndGame} className="border-2 border-neo-black shadow-hard-sm font-bold text-xs">
            <Bomb className="h-4 w-4 sm:me-1.5" />
            <span className="hidden sm:inline">{t('blast.giveUp')}</span>
          </Button>
        )}
      </header>

      {/* Combo Display + Streak Badge */}
      <div className="h-6 flex items-center justify-center shrink-0 relative z-30 gap-2">
        {streak && arcRef && <BlastComboStreakBadge streak={streak} arcRef={arcRef} />}
        <ComboDisplay comboLevel={comboLevel} compact timeRemaining={comboTimeRemaining} isDanger={comboDanger} />
      </div>

      {/* Stats row */}
      <div className={cn(
        'px-4 flex items-center shrink-0 relative z-30 mb-1 max-w-md mx-auto w-full',
        isMultiplayer ? 'justify-center gap-8' : 'justify-between'
      )}>
        {!isMultiplayer && (
          <AdaptiveMotion.div
            key={Math.floor(score / 500)}
            initial={{ scale: 1.04 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="border-3 border-neo-black rounded-neo shadow-hard px-3 py-1.5 min-w-[80px]"
            style={{ background: 'linear-gradient(135deg, #FFE135 0%, #BFFF00 100%)' }}
          >
            <div className="text-center">
              <div className="font-black text-neo-black text-xl sm:text-2xl leading-tight tabular-nums">
                {formatScore(score)}
              </div>
              <div className="font-bold uppercase tracking-wider text-neo-black/60 text-[10px] sm:text-xs">
                {t('common.score')}
              </div>
            </div>
            {personalBestScore != null && personalBestScore > 0 && (
              <div className={cn(
                'text-[9px] font-bold uppercase tracking-wider text-center mt-0.5',
                score > personalBestScore ? 'text-neo-lime' : 'text-neo-black/40',
              )}>
                {score > personalBestScore ? '★ NEW BEST' : `${t('blast.best')}: ${personalBestScore}`}
              </div>
            )}
          </AdaptiveMotion.div>
        )}

        <BlastMoveCounter movesRemaining={movesRemaining} totalMoves={totalMoves} t={t} bonusMoveAwarded={bonusMoveAwarded} />

        <button onClick={onToggleFoundWords} className="text-center cursor-pointer hover:scale-105 transition-transform">
          <div className="font-black text-white text-xl sm:text-2xl">{wordsFoundCount}</div>
          <div className="font-bold uppercase tracking-wider text-white/70 text-[10px] sm:text-xs">{t('common.words')}</div>
        </button>

        {!isMultiplayer && (
          <div className="w-28 sm:w-32">
            <BlastProgressBar cleared={tilesCleared} total={totalTiles} t={t} />
          </div>
        )}
      </div>
    </>
  );
}
