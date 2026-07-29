'use client';

import React, { useEffect, useRef } from 'react';
import type { WordForgeRunState } from '@/types/wordForge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { calculateRunXp, XP_THRESHOLDS } from '@/lib/wordForge/scoring';
import WatchAdButton from '@/components/daily/WatchAdButton';

interface RunSummaryProps {
  state: WordForgeRunState;
  onPlayAgain: () => void;
  onExit: () => void;
}

/**
 * RunSummary — End-of-run results screen.
 * Shows: rounds reached, best word, words found, total score, XP earned, runes used.
 */
export function RunSummary({ state, onPlayAgain, onExit }: RunSummaryProps): React.JSX.Element {
  const { t } = useLanguage();
  const { playSound } = useSoundEffects();
  const won = state.round >= state.maxRounds && state.roundHistory.every(r => r.passed);
  const xpEarned = calculateRunXp(state.round, state.allWords.length, state.totalScore, won);
  const nextThreshold = XP_THRESHOLDS.find(th => th.xp > (state.totalScore /* approximate */)) ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
  const fxFiredRef = useRef(false);

  // Final-screen ceremony — only on win. Run-over plays a softer rejected cue.
  useEffect(() => {
    if (fxFiredRef.current) return;
    fxFiredRef.current = true;
    const x = typeof window !== 'undefined' ? window.innerWidth / 2 : 200;
    const y = typeof window !== 'undefined' ? window.innerHeight * 0.32 : 160;
    if (won) {
      playSound('crownVictory');
      SharedFxApp.spawnBurst('victory-burst', x, y, { count: 36 });
      SharedFxApp.spawnBurst('sparkle-gold', x, y, { count: 24 });
    } else {
      playSound('wordRejected');
    }
  }, [won, playSound]);

  return (
    <div className="min-h-screen bg-[#0A0A1A] flex flex-col items-center justify-center gap-6 p-4">
      {/* Title */}
      <h1 className={cn(
        'text-3xl sm:text-4xl font-black uppercase font-neo-display tracking-tight',
        won ? 'text-neo-lime' : 'text-neo-red',
      )}>
        {won ? t('wordForge.victory') : t('wordForge.runOver')}
      </h1>

      {/* Stats card */}
      <div className="bg-neo-cream border-4 border-neo-black shadow-hard-xl rounded-neo-lg p-6 w-full max-w-sm space-y-3">
        <StatRow label={t('wordForge.reached')} value={`${t('wordForge.round')} ${state.round} / ${state.maxRounds}`} />
        {state.bestWord && (
          <StatRow
            label={t('wordForge.bestWord')}
            value={`${state.bestWord.word} (${state.bestWord.score} pts)`}
            highlight
          />
        )}
        <StatRow label={t('wordForge.wordsFound')} value={`${state.allWords.length}`} />
        <StatRow label={t('wordForge.totalScore')} value={`${state.totalScore}`} highlight />
      </div>

      {/* XP earned */}
      {xpEarned > 0 && (
        <div className="w-full max-w-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase text-neo-cream/60 font-neo-body">
              {t('wordForge.forgeXp')}
            </span>
            <span className="text-neo-lime font-black font-neo-display">
              +{xpEarned}
            </span>
          </div>
          <div className="h-3 bg-neo-cream/10 border-2 border-neo-black rounded-neo overflow-hidden">
            <div
              className="h-full bg-neo-purple transition-all duration-500"
              style={{ width: `${Math.min(100, (xpEarned / nextThreshold.xp) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Runes used */}
      {state.runes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase text-neo-cream/40 text-center font-neo-body">
            {t('wordForge.yourRunes')}
          </h3>
          <div className="flex gap-2 justify-center">
            {state.runes.map(rune => (
              <div
                key={rune.instanceId}
                className="w-10 h-10 bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard-sm
                           flex items-center justify-center text-lg"
                title={rune.def.name}
              >
                {rune.def.icon}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* R3 — Rewarded gold top-up */}
      <div className="w-full max-w-sm">
        <WatchAdButton onCoinsEarned={() => {}} t={t} surface="word_forge_run_summary" />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={onPlayAgain} size="default">
          {t('wordForge.tryAgain')}
        </Button>
        <Button onClick={onExit} variant="outline" size="default">
          {t('wordForge.exit')}
        </Button>
      </div>
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-neo-black/60 font-neo-body">{label}</span>
      <span className={cn(
        'font-black font-neo-display',
        highlight ? 'text-tier-gold text-lg' : 'text-neo-black text-base',
      )}>
        {value}
      </span>
    </div>
  );
}
