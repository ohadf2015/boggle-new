'use client';

import React, { useState, useEffect, useRef } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useWordForgeRun } from '@/hooks/useWordForgeRun';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useGameActiveSound } from '@/hooks/useGameActiveSound';
import type { Language } from '@/shared/types/game';
import { Button } from '@/components/ui/button';
import { HowToPlayCard } from '@/components/common/HowToPlayCard';
import { RuneBar } from './RuneBar';
import { RunePicker } from './RunePicker';
import { BossReveal } from './BossReveal';
import { RoundComplete } from './RoundComplete';
import { RunSummary } from './RunSummary';
import { ScoreFeedback } from './ScoreFeedback';
import { WordForgeHUD } from './WordForgeHUD';
import { WordForgeGrid } from './WordForgeGrid';

/**
 * Word Forge Game — Main game container.
 *
 * Renders the appropriate screen based on run phase:
 * - idle: Start screen
 * - playing: Grid + HUD + RuneBar
 * - pickRune: Rune selection (pick 1 of 3)
 * - bossReveal: Boss constraint announcement
 * - roundResult: Brief round completion
 * - runOver: End-of-run summary
 */
export default function WordForgeGame(): React.JSX.Element {
  const { t, language } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const run = useWordForgeRun(language as Language);
  const { checkWord, isLoaded: dictLoaded } = useDictionaryCache(language as Language);
  const { playSound } = useSoundEffects();
  // Unmute: every WordForge SFX runs through `playSound`, which defaults
  // requiresGameActive:true and no-ops unless a game is marked active — and this
  // mode never marked one, so all 14 sounds were silently dropped. Keep active
  // for the whole run EXCEPT the idle start screen, so the RoundComplete /
  // RunSummary victory sounds (which fire on the result screens, after play
  // ends) still land. Cleared on unmount by the hook so it can't leak.
  useGameActiveSound(run.state.phase !== 'idle');

  // Specific rejection feedback — tells the player *why* a word bounced
  // instead of the prototype "nothing happened". Driven by the hook's
  // rejection channel (constraint/duplicate/oath) and the grid's own
  // dictionary check (notWord).
  const [rejectMsg, setRejectMsg] = useState<string | null>(null);
  const rejectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashReject = React.useCallback((reasonKey: string) => {
    setRejectMsg(t(`wordForge.reject.${reasonKey}`));
    playSound('wordRejected');
    if (rejectTimerRef.current) clearTimeout(rejectTimerRef.current);
    rejectTimerRef.current = setTimeout(() => setRejectMsg(null), 1600);
  }, [t, playSound]);
  useEffect(() => {
    if (run.lastRejection) {
      flashReject(run.lastRejection.reason);
      setConsecutiveRejectCount(c => c + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.lastRejection]);
  // Reset hint counter on successful word or new round
  useEffect(() => {
    if (run.lastWordScore) setConsecutiveRejectCount(0);
  }, [run.lastWordScore]);
  useEffect(() => {
    setConsecutiveRejectCount(0);
  }, [run.state.round, run.state.phase]);
  useEffect(() => () => { if (rejectTimerRef.current) clearTimeout(rejectTimerRef.current); }, []);

  // Track triggered rune IDs for glow effect
  const [triggeredRuneIds, setTriggeredRuneIds] = useState<string[]>([]);
  // Consecutive rejection counter — drives alphabet hint overlay on grid
  const [consecutiveRejectCount, setConsecutiveRejectCount] = useState(0);
  const triggeredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Full-screen game: hide global chrome for the WHOLE run lifecycle (idle →
  // between-round → runOver), not just the playing phase. The intro/result
  // screens otherwise rendered the bottom-nav + footer and overflowed the
  // viewport (in-game scroll). Cleared on unmount so it can't leak.
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  useEffect(() => {
    if (run.lastWordScore?.runeEffects?.length) {
      // Match runeEffect.runeId to equipped rune's instanceId via def.id
      const runeIdToInstanceId = new Map(
        run.state.runes.map((r) => [r.def.id, r.instanceId])
      );
      const ids = run.lastWordScore.runeEffects
        .map((e) => runeIdToInstanceId.get(e.runeId))
        .filter((id): id is string => Boolean(id));
      if (ids.length > 0) {
        setTriggeredRuneIds(ids);
        if (triggeredTimerRef.current) clearTimeout(triggeredTimerRef.current);
        triggeredTimerRef.current = setTimeout(() => setTriggeredRuneIds([]), 800);
      }
    }
  }, [run.lastWordScore, run.state.runes]);

  // ─── Idle: Start Screen ────────────────────────────────
  if (run.state.phase === 'idle') {
    return (
      <div className="min-h-screen bg-[#0A0A1A] flex flex-col items-center justify-center gap-6 p-4">
        {/* First-run rules overlay — the loop (timer, target, runes, bosses) is
            heavy, so spell it out once before the first run. */}
        <HowToPlayCard
          storageKey="word-forge"
          title={t('wordForge.howToCard.title')}
          steps={[0, 1, 2, 3].map((i) => t(`wordForge.howToCard.steps.${i}`))}
          cta={t('wordForge.howToCard.cta')}
          accent="cyan"
        />
        {/* Title with fire icon */}
        <div className="text-6xl animate-float">🔥</div>
        <h1 className="text-4xl sm:text-5xl font-black uppercase text-neo-cream font-neo-display tracking-tight text-center">
          {t('wordForge.title')}
        </h1>
        <p className="text-lg text-neo-cream/70 font-neo-body text-center max-w-md">
          {t('wordForge.subtitle')}
        </p>

        {/* How it works — 3 short lines, staggered */}
        <div className="flex flex-col gap-1.5 text-sm text-neo-cream/50 font-neo-body text-center max-w-xs">
          {[0, 1, 2].map((i) => t(`wordForge.howTo.${i}`)).map((line, i) => (
            <m.span
              key={line}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.2 + i * 0.2, duration: 0.4 }}
            >
              {line}
            </m.span>
          ))}
        </div>

        {/* Stats (if player has progress) — slide in from below */}
        {run.progress && run.progress.totalRuns > 0 && (
          <m.div
            className="flex gap-4 text-sm font-neo-body"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReducedMotion ? 0 : 0.8, duration: 0.5 }}
          >
            <div className="bg-neo-gray/50 border-2 border-neo-black rounded-neo px-3 py-1.5 shadow-hard-sm">
              <span className="text-neo-cream/50 text-xs">{t('wordForge.bestRound')}</span>
              <span className="block text-lg font-black text-tier-gold tabular-nums">{run.progress.highestRound}</span>
            </div>
            <div className="bg-neo-gray/50 border-2 border-neo-black rounded-neo px-3 py-1.5 shadow-hard-sm">
              <span className="text-neo-cream/50 text-xs">{t('wordForge.runs')}</span>
              <span className="block text-lg font-black text-neo-cream tabular-nums">{run.progress.totalRuns}</span>
            </div>
            <div className="bg-neo-gray/50 border-2 border-neo-black rounded-neo px-3 py-1.5 shadow-hard-sm">
              <span className="text-neo-cream/50 text-xs">XP</span>
              <span className="block text-lg font-black text-neo-purple tabular-nums">{run.progress.totalXp}</span>
            </div>
          </m.div>
        )}

        {/* Start button */}
        <Button
          onClick={run.startRun}
          size="lg"
          className="mt-2 px-10 text-xl motion-safe:animate-pulse-subtle"
        >
          {run.progress && run.progress.totalRuns > 0
            ? t('wordForge.tryAgain')
            : t('wordForge.startRun')}
        </Button>
      </div>
    );
  }

  // ─── Round Complete: Brief Celebration ───────────────
  if (run.state.phase === 'roundResult') {
    const lastRound = run.state.roundHistory[run.state.roundHistory.length - 1];
    return (
      <RoundComplete
        round={run.state.round}
        score={lastRound?.score ?? run.state.roundScore}
        target={lastRound?.target ?? run.state.roundTarget}
        wordsFound={lastRound?.wordsFound ?? run.state.wordsThisRound.length}
        wasBoss={lastRound?.wasBossRound ?? (run.state.round > 0 && run.state.round % 3 === 0)}
        onContinue={run.continueToRunePick}
      />
    );
  }

  // ─── Pick Rune: Between-Round Selection ────────────────
  if (run.state.phase === 'pickRune' && run.state.runeOffering) {
    return (
      <RunePicker
        offering={run.state.runeOffering}
        equippedRunes={run.state.runes}
        maxSlots={run.state.maxRuneSlots}
        round={run.state.round}
        onPick={run.pickRune}
        onSkip={run.skipRune}
      />
    );
  }

  // ─── Boss Reveal / Round Ready Gate (CRIT-5: all rounds go through this) ──
  if (run.state.phase === 'bossReveal') {
    return (
      <BossReveal
        constraint={run.state.bossConstraint?.def ?? null}
        round={run.state.round}
        roundTarget={run.state.roundTarget}
        onReady={run.startRound}
      />
    );
  }

  // ─── Run Over: Summary ─────────────────────────────────
  if (run.state.phase === 'runOver') {
    return (
      <RunSummary
        state={run.state}
        onPlayAgain={run.startRun}
        onExit={run.exitToMenu}
      />
    );
  }

  // ─── Playing: Main Game Screen ─────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A1A] flex flex-col relative pb-[env(safe-area-inset-bottom)]">
      {/* HUD: Round, Timer, Score, Progress */}
      <WordForgeHUD
        round={run.state.round}
        maxRounds={run.state.maxRounds}
        timeRemaining={run.state.timeRemaining}
        timerDuration={run.state.timerDuration}
        roundScore={run.state.roundScore}
        roundTarget={run.state.roundTarget}
        bossConstraint={run.state.bossConstraint}
        wordsFoundCount={run.state.wordsThisRound.length}
        chainStartedAt={run.state.chainStartedAt}
        ironStreak={run.state.ironStreak}
      />

      {/* Grid */}
      <div className="flex-1 flex items-center justify-center px-4 py-2">
        <WordForgeGrid
          grid={run.state.grid}
          language={language as Language}
          onWordFound={run.submitWord}
          bossConstraintId={run.state.bossConstraint?.def.id ?? null}
          checkWord={dictLoaded ? checkWord : undefined}
          dictReady={dictLoaded}
          onReject={() => { flashReject('notWord'); setConsecutiveRejectCount(c => c + 1); }}
          showAlphaHints={consecutiveRejectCount >= 2}
        />
      </div>

      {/* Why-it-bounced chip + dictionary-loading hint */}
      <div className="h-6 flex items-center justify-center" aria-live="polite">
        {rejectMsg ? (
          <span className="px-3 py-0.5 rounded-neo bg-neo-red/15 border-2 border-neo-red/40 text-neo-red text-xs font-black uppercase font-neo-body motion-safe:animate-neo-pop">
            {rejectMsg}
          </span>
        ) : !dictLoaded ? (
          <span className="text-neo-cream/40 text-xs font-neo-body">{t('wordForge.dictLoading')}</span>
        ) : null}
      </div>

      {/* Score Feedback (ephemeral) */}
      <ScoreFeedback lastScore={run.lastWordScore} />

      {/* Rune Bar (bottom) */}
      <RuneBar runes={run.state.runes} maxSlots={run.state.maxRuneSlots} triggeredRuneIds={triggeredRuneIds} />
    </div>
  );
}
