'use client';

/**
 * useWordForgeRun — Main state hook for Word Forge mode.
 *
 * Manages the full run lifecycle: start → play rounds → pick runes → boss → end.
 * Core loop: SPELL → PICK → REPEAT → BOSS → DIE/WIN
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchWithAuth } from '@/utils/authFetch';
import type { Language } from '@/types';
import type {
  WordForgeRunState,
  WordForgeProgress,
  RuneCard,
  RuneCardDef,
  WordScoreResult,
} from '@/types/wordForge';
import { scoreWord, getRoundTarget, isBossRound, getUnlockTier } from '@/lib/wordForge/scoring';
import { generateRuneOffering } from '@/lib/wordForge/runeCatalog';
import { generateWordForgeGrid } from '@/lib/wordForge/gridGenerator';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import {
  pickBossConstraint,
  getConstraintTimerDuration,
  getConstraintGridSize,
  getConstraintTargetMultiplier,
  isWordAllowedByConstraint,
} from '@/lib/wordForge/bossConstraints';

// ─── Initial State ─────────────────────────────────────────

function createInitialState(): WordForgeRunState {
  return {
    phase: 'idle',
    round: 0,
    maxRounds: 9,
    roundScore: 0,
    roundTarget: 0,
    totalScore: 0,
    timeRemaining: 60,
    timerDuration: 60,
    wordsThisRound: [],
    allWords: [],
    runes: [],
    maxRuneSlots: 5,
    bossConstraint: null,
    runeOffering: null,
    grid: [],
    gridSize: 5,
    bestWord: null,
    roundHistory: [],
    skipBonus: 0,
    bannedLetters: new Set(),
    runSeed: 0,
  };
}

// ─── Hook ──────────────────────────────────────────────────

/** Why a submitted word was bounced — surfaced so the player learns the rule. */
export type WordForgeRejectReason = 'duplicate' | 'constraint' | 'oath';

export interface WordForgeRejection {
  reason: WordForgeRejectReason;
  word: string;
  /** Monotonic so identical consecutive rejections still re-trigger feedback. */
  nonce: number;
}

export interface UseWordForgeRunReturn {
  state: WordForgeRunState;
  progress: WordForgeProgress | null;
  lastWordScore: WordScoreResult | null;
  lastRejection: WordForgeRejection | null;
  startRun: () => void;
  startRound: () => void;
  submitWord: (word: string) => void;
  continueToRunePick: () => void;
  pickRune: (runeDef: RuneCardDef, replaceIndex?: number) => void;
  skipRune: () => void;
  exitToMenu: () => void;
}

export function useWordForgeRun(language: Language = 'en'): UseWordForgeRunReturn {
  const [state, setState] = useState<WordForgeRunState>(createInitialState);
  const [progress, setProgress] = useState<WordForgeProgress | null>(null);

  // Latest active language, read inside callbacks without re-creating them.
  // Drives the per-language letter pool so Hebrew players get Hebrew tiles.
  const languageRef = useRef<Language>(language);
  languageRef.current = language;

  // Load progress from API on mount
  useEffect(() => {
    async function loadProgress() {
      try {
        const res = await fetchWithAuth('/api/word-forge/progress');
        if (res.ok) {
          const data = await res.json();
          if (data.success) setProgress(data.progress);
        }
      } catch {
        // Silent fail — progress is optional for gameplay
      }
    }
    loadProgress();
  }, []);
  const [lastWordScore, setLastWordScore] = useState<WordScoreResult | null>(null);
  const [lastRejection, setLastRejection] = useState<WordForgeRejection | null>(null);
  // Mirror latest state so submitWord can pre-validate (reject reason) outside
  // the setState updater, keeping the updater side-effect free.
  const stateRef = useRef(state);
  stateRef.current = state;
  const rejectNonceRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const comboRef = useRef(0);
  const lastWordTimeRef = useRef(0);
  const roundStartTimeRef = useRef(0);

  // Ref for saveRunResults so handleRoundEnd can call it without forward-reference
  const saveRunResultsRef = useRef<(finalState: WordForgeRunState) => void>(() => {});

  // ─── Round End Logic ───────────────────────────────────
  // Declared before startTimer to avoid forward-reference lint error

  const handleRoundEnd = useCallback((prev: WordForgeRunState): WordForgeRunState => {
    const passed = prev.roundScore >= prev.roundTarget;

    const roundResult = {
      round: prev.round,
      score: prev.roundScore,
      target: prev.roundTarget,
      passed,
      wordsFound: prev.wordsThisRound.length,
      bestWord: prev.bestWord?.word ?? '',
      bestWordScore: prev.bestWord?.score ?? 0,
      wasBossRound: prev.bossConstraint !== null,
      bossConstraintId: prev.bossConstraint?.def.id ?? null,
    };

    if (!passed) {
      // lastStand cursed rune: survive failed round but lose 2 rune slots
      const hasLastStand = prev.runes.some(r => r.def.id === 'lastStand');
      if (hasLastStand) {
        const newMaxSlots = Math.max(1, prev.maxRuneSlots - 2);
        const newRunes = prev.runes.slice(0, newMaxSlots);
        return {
          ...prev,
          phase: 'roundResult',
          timeRemaining: 0,
          maxRuneSlots: newMaxSlots,
          runes: newRunes,
          roundHistory: [...prev.roundHistory, { ...roundResult, passed: true }],
        };
      }

      // Run over — failed to hit target
      const finalState = {
        ...prev,
        phase: 'runOver' as const,
        timeRemaining: 0,
        roundHistory: [...prev.roundHistory, roundResult],
      };
      // Save async (don't block state update)
      setTimeout(() => saveRunResultsRef.current(finalState), 0);
      return finalState;
    }

    // Check if run is won (beat round 9)
    if (prev.round >= prev.maxRounds) {
      const finalState = {
        ...prev,
        phase: 'runOver' as const,
        timeRemaining: 0,
        roundHistory: [...prev.roundHistory, roundResult],
      };
      setTimeout(() => saveRunResultsRef.current(finalState), 0);
      return finalState;
    }

    // Brief round result phase before rune pick
    return {
      ...prev,
      phase: 'roundResult',
      timeRemaining: 0,
      roundHistory: [...prev.roundHistory, roundResult],
    };
  }, []);

  // ─── Timer ─────────────────────────────────────────────

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.phase !== 'playing') return prev;
        const next = prev.timeRemaining - 1;
        if (next <= 0) {
          // Time's up — stop timer FIRST, then resolve round
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return handleRoundEnd(prev);
        }
        return { ...prev, timeRemaining: next };
      });
    }, 1000);
  }, [stopTimer, handleRoundEnd]);

  // Cleanup timer on unmount
  useEffect(() => stopTimer, [stopTimer]);

  // ─── Start Run ─────────────────────────────────────────

  const startRun = useCallback(() => {
    comboRef.current = 0;
    const newState = createInitialState();
    newState.round = 1;
    newState.phase = 'playing';
    newState.roundTarget = getRoundTarget(1);
    newState.grid = pickRichestBoardClient(() => generateWordForgeGrid(5, languageRef.current), languageRef.current, 4);
    newState.timerDuration = 60;
    newState.timeRemaining = 60;
    newState.runSeed = Math.floor(Math.random() * 100000);
    roundStartTimeRef.current = Date.now();
    lastWordTimeRef.current = Date.now();
    setState(newState);
    setLastWordScore(null);
    startTimer();
  }, [startTimer]);

  // ─── Start Round (after pick or boss reveal) ──────────

  const startRound = useCallback(() => {
    setState(prev => {
      const constraintId = prev.bossConstraint?.def.id ?? null;
      const gridSize = getConstraintGridSize(constraintId);
      const timerDuration = getConstraintTimerDuration(constraintId);

      // Check for berserker rune — reduces timer to 40s
      const hasBerserker = prev.runes.some(r => r.def.id === 'berserker');
      const finalTimer = hasBerserker ? Math.min(timerDuration, 40) : timerDuration;

      // Check for timeWarp rune — adds 10s
      const hasTimeWarp = prev.runes.some(r => r.def.id === 'timeWarp');
      const withTimeWarp = hasTimeWarp ? finalTimer + 10 : finalTimer;

      // Check for bigGrid rune — 6x6 grid (HIGH-7)
      const hasBigGrid = prev.runes.some(r => r.def.id === 'bigGrid');
      const finalGridSize = hasBigGrid ? 6 : gridSize;

      // debtCollector cursed rune: start round at -30 (CRIT-3)
      const hasDebtCollector = prev.runes.some(r => r.def.id === 'debtCollector');
      const initialScore = (hasDebtCollector ? -30 : 0) + prev.skipBonus;

      return {
        ...prev,
        phase: 'playing',
        roundScore: initialScore,
        skipBonus: 0,
        wordsThisRound: [],
        bannedLetters: new Set(),
        grid: pickRichestBoardClient(() => generateWordForgeGrid(finalGridSize, languageRef.current), languageRef.current, 4),
        gridSize: finalGridSize,
        timerDuration: withTimeWarp,
        timeRemaining: withTimeWarp,
      };
    });
    comboRef.current = 0;
    roundStartTimeRef.current = Date.now();
    lastWordTimeRef.current = Date.now();
    setLastWordScore(null);
    startTimer();
  }, [startTimer]);

  // ─── Submit Word ───────────────────────────────────────

  const reject = useCallback((reason: WordForgeRejectReason, word: string) => {
    rejectNonceRef.current += 1;
    setLastRejection({ reason, word: word.toUpperCase(), nonce: rejectNonceRef.current });
  }, []);

  const submitWord = useCallback((word: string) => {
    // Pre-validate against the latest state so we can tell the player *why* a
    // word bounced instead of silently swallowing it (the #1 prototype smell).
    const cur = stateRef.current;
    if (cur.phase !== 'playing') return;

    const constraintId = cur.bossConstraint?.def.id ?? null;
    if (constraintId && !isWordAllowedByConstraint(constraintId, word)) {
      reject('constraint', word);
      return;
    }
    if (cur.wordsThisRound.includes(word.toUpperCase())) {
      reject('duplicate', word);
      return;
    }
    if (cur.bannedLetters.size > 0) {
      const upper = word.toUpperCase();
      for (const ch of upper) {
        if (cur.bannedLetters.has(ch)) {
          reject('oath', word);
          return;
        }
      }
    }

    setState(prev => {
      if (prev.phase !== 'playing') return prev;
      const constraintId = prev.bossConstraint?.def.id ?? null;

      const now = Date.now();
      const wordFindTime = (now - lastWordTimeRef.current) / 1000;
      lastWordTimeRef.current = now;

      // Combo tracking — reset if > 5 seconds between words
      if (wordFindTime > 5) comboRef.current = 0;
      else comboRef.current++;

      const context = {
        word: word.toUpperCase(),
        previousWord: prev.wordsThisRound.length > 0
          ? prev.wordsThisRound[prev.wordsThisRound.length - 1]
          : null,
        comboCount: comboRef.current,
        elapsedSeconds: (now - roundStartTimeRef.current) / 1000,
        wordFindTime,
        round: prev.round,
        isBossRound: prev.bossConstraint !== null,
        bossConstraintId: constraintId,
        grid: prev.grid,
        wordsThisRound: prev.wordsThisRound,
        allWordsThisRun: prev.allWords,
      };

      const result = scoreWord(prev.runes, context);
      setLastWordScore(result);

      const newRoundScore = prev.roundScore + result.totalScore;
      const newBestWord = (!prev.bestWord || result.totalScore > prev.bestWord.score)
        ? { word: result.word, score: result.totalScore }
        : prev.bestWord;

      // timeStarved cursed rune: -3s per word submitted (CRIT-3)
      const hasTimeStarved = prev.runes.some(r => r.def.id === 'timeStarved');
      const newTimeRemaining = hasTimeStarved
        ? Math.max(0, prev.timeRemaining - 3)
        : prev.timeRemaining;

      // oathOfSilence cursed rune: ban this word's letters for next word (CRIT-3)
      const hasOathOfSilence = prev.runes.some(r => r.def.id === 'oathOfSilence');
      const newBannedLetters = hasOathOfSilence
        ? new Set(word.toUpperCase().split(''))
        : prev.bannedLetters;

      const updated = {
        ...prev,
        roundScore: newRoundScore,
        totalScore: prev.totalScore + result.totalScore,
        wordsThisRound: [...prev.wordsThisRound, word.toUpperCase()],
        allWords: [...prev.allWords, word.toUpperCase()],
        bestWord: newBestWord,
        timeRemaining: newTimeRemaining,
        bannedLetters: newBannedLetters,
      };

      // HIGH-8: Early complete when target is hit
      if (newRoundScore >= prev.roundTarget) {
        // Stop timer (will be cleared by handleRoundEnd flow)
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return handleRoundEnd(updated);
      }

      // timeStarved: if timer hit 0 from penalty, end round
      if (newTimeRemaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return handleRoundEnd(updated);
      }

      return updated;
    });
  }, [handleRoundEnd, reject]);

  // ─── Continue from Round Result to Rune Pick ───────────

  const continueToRunePick = useCallback(() => {
    setState(prev => {
      if (prev.phase !== 'roundResult') return prev;
      const unlockTier = progress ? getUnlockTier(progress.totalXp) : 0;
      const equippedIds = prev.runes.map(r => r.def.id);
      const offering = generateRuneOffering(prev.round, unlockTier, equippedIds);
      return {
        ...prev,
        phase: 'pickRune',
        runeOffering: offering,
      };
    });
  }, [progress]);

  // ─── Advance to Next Round ─────────────────────────────
  // Declared before pickRune/skipRune to avoid forward-reference lint error

  const advanceToNextRound = useCallback((prev: WordForgeRunState): WordForgeRunState => {
    const nextRound = prev.round + 1;
    const boss = isBossRound(nextRound);

    // CRIT-4: Reset combo and timing refs between rounds
    comboRef.current = 0;
    roundStartTimeRef.current = Date.now();
    lastWordTimeRef.current = Date.now();

    if (boss) {
      // HIGH-3: Use run seed for deterministic-per-run but random-across-runs boss selection
      const constraint = pickBossConstraint(nextRound, prev.runSeed);
      const targetMult = getConstraintTargetMultiplier(constraint.id);
      return {
        ...prev,
        phase: 'bossReveal',
        round: nextRound,
        roundTarget: Math.round(getRoundTarget(nextRound) * targetMult),
        bossConstraint: { def: constraint },
      };
    }

    // CRIT-5: Non-boss rounds also go through bossReveal gate (with null constraint)
    // so the timer doesn't start before the player sees the grid.
    return {
      ...prev,
      phase: 'bossReveal',
      round: nextRound,
      roundScore: 0,
      roundTarget: getRoundTarget(nextRound),
      bossConstraint: null,
      wordsThisRound: [],
      bannedLetters: new Set(),
      grid: pickRichestBoardClient(() => generateWordForgeGrid(5, languageRef.current), languageRef.current, 4),
      gridSize: 5,
      timerDuration: 60,
      timeRemaining: 60,
    };
  }, []);

  // ─── Pick Rune ─────────────────────────────────────────

  const pickRune = useCallback((runeDef: RuneCardDef, replaceIndex?: number) => {
    stopTimer();
    setState(prev => {
      const newRune: RuneCard = {
        def: runeDef,
        instanceId: `run-${Date.now()}-${runeDef.id}`,
      };

      let newRunes: RuneCard[];
      if (replaceIndex !== undefined && replaceIndex >= 0 && replaceIndex < prev.runes.length) {
        // Replace existing rune
        newRunes = [...prev.runes];
        newRunes[replaceIndex] = newRune;
      } else if (prev.runes.length < prev.maxRuneSlots) {
        // Add to empty slot
        newRunes = [...prev.runes, newRune];
      } else {
        // Slots full and no replacement specified — shouldn't happen in UI
        return prev;
      }

      return advanceToNextRound({
        ...prev,
        runes: newRunes,
        runeOffering: null,
      });
    });
  }, [stopTimer, advanceToNextRound]);

  // ─── Skip Rune ─────────────────────────────────────────

  const skipRune = useCallback(() => {
    stopTimer();
    setState(prev => advanceToNextRound({ ...prev, runeOffering: null, skipBonus: 5 }));
  }, [stopTimer, advanceToNextRound]);

  // ─── Save Run Results ───────────────────────────────────

  // Wire ref so handleRoundEnd can call saveRunResults without forward-reference
  const saveRunResults = useCallback(async (finalState: WordForgeRunState) => {
    const won = finalState.round >= finalState.maxRounds &&
      finalState.roundHistory.every(r => r.passed);
    try {
      const res = await fetch('/api/word-forge/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          highestRound: finalState.round,
          totalWords: finalState.allWords.length,
          totalScore: finalState.totalScore,
          won,
          bestWord: finalState.bestWord?.word ?? '',
          bestWordScore: finalState.bestWord?.score ?? 0,
          runeIds: finalState.runes.map(r => r.def.id),
          roundHistory: finalState.roundHistory,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProgress(prev => prev ? {
            ...prev,
            totalXp: data.totalXp,
            unlockTier: data.unlockTier,
            highestRound: Math.max(prev.highestRound, finalState.round),
            totalRuns: prev.totalRuns + 1,
            runsWon: won ? prev.runsWon + 1 : prev.runsWon,
            bestRunScore: Math.max(prev.bestRunScore, finalState.totalScore),
          } : null);
        }
      }
    } catch {
      // Silent fail — run results are nice-to-have, not critical
    }
  }, []);
  saveRunResultsRef.current = saveRunResults;

  // ─── Exit to Menu ──────────────────────────────────────

  const exitToMenu = useCallback(() => {
    stopTimer();
    setState(createInitialState());
    setLastWordScore(null);
  }, [stopTimer]);

  // glassCannon note: its "miss = death" curse is redundant with normal behavior
  // (failed rounds always end the run). In v2 with retry mechanics, glassCannon
  // will prevent retries. For now it's intentionally a strong x2.

  return {
    state,
    progress,
    lastWordScore,
    lastRejection,
    startRun,
    startRound,
    submitWord,
    continueToRunePick,
    pickRune,
    skipRune,
    exitToMenu,
  };
}
