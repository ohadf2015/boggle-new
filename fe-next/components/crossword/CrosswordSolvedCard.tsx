'use client';

import { Share2 } from 'lucide-react';
import { SoloRewardCard } from '@/components/solo/SoloRewardCard';
import type { Difficulty } from '@/lib/crossword/types';

interface SolvedCardProps {
  elapsedMs: number;
  wordsTotal: number;
  hintsUsed: number;
  soloAward: any;
  dailyModifier: any;
  onShare: () => void;
  onNewPuzzle: (d: Difficulty) => void;
  onReset: () => void;
  onDismiss: () => void;
  onPlayAgain?: () => void;
  t: (k: string, p?: any) => string;
}

function SolvedStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-neo border-neo border-black bg-neo-navy/10 px-2 py-1.5">
      <div className="font-neo-display font-extrabold text-lg">{value}</div>
      <div className="font-neo-body font-semibold text-[0.6rem] uppercase tracking-[0.1em] text-neo-navy/70">
        {label}
      </div>
    </div>
  );
}

export function CrosswordSolvedCard({
  elapsedMs, wordsTotal, hintsUsed,
  soloAward, dailyModifier,
  onShare, onNewPuzzle, onReset, onDismiss, onPlayAgain, t,
}: SolvedCardProps) {
  const sec = Math.floor(elapsedMs / 1000);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy/75 p-6">
      <div className="bg-neo-cyan text-neo-navy border-neo-thick border-black rounded-neo shadow-hard-lg px-8 py-7 text-center max-w-sm w-full">
        <div className="text-5xl mb-1" aria-hidden>✦</div>
        <div className="relative">
          <h2 className="font-neo-display font-extrabold text-2xl mb-3">
            {t('crossword.solvedTitle')}
          </h2>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t('crossword.dismiss')}
            className="absolute -top-2 -end-2 rounded-neo border-neo border-black bg-neo-navy-light px-2 py-1 font-neo-body text-xs font-bold text-neo-white shadow-hard active:translate-y-[1px] active:shadow-hard-pressed"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <SolvedStat value={`${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`} label={t('crossword.timer')} />
          <SolvedStat value={`${wordsTotal}`} label={t('crossword.wordsLabel')} />
          <SolvedStat value={`${hintsUsed}`} label={t('crossword.hintsLabel')} />
        </div>
        <button
          type="button"
          onClick={onShare}
          className="w-full flex items-center justify-center gap-2 font-neo-display font-bold text-sm bg-neo-navy text-neo-cyan border-neo border-black rounded-neo shadow-hard px-4 py-2 mb-3 active:translate-y-[1px] active:shadow-hard-pressed"
        >
          <Share2 size={14} />
          {t('crossword.share')}
        </button>
        {soloAward && (
          <SoloRewardCard
            t={t}
            awarded={soloAward.awarded}
            bonus={soloAward.bonus}
            modifier={dailyModifier}
            claimed={soloAward.claimed}
            onPlayAgain={onPlayAgain ?? onReset}
          />
        )}
        <div className="mt-3">
          {wordsTotal > 0 && (
            <>
              <button
                type="button"
                onClick={() => onNewPuzzle('easy')}
                className="w-full font-neo-display font-bold bg-neo-lime text-neo-navy border-neo border-black rounded-neo shadow-hard px-6 py-2.5 mb-2 active:translate-y-[1px] active:shadow-hard-pressed"
              >
                {t('crossword.nextPuzzle')} ▸
              </button>
              <p className="font-neo-body font-semibold text-[0.65rem] uppercase tracking-[0.12em] text-neo-navy/70 mb-2">
                {t('crossword.nextPuzzlePrompt')}
              </p>
              <div className="flex items-center justify-center gap-2">
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onNewPuzzle(d)}
                    className={`font-neo-display font-bold text-sm border-neo border-black rounded-neo shadow-hard px-4 py-2 active:translate-y-[1px] active:shadow-hard-pressed ${
                      d === 'easy'
                        ? 'bg-neo-lime text-neo-navy'
                        : d === 'hard'
                          ? 'bg-neo-pink text-neo-white'
                          : 'bg-neo-navy text-neo-white'
                    }`}
                  >
                    {t(`crossword.difficulty.${d}`)}
                  </button>
                ))}
              </div>
              {!soloAward && (
                <button
                  type="button"
                  onClick={onReset}
                  className="mt-3 font-neo-body font-semibold text-xs text-neo-navy/70 underline underline-offset-2"
                >
                  {t('crossword.playAgain')}
                </button>
              )}
            </>
          )}
          {wordsTotal === 0 && (
            <button
              type="button"
              onClick={onReset}
              className="font-neo-display font-bold bg-neo-navy text-neo-white border-neo border-black rounded-neo shadow-hard px-6 py-2.5 active:translate-y-[1px] active:shadow-hard-pressed"
            >
              {t('crossword.playAgain')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
