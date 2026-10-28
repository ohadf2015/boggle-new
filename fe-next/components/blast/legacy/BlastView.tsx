'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Shield, Bomb, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useCoinContext } from '@/contexts/CoinContext';
import { trackGameStart } from '@/utils/growthTracking';
import { trackBlastRunEnded } from '@/components/blast/legacy/utils/blastTelemetry';
import { useHasRealAdProvider } from '@/hooks/useHasRealAdProvider';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { BlastGame } from './BlastGame';
import { BlastResultsSummary } from './BlastResultsSummary';
import { BlastPregameBuffModal, type BlastPregameBuff } from './BlastPregameBuffModal';
import { BlastRetryWaveModal } from './BlastRetryWaveModal';
import { BlastMascotHud, BLAST_MASCOT_SLOT_CLASS } from './BlastMascotHud';
import BlastUpgradePanel from './BlastUpgradePanel';
import { HighlightPlayer } from './highlight/HighlightPlayer';
import { useBlastMascot } from '@/lib/blast/useBlastMascot';
import { useMascotEnabled } from '@/lib/blast/useMascotEnabled';
import { emitMascotEvent } from '@/lib/blast/mascotBus';
import { useBlastUpgradeStore, computeUpgradeEffects } from '@/lib/blast/useBlastUpgradeStore';
import { playWaveFailArpeggio } from '@/lib/blast/waveFailArpeggio';
import { useBlastCheckpoint } from './hooks/useBlastCheckpoint';
import { getWaveConfig, getWaveDistribution, buildWaveResult, totalWaveRewardCoins } from './utils/blastWaveConfig';
import { BLAST_MAX_LIVES } from './utils/blastLives';
import { selectWaveModifier, applyModifierToWaveConfig } from './utils/blastModifiers';
import { BlastModifierBadge } from './BlastModifierBadge';
import { resolveBlastConfig, type BlastPhase, type BlastResultsData, type WaveResult } from './types';
import { useHighlightStore } from '@/stores/highlightStore';
import { rankMoments } from '@/lib/blast/highlightScoring';
import type { Language } from '@/shared/types/game';
import { Button } from '@/components/ui/button';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { useGameExitGuard } from '@/hooks/useGameExitGuard';
import { ModeCoach } from '@/components/tutorial/ModeCoach';
import { saveBlastResult } from './utils/saveBlastResult';
import { BlastWaveClear } from '@/components/blast/progress/BlastWaveClear';
import { useBlastLadder } from '@/components/blast/progress/useBlastLadder';
import { recordLocalBest } from '@/components/blast/progress/localBest';
import { autoContinueMs } from '@/components/blast/progress/progressTiming';

/**
 * BlastView — Phase router for Blast Mode.
 * Phases: ready → playing → waveTransition → results
 */
export function BlastView() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const hasRealAdProvider = useHasRealAdProvider();

  const [phase, setPhase] = useState<BlastPhase>('ready');
  const [results, setResults] = useState<BlastResultsData | null>(null);
  const gameKeyRef = useRef(0);

  // HUD mascot — reacts to gameplay events via the mascot bus.
  const mascot = useBlastMascot();
  const mascotPref = useMascotEnabled();

  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(phase === 'playing');
    return () => setIsInGame(false);
  }, [phase, setIsInGame]);

  // Funnel parity: emit growth:game_started once per blast run when the player
  // first transitions out of `ready`. Was missing entirely → PostHog showed
  // 27 blast mode_selected events with 0 game_starts (2026-04-27 sweep).
  const gameStartedRef = useRef(false);
  useEffect(() => {
    if (phase === 'playing' && !gameStartedRef.current) {
      gameStartedRef.current = true;
      trackGameStart('blast', { language });
    }
  }, [phase, language]);

  // Wave tracking
  const checkpoint = useBlastCheckpoint();
  const [currentWave, setCurrentWave] = useState(1);
  // Per-run seed for deterministic SP wave-modifier selection. Regenerated at
  // the start of every fresh run so each playthrough rolls a different sequence.
  const [runSeed, setRunSeed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [totalScore, setTotalScore] = useState(0);
  const [allWordsFound, setAllWordsFound] = useState<string[]>([]);
  const [waveHistory, setWaveHistory] = useState<WaveResult[]>([]);
  const [lastWaveStats, setLastWaveStats] = useState({ score: 0, words: 0, clearPct: 0, diamonds: 0 });
  const [runDiamonds, setRunDiamonds] = useState(0);
  // Furthest wave before this run started, so the ladder can flag a new record.
  const [recordAtStart, setRecordAtStart] = useState(0);

  // 3-lives model (run-level). Each out-of-moves dead-end free-revives and
  // burns a life; only once all are spent does BlastGame show the ad-continue
  // offer. Reset at the start of every fresh run.
  const [livesRemaining, setLivesRemaining] = useState(BLAST_MAX_LIVES);
  const handleConsumeLife = useCallback(() => {
    setLivesRemaining((n) => Math.max(0, n - 1));
  }, []);

  // Pre-game buff (rewarded-ad picker, single-use per run)
  const [pregameBuff, setPregameBuff] = useState<BlastPregameBuff | null>(null);
  const [buffModalOpen, setBuffModalOpen] = useState(false);

  // Retry-on-loss flow — snapshot pre-wave state at every wave entry so that
  // an ad-gated retry can restart only the failed wave, leaving prior wave
  // progress (score, words, history) intact. One-shot per run.
  type WaveSnapshot = {
    waveNumber: number;
    totalScore: number;
    allWordsFound: string[];
    waveHistory: WaveResult[];
  };
  const preWaveSnapshotRef = useRef<WaveSnapshot | null>(null);
  const retryUsedRef = useRef(false);
  const [retryDeclined, setRetryDeclined] = useState(false);

  /** Capture pre-wave state right before entering `playing`. */
  const snapshotPreWave = useCallback((wave: number, score: number, words: string[], history: WaveResult[]) => {
    preWaveSnapshotRef.current = {
      waveNumber: wave,
      totalScore: score,
      allWordsFound: [...words],
      waveHistory: [...history],
    };
  }, []);

  // SP-only random wave modifier — pure function of (runSeed, wave). Patches the
  // wave config (cascade/distribution) and may multiply word score. MP never
  // reaches this path (server-authoritative), so no desync risk.
  const activeModifier = useMemo(
    () => selectWaveModifier(runSeed, currentWave),
    [runSeed, currentWave],
  );

  // Apply wave-specific overrides.
  // `config` is memoized so BlastGame doesn't see a new object reference on
  // every BlastView render (e.g. phase flips, score ticks). A fresh config
  // prop would invalidate every downstream memo + effect dep that touches it.
  const waveConfig = useMemo(
    () => applyModifierToWaveConfig(getWaveConfig(currentWave), activeModifier),
    [currentWave, activeModifier],
  );
  const upgradeLevels = useBlastUpgradeStore(s => s.levels);
  const upgradeEffects = useMemo(() => computeUpgradeEffects(upgradeLevels), [upgradeLevels]);
  const [showStore, setShowStore] = useState(false);
  const config = useMemo(
    () => ({
      ...resolveBlastConfig((language as Language) || 'en', 'medium'),
      specialTileChance: Math.min(0.35, waveConfig.specialTileChance + upgradeEffects.luckySpawnChance),
      customDistribution: getWaveDistribution(waveConfig),
      // Always shrink — cleared cells stay empty so full board clear is achievable
      boardClearMode: 'shrink' as const,
    }),
    [language, waveConfig, upgradeEffects],
  );
  const enhancedWaveConfig = useMemo(
    () => ({
      ...waveConfig,
      movesAllowed: (waveConfig.movesAllowed ?? 0) + upgradeEffects.startingMovesBonus,
    }),
    [waveConfig, upgradeEffects],
  );
  const enhancedModifierScoreMultiplier = useMemo(
    () => (activeModifier?.scoreMultiplier ?? 1) * upgradeEffects.comboScoreMult,
    [activeModifier?.scoreMultiplier, upgradeEffects.comboScoreMult],
  );

  const ladder = useBlastLadder({ language, difficulty: config.difficulty ?? 'medium', runId: runSeed });
  const hudProgress = useMemo(
    () => ({
      baseScore: totalScore,
      baseDiamonds: runDiamonds,
      recordWave: recordAtStart,
      personalBest: ladder.personalBest,
      rivals: ladder.rivals,
    }),
    [totalScore, runDiamonds, recordAtStart, ladder],
  );

  /** Wave completed — transition to next wave */
  const runCollectedRef = useRef({ diamonds: 0, bombs: 0 });
  const handleWaveComplete = useCallback((waveScore: number, waveWords: string[], clearPct: number, collected?: { diamonds: number; bombs: number }) => {
    runCollectedRef.current = {
      diamonds: runCollectedRef.current.diamonds + (collected?.diamonds ?? 0),
      bombs: runCollectedRef.current.bombs + (collected?.bombs ?? 0),
    };
    const waveResult = buildWaveResult(currentWave, waveScore, waveWords.length, clearPct);
    setTotalScore(prev => prev + waveScore);
    setAllWordsFound(prev => [...prev, ...waveWords]);
    setWaveHistory(prev => [...prev, waveResult]);
    setLastWaveStats({ score: waveScore, words: waveWords.length, clearPct, diamonds: collected?.diamonds ?? 0 });
    setRunDiamonds(runCollectedRef.current.diamonds);
    checkpoint.recordWaveReached(currentWave);
    emitMascotEvent({ kind: 'wave-clear' });
    setPhase('waveTransition');
  }, [currentWave, checkpoint]);

  /** Board cleared — route through highlight phase */
  const handleHighlightStart = useCallback((_finalScore: number) => {
    setPhase('highlight');
  }, []);

  /** Game ended */
  const { addCoins } = useCoinContext();
  const coinsAwardedRef = useRef(false);
  const handleGameEnd = useCallback((resultsData: BlastResultsData) => {
    const mergedResults: BlastResultsData = {
      ...resultsData,
      finalScore: totalScore + resultsData.finalScore,
      diamondsCollected: runCollectedRef.current.diamonds + (resultsData.diamondsCollected ?? 0),
      bombsPopped: runCollectedRef.current.bombs + (resultsData.bombsPopped ?? 0),
      wordsFound: [...allWordsFound, ...resultsData.wordsFound],
      wavesCompleted: waveHistory.length,
      waveResults: [
        ...waveHistory,
        {
          waveNumber: currentWave,
          score: resultsData.finalScore,
          wordsFound: resultsData.wordsFound.length,
          clearPercentage: resultsData.clearPercentage,
        },
      ],
    };
    if (resultsData.sessionCoins !== undefined) {
      mergedResults.sessionCoins = resultsData.sessionCoins + totalWaveRewardCoins(waveHistory);
    }
    setResults(mergedResults);
    setPhase('results');

    // Empathy cue on wave-fail (clearPct < 90 = wave didn't pass): mascot pose +
    // gentle descending arpeggio. Both decorative — never block save flow.
    if ((resultsData.clearPercentage ?? 100) < 90) {
      emitMascotEvent({ kind: 'wave-fail' });
      playWaveFailArpeggio();
    }

    recordLocalBest(config.difficulty ?? 'medium', mergedResults.finalScore);

    // A run only ends on a failed wave, so it saves when it earned something: a cleared wave or the ad continue.
    const passedWave = (mergedResults.clearPercentage ?? 0) >= 90;
    const adWatched = mergedResults.adContinueUsed === true;
    if (passedWave || adWatched || mergedResults.wavesCompleted >= 1) {
      saveBlastResult(mergedResults, config.difficulty ?? 'medium', language).then(
        (patch) => {
          if (!patch) return;
          setResults((prev) => (prev ? { ...prev, ...patch } : prev));
        },
      );

      // Award coins earned this run (SP only, fire-and-forget)
      // ponytail: client-awarded from real word scores; move to server validation if cheating becomes a problem
      if (!coinsAwardedRef.current && (mergedResults.sessionCoins ?? 0) > 0) {
        coinsAwardedRef.current = true;
        try {
          addCoins(mergedResults.sessionCoins ?? 0, 'blast_legacy_earn', { wave: currentWave });
        } catch {
          // Coin award is decorative — swallow failures
        }
      }
    }

    // Canonical cross-mode funnel event. Without this PostHog only sees
    // game_started for blast (server-side blast_completed isn't on the unified
    // funnel), so blast appears to abandon at ~94%.
    const bestWord = mergedResults.wordsFound
      .slice()
      .sort((a, b) => b.length - a.length)[0] ?? '';
    trackBlastRunEnded({
      finalScore: mergedResults.finalScore,
      wavesCompleted: mergedResults.wavesCompleted,
      maxCombo: mergedResults.maxCombo ?? 0,
      clearPct: Math.round(mergedResults.clearPercentage ?? 0),
      wordCount: mergedResults.wordsFound.length,
      bestWordLength: bestWord.length,
      difficulty: config.difficulty ?? 'medium',
    });
  }, [totalScore, allWordsFound, waveHistory, currentWave, config.difficulty, language, addCoins]);

  /** Advance to next wave */
  const handleWaveAdvance = useCallback(() => {
    setCurrentWave(prev => {
      const next = prev + 1;
      // Snapshot pre-wave state with the post-completion totals — when this
      // wave fails, the retry restores us back to this exact moment.
      snapshotPreWave(next, totalScore, allWordsFound, waveHistory);
      return next;
    });
    gameKeyRef.current += 1;
    setPhase('playing');
  }, [snapshotPreWave, totalScore, allWordsFound, waveHistory]);

  const handleStart = useCallback(() => {
    setRunSeed(Math.floor(Math.random() * 1_000_000));
    setCurrentWave(1);
    setLivesRemaining(BLAST_MAX_LIVES);
    setRecordAtStart(checkpoint.checkpoint?.highestWave ?? 0);
    snapshotPreWave(1, 0, [], []);
    setPhase('playing');
  }, [snapshotPreWave, checkpoint.checkpoint]);

  const handleResume = useCallback(() => {
    setRunSeed(Math.floor(Math.random() * 1_000_000));
    const wave = checkpoint.resumeFromWave;
    setCurrentWave(wave);
    setLivesRemaining(BLAST_MAX_LIVES);
    setRecordAtStart(checkpoint.checkpoint?.highestWave ?? 0);
    snapshotPreWave(wave, 0, [], []);
    setPhase('playing');
  }, [checkpoint.resumeFromWave, checkpoint.checkpoint, snapshotPreWave]);

  /** Retry the failed wave — restore the pre-wave snapshot, keep retry-used flag. */
  const handleRetryWave = useCallback(() => {
    const snap = preWaveSnapshotRef.current;
    if (!snap) return;
    retryUsedRef.current = true;
    setResults(null);
    setTotalScore(snap.totalScore);
    setAllWordsFound(snap.allWordsFound);
    setWaveHistory(snap.waveHistory);
    setCurrentWave(snap.waveNumber);
    gameKeyRef.current += 1;
    setPhase('playing');
  }, []);

  const handleRetryDecline = useCallback(() => {
    setRetryDeclined(true);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setRunSeed(Math.floor(Math.random() * 1_000_000));
    setResults(null);
    setCurrentWave(1);
    setTotalScore(0);
    runCollectedRef.current = { diamonds: 0, bombs: 0 };
    setRunDiamonds(0);
    setAllWordsFound([]);
    setWaveHistory([]);
    setPregameBuff(null);
    setLivesRemaining(BLAST_MAX_LIVES);
    retryUsedRef.current = false;
    setRetryDeclined(false);
    preWaveSnapshotRef.current = null;
    gameKeyRef.current += 1;
    setPhase('ready');
  }, []);

  const handleQuit = useCallback(() => {
    router.push(`/${language}/`);
  }, [router, language]);

  // Guard the in-game quit / browser-back / Android hardware-back so an active
  // run isn't dropped silently (parity with singleplayer/daily).
  const exitGuard = useGameExitGuard({
    // Span the whole run — phase cycles playing→waveTransition→highlight→playing
    // each wave; gating on 'playing' alone would toggle the guard (and churn its
    // phantom-history entry) every wave and leave between-wave back unguarded.
    active:
      (phase === 'playing' || phase === 'waveTransition' || phase === 'highlight') &&
      (totalScore > 0 || allWordsFound.length > 0),
    onQuit: handleQuit,
    message: t('singlePlayer.quitConfirmMessage'),
  });

  /** Compute top-1 ranked moment for highlight phase playback */
  const highlightMoments = useMemo(() => {
    if (phase !== 'highlight') return [];
    const events = useHighlightStore.getState().events;
    return rankMoments(events).slice(0, 1);
  }, [phase]);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-neo-navy relative">
      {phase === 'ready' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <h1 className="text-4xl font-black uppercase text-white font-neo-display">
            {t('blast.ready.title')}
          </h1>
          <p className="text-sm text-white text-center max-w-xs">
            {t('blast.ready.subtitle')}
          </p>
          {checkpoint.checkpoint && checkpoint.resumeFromWave > 1 ? (
            <>
              <Button
                data-testid="resume-button"
                size="lg"
                onClick={handleResume}
                className="min-h-[56px] w-full max-w-xs font-black text-xl uppercase border-3 border-neo-black shadow-hard-lg bg-neo-lime text-neo-black hover:bg-neo-lime/90"
              >
                {t('blast.ready.resume', { wave: checkpoint.resumeFromWave })}
              </Button>
              <Button
                data-testid="play-button"
                size="sm"
                variant="ghost"
                onClick={handleStart}
                className="min-h-[40px] w-full max-w-xs font-bold text-sm uppercase text-white hover:text-white underline underline-offset-4 decoration-white/40 hover:bg-transparent"
              >
                {t('blast.ready.play')}
              </Button>
            </>
          ) : (
            <Button
              data-testid="play-button"
              size="lg"
              onClick={handleStart}
              className="min-h-[56px] w-full max-w-xs font-black text-xl uppercase border-3 border-neo-black shadow-hard-lg bg-neo-lime text-neo-black hover:bg-neo-lime/90"
            >
              {t('blast.ready.play')}
            </Button>
          )}
          {pregameBuff ? (() => {
            const BuffIcon = pregameBuff === 'shield' ? Shield : pregameBuff === 'bomb' ? Bomb : Zap;
            const tone = pregameBuff === 'shield' ? 'bg-neo-cyan' : pregameBuff === 'bomb' ? 'bg-neo-pink' : 'bg-neo-lime';
            return (
              <div
                data-testid="blast-claimed-buff-chip"
                className={`flex items-center gap-2 rounded-neo border-neo-thick border-black ${tone} px-4 py-2 font-neo-display text-sm font-black uppercase text-neo-navy shadow-hard`}
              >
                <BuffIcon className="h-4 w-4" strokeWidth={3} />
                <span>{t(`blast.pregameBuff.${pregameBuff}`)}</span>
                <span className="text-[10px] opacity-70">· {t(`blast.pregameBuff.${pregameBuff}Desc`)}</span>
              </div>
            );
          })() : hasRealAdProvider ? (
            <button
              type="button"
              data-testid="blast-claim-boost-button"
              onClick={() => setBuffModalOpen(true)}
              className="group relative flex items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-pink px-6 py-3 font-neo-display text-sm font-black uppercase tracking-wide text-neo-navy shadow-hard-lg transition-[transform,background-color,box-shadow] [@media(hover:hover)]:hover:scale-105 hover:bg-neo-pink-light active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed"
            >
              <Gift className="h-5 w-5 animate-neo-wobble" strokeWidth={3} />
              {t('blast.pregameBuff.claim')}
              <span className="absolute -top-2 -right-2 rounded-full border-2 border-black bg-neo-lime px-1.5 py-0.5 text-[9px] font-black uppercase text-neo-navy shadow-hard">
                {t('common.free', 'Free')}
              </span>
            </button>
          ) : null}
        </div>
      )}

      <BlastPregameBuffModal
        isOpen={buffModalOpen}
        onPick={(b) => { setPregameBuff(b); setBuffModalOpen(false); }}
        onSkip={() => setBuffModalOpen(false)}
        t={t}
      />

      {phase === 'playing' && (
        <>
          <BlastGame
            key={`game-${gameKeyRef.current}`}
            config={config}
            waveNumber={currentWave}
            waveConfig={enhancedWaveConfig}
            cumulativeScore={totalScore}
            initialBuff={pregameBuff}
            modifierScoreMultiplier={enhancedModifierScoreMultiplier}
            activeModifier={activeModifier}
            livesRemaining={livesRemaining + upgradeEffects.freeRecoveries}
            onConsumeLife={handleConsumeLife}
            onWaveComplete={handleWaveComplete}
            onGameEnd={handleGameEnd}
            onHighlightStart={handleHighlightStart}
            onQuit={exitGuard.requestExit}
            progress={hudProgress}
          />
          {/* Transient celebration: the mascot pops in on a reaction and
              auto-hides after a beat so it never sits over the score/HUD. When
              the player has muted it, the (dimmed) frame stays put so the
              unmute affordance remains reachable. */}
          <AdaptiveAnimatePresence>
            {(mascot.visible || !mascotPref.enabled) && (
              <AdaptiveMotion.div
                key="blast-mascot-hud"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                className={BLAST_MASCOT_SLOT_CLASS}
              >
                <BlastMascotHud
                  state={mascot.state}
                  enabled={mascotPref.enabled}
                  onToggle={mascotPref.toggle}
                />
              </AdaptiveMotion.div>
            )}
          </AdaptiveAnimatePresence>
          <ModeCoach mode="blast" />
        </>
      )}

      {phase === 'waveTransition' && (() => {
        const nextModifier = selectWaveModifier(runSeed, currentWave + 1);
        const lastWave = waveHistory[waveHistory.length - 1];
        return (
          <BlastWaveClear
            wave={currentWave}
            waveScore={lastWaveStats.score}
            words={lastWaveStats.words}
            clearPct={lastWaveStats.clearPct}
            reward={lastWave?.reward}
            runScoreBefore={totalScore - lastWaveStats.score}
            runCoinsBefore={totalWaveRewardCoins(waveHistory.slice(0, -1))}
            runDiamondsBefore={runDiamonds - lastWaveStats.diamonds}
            waveDiamonds={lastWaveStats.diamonds}
            recordWave={recordAtStart}
            autoContinueMs={autoContinueMs()}
            onContinue={handleWaveAdvance}
            nextExtra={nextModifier ? <BlastModifierBadge modifier={nextModifier} variant="banner" t={t} /> : null}
          />
        );
      })()}

      {phase === 'highlight' && highlightMoments.length > 0 && results && (
        <HighlightPlayer
          moments={highlightMoments}
          finalScore={totalScore + (results?.finalScore ?? 0)}
          onComplete={() => setPhase('results')}
        />
      )}

      {phase === 'results' && results && (() => {
        // Retry-on-loss eligibility: failed (clearPct < 90), past wave 1
        // (wave-1 retry has zero progress to preserve and is identical to
        // Play Again), have an ad provider, haven't already retried, and
        // player hasn't declined yet.
        const failedClearPct = results.clearPercentage ?? 0;
        const eligibleForRetry =
          failedClearPct < 90
          && currentWave > 1
          && hasRealAdProvider
          && !retryUsedRef.current
          && !retryDeclined
          && preWaveSnapshotRef.current != null;
        if (eligibleForRetry) {
          return (
            <BlastRetryWaveModal
              isOpen
              waveNumber={preWaveSnapshotRef.current!.waveNumber}
              clearPct={failedClearPct}
              onRetry={handleRetryWave}
              onDecline={handleRetryDecline}
              t={t}
            />
          );
        }
        return (
          <BlastResultsSummary
            results={results}
            t={t}
            onPlayAgain={handlePlayAgain}
            onQuit={handleQuit}
            onOpenStore={() => setShowStore(true)}
          />
        );
      })()}

      {showStore && (
        <BlastUpgradePanel
          onClose={() => setShowStore(false)}
          t={t}
          language={language}
          dir={language === 'he' ? 'rtl' : 'ltr'}
        />
      )}

      <ConfirmationDialog
        open={exitGuard.showConfirm}
        onOpenChange={exitGuard.setShowConfirm}
        title={t('singlePlayer.quitConfirmTitle')}
        description={t('singlePlayer.quitConfirmMessage')}
        confirmText={t('common.quit')}
        cancelText={t('common.cancel')}
        onConfirm={exitGuard.confirmQuit}
        variant="warning"
      />
    </div>
  );
}

export default BlastView;
