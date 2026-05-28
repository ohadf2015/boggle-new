'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Gift, Shield, Bomb, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { trackGameStart } from '@/utils/growthTracking';
import { trackBlastRunEnded } from '@/components/blast/legacy/utils/blastTelemetry';
import { useHasRealAdProvider } from '@/hooks/useHasRealAdProvider';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { BlastGame } from './BlastGame';
import { BlastResultsSummary } from './BlastResultsSummary';
import { BlastPregameBuffModal, type BlastPregameBuff } from './BlastPregameBuffModal';
import { BlastRetryWaveModal } from './BlastRetryWaveModal';
import { BlastMascotHud } from './BlastMascotHud';
import { HighlightPlayer } from './highlight/HighlightPlayer';
import { useBlastMascot } from '@/lib/blast/useBlastMascot';
import { useMascotEnabled } from '@/lib/blast/useMascotEnabled';
import { emitMascotEvent } from '@/lib/blast/mascotBus';
import { playWaveFailArpeggio } from '@/lib/blast/waveFailArpeggio';
import { useBlastCheckpoint } from './hooks/useBlastCheckpoint';
import { getWaveConfig, getWaveDistribution } from './utils/blastWaveConfig';
import { calculateEarnedStars } from './utils/blastStarCalculator';
import { resolveBlastConfig, type BlastPhase, type BlastResultsData, type WaveResult } from './types';
import { useHighlightStore } from '@/stores/highlightStore';
import { rankMoments } from '@/lib/blast/highlightScoring';
import type { Language } from '@/shared/types/game';
import { Button } from '@/components/ui/button';
import { saveBlastResult } from './utils/saveBlastResult';

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
  const [totalScore, setTotalScore] = useState(0);
  const [allWordsFound, setAllWordsFound] = useState<string[]>([]);
  const [waveHistory, setWaveHistory] = useState<WaveResult[]>([]);
  const [lastWaveStats, setLastWaveStats] = useState({ score: 0, words: 0, clearPct: 0 });

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

  // Apply wave-specific overrides.
  // `config` is memoized so BlastGame doesn't see a new object reference on
  // every BlastView render (e.g. phase flips, score ticks). A fresh config
  // prop would invalidate every downstream memo + effect dep that touches it.
  const waveConfig = getWaveConfig(currentWave);
  const config = useMemo(
    () => ({
      ...resolveBlastConfig((language as Language) || 'en', 'medium'),
      specialTileChance: waveConfig.specialTileChance,
      customDistribution: getWaveDistribution(waveConfig),
      // Always shrink — cleared cells stay empty so full board clear is achievable
      boardClearMode: 'shrink' as const,
    }),
    [language, waveConfig],
  );

  /** Wave completed — transition to next wave */
  const handleWaveComplete = useCallback((waveScore: number, waveWords: string[], clearPct: number) => {
    const waveResult: WaveResult = {
      waveNumber: currentWave,
      score: waveScore,
      wordsFound: waveWords.length,
      clearPercentage: clearPct,
    };
    setTotalScore(prev => prev + waveScore);
    setAllWordsFound(prev => [...prev, ...waveWords]);
    setWaveHistory(prev => [...prev, waveResult]);
    setLastWaveStats({ score: waveScore, words: waveWords.length, clearPct });
    checkpoint.recordWaveReached(currentWave);
    emitMascotEvent({ kind: 'wave-clear' });
    setPhase('waveTransition');
  }, [currentWave, checkpoint]);

  /** Board cleared — route through highlight phase */
  const handleHighlightStart = useCallback((_finalScore: number) => {
    setPhase('highlight');
  }, []);

  /** Game ended */
  const handleGameEnd = useCallback((resultsData: BlastResultsData) => {
    const mergedResults: BlastResultsData = {
      ...resultsData,
      finalScore: totalScore + resultsData.finalScore,
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
    setResults(mergedResults);
    setPhase('results');

    // Empathy cue on wave-fail (clearPct < 90 = wave didn't pass): mascot pose +
    // gentle descending arpeggio. Both decorative — never block save flow.
    if ((resultsData.clearPercentage ?? 100) < 90) {
      emitMascotEvent({ kind: 'wave-fail' });
      playWaveFailArpeggio();
    }

    // Save gate: only persist progress when player either passed the wave (>=90% clear)
    // or accepted the rewarded-ad continue offer. Wave-loss + ad declined = no DB write,
    // no PB upsert, no XP, no leaderboard. The PostHog telemetry below still fires for
    // funnel parity — that's analytics, not progress.
    const passedWave = (mergedResults.clearPercentage ?? 0) >= 90;
    const adWatched = mergedResults.adContinueUsed === true;
    if (passedWave || adWatched) {
      saveBlastResult(mergedResults, config.difficulty ?? 'medium', language).then(
        (patch) => {
          if (!patch) return;
          setResults((prev) => (prev ? { ...prev, ...patch } : prev));
        },
      );
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
  }, [totalScore, allWordsFound, waveHistory, currentWave, config.difficulty, language]);

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
    setCurrentWave(1);
    snapshotPreWave(1, 0, [], []);
    setPhase('playing');
  }, [snapshotPreWave]);

  const handleResume = useCallback(() => {
    const wave = checkpoint.resumeFromWave;
    setCurrentWave(wave);
    snapshotPreWave(wave, 0, [], []);
    setPhase('playing');
  }, [checkpoint.resumeFromWave, snapshotPreWave]);

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
    setResults(null);
    setCurrentWave(1);
    setTotalScore(0);
    setAllWordsFound([]);
    setWaveHistory([]);
    setPregameBuff(null);
    retryUsedRef.current = false;
    setRetryDeclined(false);
    preWaveSnapshotRef.current = null;
    gameKeyRef.current += 1;
    setPhase('ready');
  }, []);

  const handleQuit = useCallback(() => {
    router.push(`/${language}/`);
  }, [router, language]);

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
              data-testid="blast-claim-boost-button"
              onClick={() => setBuffModalOpen(true)}
              className="group relative flex items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-pink px-6 py-3 font-neo-display text-sm font-black uppercase tracking-wide text-neo-navy shadow-hard-lg transition-all hover:scale-105 hover:bg-neo-pink-light active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed"
            >
              <Gift className="h-5 w-5 animate-neo-wobble" strokeWidth={3} />
              {t('blast.pregameBuff.claim')}
              <span className="absolute -top-2 -right-2 rounded-full border-2 border-black bg-neo-lime px-1.5 py-0.5 text-[9px] font-black uppercase text-neo-navy shadow-hard">
                {t('common.free') || 'Free'}
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
            waveConfig={waveConfig}
            cumulativeScore={totalScore}
            initialBuff={pregameBuff}
            onWaveComplete={handleWaveComplete}
            onGameEnd={handleGameEnd}
            onHighlightStart={handleHighlightStart}
            onQuit={handleQuit}
          />
          <div className="absolute top-3 right-3 z-50">
            <BlastMascotHud
              state={mascot.state}
              enabled={mascotPref.enabled}
              onToggle={mascotPref.toggle}
            />
          </div>
        </>
      )}

      {phase === 'waveTransition' && (() => {
        const stars = calculateEarnedStars(
          Math.round(lastWaveStats.clearPct * config.gridSize * config.gridSize / 100),
          config.gridSize * config.gridSize,
        );
        return (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
            <AdaptiveMotion.h2
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-3xl font-black uppercase text-neo-cyan font-neo-display"
            >
              {t('blast.waveComplete', { wave: String(currentWave) }) || `Wave ${currentWave} Complete!`}
            </AdaptiveMotion.h2>

            {/* Stars */}
            <div className="flex gap-3">
              {[0, 1, 2].map(i => (
                <AdaptiveMotion.div
                  key={`star-${i}`}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.3 + i * 0.2 }}
                >
                  <Star className={`h-10 w-10 ${i < stars ? 'text-amber-400 fill-amber-400' : 'text-white fill-white/10'}`} />
                </AdaptiveMotion.div>
              ))}
            </div>

            <AdaptiveMotion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-white text-center space-y-1"
            >
              <p className="text-lg font-bold tabular-nums">{lastWaveStats.score} {t('common.points')}</p>
              <p className="text-sm">{lastWaveStats.words} {t('blast.wordsFound')} · {Math.round(lastWaveStats.clearPct)}% {t('blast.cleared')}</p>
            </AdaptiveMotion.div>

            <AdaptiveMotion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="w-full max-w-xs"
            >
              <Button
                data-testid="next-wave-button"
                size="lg"
                onClick={handleWaveAdvance}
                className="min-h-[56px] w-full font-black text-xl uppercase border-3 border-neo-black shadow-hard-lg bg-neo-cyan text-neo-black hover:bg-neo-cyan/90"
              >
                {t('blast.nextWave', { wave: currentWave + 1 })}
              </Button>
            </AdaptiveMotion.div>
          </div>
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
          />
        );
      })()}
    </div>
  );
}

export default BlastView;
