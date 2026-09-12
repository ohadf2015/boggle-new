'use client';

/**
 * DuelPlayPanel — the playing surface of a real-time duel.
 *
 * Split out of RealTimeDuelGame (534 lines) so the orchestrator stays readable
 * and this file can own the layout.
 *
 * Phone first: the shell is a locked column (`min-h-0` + `overflow-hidden`) and
 * exactly ONE region scrolls — the found-words tray. The board, the timer, the
 * swing bar and the input never move under a thumb.
 *
 * Dark-only surface: `bg-neo-navy` hardcoded, never the cream/dark pair
 * (Class 5 cream FOUC).
 */

import type { KeyboardEvent } from 'react';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { DuelSwingBar } from './DuelSwingBar';
import { DuelComboMeter } from './DuelComboMeter';

export interface DuelWordStatus {
  word: string;
  status: 'pending' | 'accepted' | 'rejected';
  points?: number;
  reason?: string;
}

export interface DuelPlayPanelProps {
  boardState: string[][];
  words: DuelWordStatus[];
  myScore: number;
  opponentScore: number;
  opponentName: string;
  myName: string;
  comboStreak: number;
  comboBonus: number;
  opponentStreak: number;
  timeRemaining: number;
  wordInputProps: Record<string, unknown>;
  currentWordEmpty: boolean;
  onSubmitWord: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onForfeit: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function DuelPlayPanel({
  boardState,
  words,
  myScore,
  opponentScore,
  opponentName,
  myName,
  comboStreak,
  comboBonus,
  opponentStreak,
  timeRemaining,
  wordInputProps,
  currentWordEmpty,
  onSubmitWord,
  onKeyDown,
  onForfeit,
}: DuelPlayPanelProps) {
  const { t } = useLanguage();
  const isUrgent = timeRemaining <= 10;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 bg-neo-navy">
      {/* Timer + live scores */}
      <div className="flex shrink-0 items-center justify-between gap-2 rounded-neo border-[3px] border-neo-cream/70 bg-neo-navy px-3 py-2 shadow-hard">
        <div className="text-neo-white">
          <p className="font-neo-body text-[10px] font-black uppercase tracking-widest text-neo-cream/80">
            {t('duels.you')}
          </p>
          <p className="font-neo-display text-xl font-black tabular-nums" data-testid="my-score">
            {myScore}
          </p>
        </div>

        <div
          data-testid="duel-timer"
          className={cn(
            'rounded-neo border-[3px] px-3 py-1 font-neo-display text-2xl font-black tabular-nums shadow-hard-sm',
            isUrgent
              ? 'border-neo-cream bg-neo-pink text-neo-white'
              : 'border-neo-cream/70 bg-neo-navy text-neo-white'
          )}
        >
          {formatTime(timeRemaining)}
        </div>

        <div className="text-end text-neo-white">
          <p className="truncate font-neo-body text-[10px] font-black uppercase tracking-widest text-neo-cream/80">
            {opponentName}
          </p>
          <p
            className="font-neo-display text-xl font-black tabular-nums"
            data-testid="opponent-score"
          >
            {opponentScore}
          </p>
        </div>
      </div>

      {/* Am I winning? */}
      <DuelSwingBar
        className="shrink-0"
        myScore={myScore}
        opponentScore={opponentScore}
        myName={myName}
        opponentName={opponentName}
        myStreak={comboStreak}
        opponentStreak={opponentStreak}
      />

      {/* How hot am I? */}
      <DuelComboMeter className="shrink-0" streak={comboStreak} bonus={comboBonus} />

      {/* Board */}
      <div className="mx-auto grid w-full max-w-[min(92vw,360px)] shrink-0 grid-cols-4 gap-1.5 rounded-neo border-[3px] border-neo-cream bg-neo-navy p-2 shadow-hard">
        {boardState.flat().map((letter, idx) => (
          <div
            key={`cell-${idx}-${letter}`}
            className="flex aspect-square items-center justify-center rounded-neo border-[2px] border-neo-black bg-neo-lime font-neo-display text-2xl font-black text-neo-black shadow-hard-sm"
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex shrink-0 gap-2">
        <input
          type="text"
          {...wordInputProps}
          onKeyDown={onKeyDown}
          placeholder={t('duels.typeWord')}
          data-testid="word-input"
          className="min-w-0 flex-1 rounded-neo border-[3px] border-neo-cream bg-neo-navy px-3 py-2.5 font-neo-body font-bold text-neo-white placeholder:text-neo-cream/80 shadow-hard focus:outline-hidden focus:ring-2 focus:ring-neo-cyan"
        />
        <button
          type="button"
          onClick={onSubmitWord}
          aria-disabled={currentWordEmpty}
          data-testid="submit-word-btn"
          className={cn(
            'shrink-0 rounded-neo border-[2px] border-neo-black bg-neo-lime px-4 py-2.5 font-neo-display text-sm font-black uppercase text-neo-black shadow-hard transition-all hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]',
            currentWordEmpty && 'cursor-not-allowed opacity-50'
          )}
        >
          {t('duels.addWord')}
        </button>
      </div>

      {/* The ONE scrolling region on this surface */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-neo border-[3px] border-neo-cream/70 bg-neo-navy p-2 shadow-hard">
        {words.length === 0 ? (
          <p className="py-6 text-center font-neo-body text-sm text-neo-cream/80">
            {t('duels.findWords')}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {words.map((wordStatus, idx) => (
              <m.div
                key={`word-${idx}-${wordStatus.word}`}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className={cn(
                  'rounded-neo border-[2px] border-neo-black px-2 py-0.5 font-neo-body text-sm font-black shadow-hard-sm',
                  wordStatus.status === 'accepted' && 'bg-neo-lime text-neo-black',
                  wordStatus.status === 'rejected' && 'bg-neo-pink text-neo-white',
                  wordStatus.status === 'pending' && 'border-neo-cream bg-neo-navy text-neo-white'
                )}
              >
                {wordStatus.word}
                {wordStatus.points ? ` +${wordStatus.points}` : ''}
              </m.div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onForfeit}
        data-testid="forfeit-btn"
        className="mx-auto shrink-0 rounded-neo border-[3px] border-neo-cream bg-transparent px-4 py-1.5 font-neo-body text-xs font-black uppercase tracking-wide text-neo-cream transition-all hover:bg-neo-cream hover:text-neo-navy active:translate-y-0.5"
      >
        {t('duels.forfeitConfirm')}
      </button>
    </div>
  );
}
