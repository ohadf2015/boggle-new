'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Delete, RotateCcw, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';
import { scoreWord } from '@/utils/dailyChallenge/wordWheelScoring';
import { classifyLetterCoverage } from '@/lib/wheelRush/letterCoverage';
import { wheelWordDir } from '@/lib/wheelRush/wordDirection';
import type { Language } from '@/types';
import { WheelRushCelebration, type WheelCelebration } from '@/components/multiplayer/WheelRushCelebration';
import { fireConfetti } from '@/utils/confettiUtils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { WordWheelEffect } from './WordWheelEffectsCanvas';
import WheelDisc from './wheel/WheelDisc';
import WheelCoachSlot from './wheel/WheelCoachSlot';
import { useWheelWordFx } from './wheel/useWheelWordFx';
import { useHoldToSubmit } from '@/hooks/useHoldToSubmit';
import { useWheelDragSpell } from '@/hooks/useWheelDragSpell';
import { useWordWheelKeyboard } from '@/hooks/useWordWheelKeyboard';
import { useEquippedCosmetic } from '@/hooks/useEquippedCosmetic';
import { trackGameEnd, trackGameStart, trackGrowthEvent } from '@/utils/growthTracking';
import { useExperiment } from '@/hooks/useExperiment';
import { useMPFTUEIdle } from '@/hooks/useMPFTUEIdle';
import { MPDragCoachmark } from '@/components/multiplayer/MPDragCoachmark';
import { liveVerdict } from '@/lib/wordWheel/liveVerdict';
import { claimPointer } from '@/lib/wordWheel/claimPointer';
import WordWheelRankLadder from './WordWheelRankLadder';
import WordWheelWordLine from './WordWheelWordLine';
import { useWordWheelSubmit, type LetterClear } from './useWordWheelSubmit';
import WordWheelFoundWords from './WordWheelFoundWords';
import WordWheelHud from './WordWheelHud';
import WordWheelLiveRanks from './WordWheelLiveRanks';
import { GameShell, ShellKeysCard, SHELL_MEDIA } from '@/components/game/shell';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { rankThresholds } from '@/lib/wordWheel/rankLadder';

// Score, list and cleared trail paint first; particles, audio and haptics follow the frame.
const afterPaint = (fn: () => void) => {
  if (typeof requestAnimationFrame === 'undefined') return fn();
  requestAnimationFrame(() => setTimeout(fn, 0));
};

// Haptic feedback for mobile — distinct patterns per interaction type
const haptic = (pattern: number | number[]) => {
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
};

export interface WordWheelGameResult { wordsFound: string[]; score: number; timeSeconds: number }

interface WordWheelGameProps {
  puzzle: WordWheelPuzzle;
  duration: number;
  onComplete: (result: WordWheelGameResult) => void;
  onValidateWord: (word: string) => Promise<boolean>;
  /** Synchronous dictionary answer (true/false when loaded, null when cold) so a release scores in-frame. */
  onQuickVerdict?: (word: string) => boolean | null;
  onEffect: (effect: WordWheelEffect) => void;
  language: string;
  paused?: boolean;
  /** Practice mode: suppress countdown timer + show manual "end practice" CTA. */
  practice?: boolean;
  /**
   * Suppress the practice coach tip without enabling practice
   * gameplay changes (timer off, etc.). Used by Quick Play arcade rounds.
   */
  hideModeCoach?: boolean;
  /**
   * Hide all competitive chrome — leaderboard fetch, rival pill, pass toasts,
   * the combo counter, and the game_started funnel event. Lets the practice
   * hub reuse the real wheel gameplay without the live-game social layer.
   */
  hideCompetitive?: boolean;
  /**
   * Caller-supplied rivals, replacing the daily-leaderboard fetch entirely.
   * Quick Play passes its ghost rivals here: the daily board is the wrong cohort
   * for a quick round (different puzzle, different duration). Supplying them
   * also re-enables the rival pill + pass toasts under `hideCompetitive`, which
   * otherwise switches the whole social layer off.
   */
  rivals?: RivalScore[];
  /** Fired with each accepted word + the running found list (practice goal tracking). */
  onWordFound?: (word: string, wordsFound: string[]) => void;
  /**
   * The puzzle date being played (YYYY-MM-DD). Drives which day's leaderboard
   * the live rival pill reads from — on a catch-up replay this must be the
   * PAST date, not today, or the player sees today's rivals on yesterday's
   * board. Defaults to today when omitted.
   */
  puzzleDate?: string;
  /** Current player id — filtered out of rivals so a replay can't show "you" as the player to beat. */
  currentPlayerId?: string | null;
  /** Current guest fingerprint — same self-filter for unauthenticated players. */
  currentGuestFingerprint?: string | null;
  /**
   * Fired when the player taps the in-HUD exit affordance. The Word Wheel had
   * no exit control at all (the player was trapped mid-game — worst under RTL,
   * where there was no top-nav back button to fall back on); the parent owns the
   * quit-confirm dialog + navigation. Omit to hide the button.
   */
  onExit?: () => void;
}


interface RivalScore {
  name: string;
  score: number;
  avatarImage: string | null;
  customAvatar: import('@/shared/types/customAvatar').CustomAvatarConfig | null;
  playerId: string | null;
  guestFingerprint: string | null;
}

const WordWheelGame: React.FC<WordWheelGameProps> = ({
  puzzle, duration, onComplete, onValidateWord, onQuickVerdict, onEffect, language, paused = false, practice = false,
  hideModeCoach = false,
  hideCompetitive = false, rivals: rivalsOverride, onWordFound,
  puzzleDate, currentPlayerId = null, currentGuestFingerprint = null, onExit,
}) => {
  const { t } = useLanguage();
  const inShell = useMediaQuery(SHELL_MEDIA);
  // `useReducedMotion` returns `true` when the user has set the OS-level
  // reduced-motion preference; we gate the breathing/pulse loops on it
  // (WCAG 2.3.3) but leave functional feedback animations (tap, success) intact.
  const prefersReducedMotion = useReducedMotion() ?? false;
  // Builder direction follows the letters on screen, not the UI locale, so a
  // Hebrew wheel reads RTL even for an English-UI player. See wheelWordDir.
  const wordDir = useMemo(() => wheelWordDir(puzzle.allLetters, language as Language), [puzzle.allLetters, language]);
  const {
    playTileSelectSound, playWordAcceptedSound, playWordRejectedSound,
    playComboSound, playLegendaryWordSound, playEpicVictorySound,
    playCountdownBeep, playButtonClickSound,
    playWordLengthSound,
  } = useSoundEffects();

  // Built word: array of { letter, wheelIndex } — wheelIndex: -1 = center
  const [builtLetters, setBuiltLetters] = useState<Array<{ letter: string; wheelIndex: number }>>([]);
  const [wordsFound, setWordsFound] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const outerLetters = puzzle.outerLetters;
  const { fx, fire: fireFx, release, hold: holdRelease, drop: dropRelease } = useWheelWordFx();
  const [lastWordScore, setLastWordScore] = useState<number | null>(null);
  // Monotonic id for the flying "+score" element's key. Using Date.now() here
  // recomputed the key on every render, remounting the element (and restarting
  // its 1.2s fly animation) whenever anything else re-rendered mid-flight.
  const [scoreFlyId, setScoreFlyId] = useState(0);
  const [combo, setCombo] = useState(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wordBuilderShake, setWordBuilderShake] = useState(false);
  const [lastFoundWord, setLastFoundWord] = useState<string | null>(null);
  // "You used the whole wheel" banner — fires when an accepted word covers all
  // (or all-but-one) distinct wheel letters. Single keyed state so a second
  // pangram replaces (re-animates) rather than stacks.
  const [celebration, setCelebration] = useState<WheelCelebration | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // exp-wordwheel-drag-hint-v1: the drag arm surfaces the "swipe to spell"
  // coachmark after a short idle (the wheel rage-click root cause). Reuses the
  // shared idle-FTUE + MP drag coachmark; auto-suppresses once a word is found.
  const { variant: dragHintVariant, trackExposure: trackDragHintExposure } =
    useExperiment('exp-wordwheel-drag-hint-v1');
  useEffect(() => {
    trackDragHintExposure();
  }, [trackDragHintExposure]);
  const dragHintFtue = useMPFTUEIdle({
    enabled: dragHintVariant === 'drag-hint',
    wordsFound: wordsFound.length,
    idleMs: 6000,
    storageKey: 'ww_ftue_drag_v1',
    onShown: () => trackGrowthEvent('wordwheel_drag_hint_shown', { variant: dragHintVariant }),
  });

  const gameOverRef = useRef(false);
  const wordsFoundRef = useRef<string[]>([]);
  const scoreRef = useRef(0);
  const timeWarningFiredRef = useRef(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const idleSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True when handleSubmit was triggered by a drag-release (vs tap/idle/double-tap).
  // Drag-mode users already lifted, so a wrong word should clear immediately
  // instead of waiting through the read-toast window.
  const lastSubmitWasDragRef = useRef(false);

  // ── Live leaderboard rivals (snapshot on mount + refresh every 30s) ──
  const [fetchedRivals, setFetchedRivals] = useState<RivalScore[]>([]);
  const rivals = rivalsOverride ?? fetchedRivals;
  // The rival layer (pill + pass toasts) is on whenever there is a cohort to
  // race — either the daily board, or one the caller handed us.
  const showRivalLayer = !hideCompetitive || !!rivalsOverride;
  const [passToasts, setPassToasts] = useState<Array<{ id: number; name: string }>>([]);
  const passedNamesRef = useRef<Set<string>>(new Set());
  const passToastIdRef = useRef(0);

  useEffect(() => {
    // Caller-supplied cohort short-circuits the daily board entirely.
    if (hideCompetitive || rivalsOverride) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    const fetchRivals = async () => {
      try {
        // Scope to the day being played, not always today — on a catch-up replay
        // `puzzleDate` is a past date and today's board would be the wrong rivals.
        const date = puzzleDate || new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/daily-challenge/word-wheel/leaderboard/${date}/${language}?limit=100`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const list: RivalScore[] = (json.data || [])
          .filter((r: { score?: number; display_name?: string }) => typeof r.score === 'number' && r.display_name)
          .map((r: { score: number; display_name: string; avatar_image?: string | null; custom_avatar?: import('@/shared/types/customAvatar').CustomAvatarConfig | null; player_id?: string | null; guest_fingerprint?: string | null }) => ({
            name: r.display_name,
            score: r.score,
            avatarImage: r.avatar_image ?? null,
            customAvatar: r.custom_avatar ?? null,
            playerId: r.player_id ?? null,
            guestFingerprint: r.guest_fingerprint ?? null,
          }))
          // Never surface the current player as their own rival. On a replay the
          // player's prior score already sits on that day's board, so without this
          // they'd see themselves in the "player to beat" pill.
          .filter((r: RivalScore) => {
            if (currentPlayerId) return r.playerId !== currentPlayerId;
            if (currentGuestFingerprint) return r.guestFingerprint !== currentGuestFingerprint;
            return true;
          })
          .sort((a: RivalScore, b: RivalScore) => a.score - b.score);
        setFetchedRivals(list);
      } catch { /* leaderboard is best-effort */ }
    };
    const startPolling = () => {
      if (interval) return;
      interval = setInterval(fetchRivals, 60_000);
    };
    const stopPolling = () => {
      if (interval) { clearInterval(interval); interval = null; }
    };
    const handleVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        stopPolling();
      } else {
        void fetchRivals();
        startPolling();
      }
    };
    void fetchRivals();
    startPolling();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }
    return () => {
      cancelled = true;
      stopPolling();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [language, hideCompetitive, rivalsOverride, puzzleDate, currentPlayerId, currentGuestFingerprint]);

  useEffect(() => { wordsFoundRef.current = wordsFound; }, [wordsFound]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // Funnel parity: emit game_started once on mount to pair with trackGameEnd('word-wheel', ...).
  // Practice hub (hideCompetitive) is outside the daily funnel, so it stays silent.
  useEffect(() => {
    if (!hideCompetitive) trackGameStart('word-wheel', { language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect newly-passed rivals when score changes — queue toasts so multiple
  // simultaneous passes (combo + pangram) all celebrate, plus mini-celebration
  // burst (combo-flash particles + sound + haptic).
  useEffect(() => {
    if (!showRivalLayer || !rivals.length) return;
    const cx = gameContainerRef.current
      ? gameContainerRef.current.getBoundingClientRect().width / 2
      : 200;
    let staggerIndex = 0;
    for (const r of rivals) {
      if (r.score > 0 && r.score <= score && !passedNamesRef.current.has(r.name)) {
        passedNamesRef.current.add(r.name);
        const id = ++passToastIdRef.current;
        // Stagger each pass slightly so the toasts don't pile up at the exact
        // same y-offset.
        const delay = staggerIndex * 250;
        staggerIndex += 1;
        setTimeout(() => {
          setPassToasts(prev => [...prev, { id, name: r.name }]);
          haptic([15, 25, 15, 25, 30]);
          playComboSound(2);
          onEffect({ type: 'combo', x: cx, y: 140, combo: 2 });
          setTimeout(
            () => setPassToasts(prev => prev.filter(t => t.id !== id)),
            2400,
          );
        }, delay);
      }
    }
  }, [score, rivals, onEffect, playComboSound, showRivalLayer]);

  // ── Drag-to-build support ── (handlers wired after handleLetterPress via the
  // shared useWheelDragSpell hook). Only the pointer-position / dragging refs
  // (also read by the Pixi ring + useHoldToSubmit) live here; the drag-state
  // refs are encapsulated inside the hook.
  const draggingRef = useRef(false);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const [pendingLetter, setPendingLetter] = useState<string | null>(null);

  // ── Double-tap-to-submit support ──
  const lastTapRef = useRef<{ idx: number; time: number } | null>(null);
  const handleSubmitRef = useRef<() => void>(() => {});
  const DOUBLE_TAP_MS = 280;

  // Track which wheel indices are used in current word
  const usedIndices = useMemo(() => {
    const set = new Set<number>();
    for (const bl of builtLetters) set.add(bl.wheelIndex);
    return set;
  }, [builtLetters]);

  // Refs mirroring builtLetters / usedIndices for stable callbacks
  const builtLettersRef = useRef(builtLetters);
  const usedIndicesRef = useRef(usedIndices);
  useEffect(() => { builtLettersRef.current = builtLetters; }, [builtLetters]);
  useEffect(() => { usedIndicesRef.current = usedIndices; }, [usedIndices]);

  // Auto-submit after 1s idle (or instantly on drag-release; see handlePointerUp).
  // Any change to builtLetters also cancels a pending post-error auto-reset
  // (so a new tap during the 2.5s reset window doesn't get wiped mid-typing).
  const prevBuiltLengthRef = useRef(0);
  useEffect(() => {
    if (idleSubmitTimerRef.current) { clearTimeout(idleSubmitTimerRef.current); idleSubmitTimerRef.current = null; }
    if (autoResetTimerRef.current) { clearTimeout(autoResetTimerRef.current); autoResetTimerRef.current = null; }
    // A removal is an edit in progress: auto-submitting it made players race the timer with backspace.
    const grew = builtLetters.length > prevBuiltLengthRef.current;
    prevBuiltLengthRef.current = builtLetters.length;
    if (grew && builtLetters.length >= 3 && !gameOverRef.current) {
      idleSubmitTimerRef.current = setTimeout(() => {
        idleSubmitTimerRef.current = null;
        // Mid-drag the release submits; firing here split a slow swipe into a half word.
        if (draggingRef.current) return;
        handleSubmitRef.current();
      }, 1000);
    }
    return () => { if (idleSubmitTimerRef.current) { clearTimeout(idleSubmitTimerRef.current); idleSubmitTimerRef.current = null; } };
  }, [builtLetters]);

  useEffect(() => () => {
    if (autoResetTimerRef.current) { clearTimeout(autoResetTimerRef.current); autoResetTimerRef.current = null; }
  }, []);

  // Show the wheel-coverage banner and auto-clear it. 'all' rides the dormant
  // Pixi `pangram` mega-burst (fired via onEffect in handleSubmit); 'almost' has
  // no canvas show, so it gets a light DOM confetti pop instead. fireConfetti
  // self-gates on reduced-motion / cosy-calm / low-end devices.
  const triggerFeatBanner = useCallback((tier: 'all' | 'almost', word: string, points: number) => {
    setCelebration({ tier, word, key: Date.now(), points });
    if (tier === 'almost') {
      fireConfetti({ particleCount: 36, spread: 80, startVelocity: 50, origin: { y: 0.5 } });
    }
    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    celebrationTimerRef.current = setTimeout(() => {
      celebrationTimerRef.current = null;
      setCelebration(null);
    }, 1900);
  }, []);
  useEffect(() => () => {
    if (celebrationTimerRef.current) { clearTimeout(celebrationTimerRef.current); celebrationTimerRef.current = null; }
  }, []);

  const builtWord = useMemo(
    () => builtLetters.map(bl => bl.letter).join(''),
    [builtLetters],
  );

  // Timer — suppressed in practice mode (no countdown, no auto-complete).
  // Player ends the run via the manual "End practice" CTA below.
  useEffect(() => {
    if (gameOverRef.current || paused || practice) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          gameOverRef.current = true;
          onEffect({ type: 'gameComplete', score: scoreRef.current });
          playEpicVictorySound();
          trackGameEnd(
            'word-wheel',
            scoreRef.current,
            wordsFoundRef.current.length,
            true,
            duration,
            { isWinner: wordsFoundRef.current.length > 0 }
          );
          onComplete({
            wordsFound: wordsFoundRef.current,
            score: scoreRef.current,
            timeSeconds: duration,
          });
          return 0;
        }
        // Time warning at 10 seconds
        if (prev === 11 && !timeWarningFiredRef.current) {
          timeWarningFiredRef.current = true;
          onEffect({ type: 'timeWarning' });
        }
        // Countdown beeps + visual urgency in final 10 seconds
        if (prev <= 10) {
          playCountdownBeep(prev - 1);
          onEffect({ type: 'timeTick', secondsLeft: prev - 1 });
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [duration, onComplete, onEffect, playEpicVictorySound, playCountdownBeep, paused, practice]);

  // Practice-mode end CTA: player taps to wrap up the run with current state.
  // Mirrors the natural timer-end onComplete payload so downstream results UI
  // doesn't need a special practice branch.
  const handleEndPractice = useCallback(() => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    onComplete({
      wordsFound: wordsFoundRef.current,
      score: scoreRef.current,
      timeSeconds: 0,
    });
  }, [onComplete]);

  // ── Feedback toast ──
  // Errors hold the toast longer (2500ms) and auto-reset the built word at the
  // same moment, so the player sees *why* it failed and the wheel clears for a
  // fresh attempt without needing the manual reset button. New input within
  // the window cancels the auto-reset (see builtLetters effect above).
  const showFeedback = useCallback((message: string, type: 'success' | 'error', clear: LetterClear = 'later', spelledWord?: { letter: string; wheelIndex: number }[]) => {
    setFeedback({ message, type });
    const toastDuration = type === 'error' ? 1500 : 1500;
    setTimeout(() => setFeedback(null), toastDuration);
    if (type === 'error') {
      const spelled = spelledWord ?? builtLettersRef.current;
      if (spelled.length > 0) {
        fireFx({ kind: 'bad', indices: spelled.map(bl => bl.wheelIndex), letters: spelled.map(bl => bl.letter), points: 0 });
      }
      setWordBuilderShake(true);
      haptic([30, 50, 30]);
      setTimeout(() => setWordBuilderShake(false), 400);
      if (idleSubmitTimerRef.current) {
        clearTimeout(idleSubmitTimerRef.current);
        idleSubmitTimerRef.current = null;
      }
      if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
      // Drag-mode submits clear instantly so the next stroke isn't blocked;
      // tap/idle submits wait 1.5s so the player can see what was wrong.
      if (clear === 'now') {
        builtLettersRef.current = [];
        setBuiltLetters([]);
      } else if (clear === 'later') {
        autoResetTimerRef.current = setTimeout(() => {
          autoResetTimerRef.current = null;
          builtLettersRef.current = [];
          setBuiltLetters([]);
        }, 1500);
      }
    }
  }, [fireFx]);

  // Shared add path — used by tap-add (handleLetterPress) and by the eager-add
  // on hold-to-submit pointerdown. Writes builtLettersRef synchronously (in the
  // same tick as setBuiltLetters) so the drag-engage guard in tryDragHit can
  // read the updated value before the useEffect ref-mirror flushes.
  const addLetter = useCallback((letter: string, wheelIndex: number, el: HTMLButtonElement) => {
    builtLettersRef.current = [...builtLettersRef.current, { letter, wheelIndex }];
    setBuiltLetters(prev => [...prev, { letter, wheelIndex }]);
    playTileSelectSound();
    haptic(10);
    // Element position for particle effect
    const rect = el.getBoundingClientRect();
    const containerRect = gameContainerRef.current?.getBoundingClientRect();
    if (containerRect) {
      onEffect({
        type: 'letterTap',
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
      });
    }
  }, [onEffect, playTileSelectSound]);

  // ── Hold-to-submit ── press-and-hold a wheel letter once the word is already
  // at the minimum length (3) to auto-submit. Unused held letters are
  // eager-added on pointerdown so the held letter is part of the submitted
  // word. The 1s idle auto-submit (above) still covers passive submission.
  const {
    holdingIndex: holdActiveIndex,
    onLetterPointerDown: holdPointerDown,
    onLetterPointerEnd: holdPointerEnd,
    cancelHold: holdCancel,
    shouldSuppressClick: holdSuppressClick,
    getEagerAddedIndex: holdGetEagerAdded,
  } = useHoldToSubmit({
    minLength: 3,
    builtLettersRef,
    usedIndicesRef,
    draggingRef,
    gameOverRef,
    addLetter,
    submit: () => handleSubmitRef.current(),
    haptic,
  });

  // ── Letter tap (toggle: add if unused, remove matching if already used;
  //    double-tap within DOUBLE_TAP_MS submits the built word) ──
  const handleLetterPress = useCallback((letter: string, wheelIndex: number, el: HTMLButtonElement) => {
    // Any wheel interaction resets the drag-hint idle timer / hides it if shown.
    dragHintFtue.markActivity();
    // A just-completed hold gesture (or eager-add) swallows its trailing onClick.
    if (holdSuppressClick()) return;
    if (gameOverRef.current) return;
    const now = Date.now();
    const last = lastTapRef.current;
    const isDoubleTap = last && last.idx === wheelIndex && now - last.time < DOUBLE_TAP_MS;
    const current = builtLettersRef.current;
    const existingIdx = current.findIndex(bl => bl.wheelIndex === wheelIndex);

    // Double-tap on a letter already in the word → submit (keep the letter).
    if (isDoubleTap && existingIdx !== -1) {
      lastTapRef.current = null;
      handleSubmitRef.current();
      return;
    }

    if (existingIdx !== -1) {
      setBuiltLetters(prev => prev.filter((_, i) => i !== existingIdx));
      builtLettersRef.current = builtLettersRef.current.filter((_, i) => i !== existingIdx);
      playButtonClickSound();
      haptic(8);
      lastTapRef.current = { idx: wheelIndex, time: now };
      return;
    }
    addLetter(letter, wheelIndex, el);
    lastTapRef.current = { idx: wheelIndex, time: now };
  }, [addLetter, holdSuppressClick, playButtonClickSound, dragHintFtue]);

  // ── Drag-to-build handlers (additive only — skips letters already used) ──
  // Shared with the practice wheel sandbox via useWheelDragSpell. Drag only
  // engages once the pointer moves to a DIFFERENT letter than the start, so
  // single taps stay handled by the button's native onClick (preserving
  // double-tap-to-submit). onEngage aborts any in-flight hold ring and skips
  // re-adding a letter the hold already eager-added.
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useWheelDragSpell({
    draggingRef,
    pointerPosRef,
    // No hubIndex: the center letter joins a drag the instant the finger
    // reaches it, exactly like the outer letters (players reported the
    // deferred "rest on the hub" pass-through as the center letter not working).
    isIndexUsed: (i) => usedIndicesRef.current.has(i),
    addLetter: (i, letter, el) => handleLetterPress(letter, i, el),
    getBuiltLength: () => builtLettersRef.current.length,
    submit: () => handleSubmitRef.current(),
    onEngage: (startIdx) => {
      const eagerIdx = holdGetEagerAdded();
      holdCancel();
      return eagerIdx !== startIdx;
    },
    onBeforeDragSubmit: () => { lastSubmitWasDragRef.current = true; },
    cancelPendingSubmit: () => {
      if (idleSubmitTimerRef.current) { clearTimeout(idleSubmitTimerRef.current); idleSubmitTimerRef.current = null; }
    },
  });

  // ── Remove built letter ──
  const handleRemoveLetter = useCallback((index: number) => {
    setBuiltLetters(prev => prev.filter((_, i) => i !== index));
    playButtonClickSound();
  }, [playButtonClickSound]);

  // ── Clear all ──
  const handleClear = useCallback(() => {
    builtLettersRef.current = [];
    setBuiltLetters([]);
    playButtonClickSound();
  }, [playButtonClickSound]);

  // ── Remove last letter (backspace) ──
  // Replaces the old shuffle button. Pairs with Clear (wipe all): a single-step
  // undo of the most recent letter. Parity with MP Wheel Rush controls.
  const handleBackspace = useCallback(() => {
    setBuiltLetters(prev => prev.slice(0, -1));
    playButtonClickSound();
  }, [playButtonClickSound]);

  // ── Accept a word (score, list, effects) ──
  const acceptWord = useCallback((word: string, spelled: { letter: string; wheelIndex: number }[]) => {
    const cx = gameContainerRef.current
      ? gameContainerRef.current.getBoundingClientRect().width / 2
      : 200;
    const points = scoreWord(word);
    const nextWordsFound = [...wordsFoundRef.current, word];
    wordsFoundRef.current = nextWordsFound;
    setWordsFound(nextWordsFound);
    // Surface progress to the practice shell (goal tracking) — fires for
    // every accepted word, competitive or practice.
    onWordFound?.(word, nextWordsFound);
    setScore(prev => prev + points);
    // Wheel-coverage feat: 'all' = used every distinct wheel letter (a true
    // wheel pangram — the old `length >= 9` check was dead code since a
    // 7-letter wheel caps words at 7 chars); 'almost' = all-but-one.
    const wheelLetters = puzzle.allLetters ?? [puzzle.centerLetter, ...puzzle.outerLetters];
    const coverage = classifyLetterCoverage(word, wheelLetters);
    const isAllLetters = coverage === 'all';
    fireFx({ kind: 'good', indices: spelled.map(bl => bl.wheelIndex), letters: spelled.map(bl => bl.letter), points, coverage });
    setLastWordScore(points);
    setScoreFlyId(id => id + 1);
    setTimeout(() => setLastWordScore(null), 1200);
    showFeedback(`+${points}`, 'success');
    if (builtLettersRef.current.map(bl => bl.letter).join('').toUpperCase() === word) {
      builtLettersRef.current = [];
      setBuiltLetters([]);
    }
    setLastFoundWord(word);
    setTimeout(() => setLastFoundWord(null), 2000);

    // Combo tracker — resets after 5s of inactivity
    const hadActiveCombo = comboTimerRef.current !== null;
    if (comboTimerRef.current) { clearTimeout(comboTimerRef.current); comboTimerRef.current = null; }
    const newCombo = hadActiveCombo ? combo + 1 : 1;
    setCombo(newCombo);
    comboTimerRef.current = setTimeout(() => { setCombo(0); comboTimerRef.current = null; }, 5000);

    afterPaint(() => {
      // Sound + haptic feedback
      if (isAllLetters) {
        playLegendaryWordSound();
        haptic([50, 30, 50, 30, 80]);
      } else {
        playWordAcceptedSound();
        if (word.length >= 5) {
          playWordLengthSound(word.length);
        }
        haptic(newCombo >= 2 ? [15, 30, 15, 30, 15] : 20);
      }
      if (newCombo >= 2) {
        playComboSound(newCombo);
      }

      // Trigger celebration effects — 'all' unlocks the 4-wave Pixi pangram
      // spectacular; everything else gets the standard word burst.
      if (isAllLetters) {
        onEffect({ type: 'pangram', x: cx, y: 200 });
      } else {
        onEffect({ type: 'wordValid', x: cx, y: 200, points });
      }
      // Combo milestone effect
      if (newCombo >= 2) {
        onEffect({ type: 'combo', x: cx, y: 160, combo: newCombo });
      }
    });

    // Headline banner for full / near-full wheel coverage.
    if (coverage !== 'none') {
      triggerFeatBanner(coverage, word, points);
    }
  }, [puzzle, showFeedback, onEffect, combo, playWordAcceptedSound, playLegendaryWordSound, playComboSound, playWordLengthSound, triggerFeatBanner, onWordFound, fireFx]);

  const rejectWord = useCallback((message: string, clear: LetterClear, spelled: { letter: string; wheelIndex: number }[]) => {
    const cx = gameContainerRef.current
      ? gameContainerRef.current.getBoundingClientRect().width / 2
      : 200;
    showFeedback(message, 'error', clear, spelled);
    afterPaint(() => {
      onEffect({ type: 'error', x: cx, y: 80 });
      playWordRejectedSound();
    });
  }, [showFeedback, onEffect, playWordRejectedSound]);

  const { handleSubmit, pendingWord, isValidating } = useWordWheelSubmit({
    puzzle, t, builtLettersRef, setBuiltLetters, wordsFoundRef, gameOverRef, lastSubmitWasDragRef,
    onValidateWord, onQuickVerdict, accept: acceptWord, reject: rejectWord,
    hold: (r) => flushSync(() => holdRelease(r)), drop: dropRelease,
  });

  // Keep submit ref fresh so double-tap handler (created earlier) can reach the latest closure.
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  // ── Keyboard input ──
  useWordWheelKeyboard({
    centerLetter: puzzle.centerLetter, outerLetters, usedIndices,
    handleSubmit, handleClear, setBuiltLetters,
    gameOver: gameOverRef.current, playTileSelectSound, playButtonClickSound,
  });

  const equippedBoardTheme = useEquippedCosmetic('boardTheme');
  const equippedTileSkin = useEquippedCosmetic('tileSkin');
  const thresholds = useMemo(() => rankThresholds(practice ? 120 : duration), [practice, duration]);

  const hud = (
    <WordWheelHud
      t={t}
      timeLeft={timeLeft}
      duration={duration}
      combo={combo}
      showCombo={!hideCompetitive}
      practice={practice}
      onEndPractice={handleEndPractice}
      onExit={onExit}
      className={inShell ? undefined : 'pe-12 sm:pe-0'}
    />
  );

  const ladder = (
    <WordWheelRankLadder
      t={t}
      score={score}
      thresholds={thresholds}
      rivals={rivals}
      showRival={showRivalLayer}
      variant={inShell ? 'wide' : 'bar'}
    />
  );

  const foundWords = (
    <WordWheelFoundWords
      t={t}
      words={wordsFound}
      lastFound={lastFoundWord}
      variant={inShell ? 'panel' : 'strip'}
      reducedMotion={prefersReducedMotion}
    />
  );

  // Wheel cluster JSX (word line + wheel + action-bar; phone adds the HUD, ladder and words above)
  const wheelCluster = (
    <>

      {practice && !hideModeCoach && <WheelCoachSlot wordsFound={wordsFound.length} />}


      <div className="w-full flex flex-col gap-3 shell:gap-4 shrink-0">
        {hud}
        {ladder}
        {!inShell && <div className="w-full shell:hidden">{foundWords}</div>}
      </div>

      {showRivalLayer && (
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-1.5">
        <AnimatePresence>
          {passToasts.map((toast, i) => (
            <m.div
              key={toast.id}
              className="px-3 py-1.5 rounded-neo border-3 border-neo-black bg-linear-to-r from-neo-pink to-neo-purple text-neo-white font-neo-display font-black text-sm shadow-[3px_3px_0px_black,0_0_18px_rgba(255,20,147,0.6)] flex items-center gap-1.5 whitespace-nowrap"
              initial={{ opacity: 0, y: -20, scale: 0.6 }}
              animate={{ opacity: 1, y: i * 4, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.7 }}
              transition={prefersReducedMotion
                ? { duration: 0.2 }
                : { type: 'spring', stiffness: 500, damping: 18 }
              }
            >
              <TrendingUp className="w-4 h-4" />
              {t('wordWheel.passedPlayer', { name: toast.name })}
            </m.div>
          ))}
        </AnimatePresence>
      </div>
      )}

      {/* Word line + wheel + actions centre together in the leftover height. */}
      <div className="@container/wheel [container-type:size] flex-1 flex flex-col items-center justify-center w-full min-h-0 gap-2 py-1 short:gap-0.5 short:py-0" data-testid="wheel-cluster">
      <WordWheelWordLine
        t={t}
        letters={builtLetters}
        centerLetter={puzzle.centerLetter}
        allLetters={puzzle.allLetters ?? [puzzle.centerLetter, ...puzzle.outerLetters]}
        dir={wordDir}
        onRemove={handleRemoveLetter}
        onSubmit={handleSubmit}
        isValidating={isValidating}
        pendingWord={pendingWord}
        shake={wordBuilderShake}
        feedback={feedback}
        acceptedWord={lastFoundWord}
        acceptedPoints={lastWordScore}
        acceptedId={scoreFlyId}
        reducedMotion={prefersReducedMotion}
        hint={wordsFound.length === 0}
        live={liveVerdict(builtLetters.map(bl => bl.letter).join(''), puzzle.centerLetter, wordsFound, onQuickVerdict)}
        pending={pendingLetter}
        celebrating={celebration !== null}
        banner={<WheelRushCelebration celebration={celebration} t={t} prefersReduced={prefersReducedMotion} delay={0.2} className="inset-0 items-center" />}
        className="shrink-0"
      />
      <WheelDisc
        orbitRef={wheelContainerRef}
        large={inShell}
        centerLetter={puzzle.centerLetter}
        outerLetters={outerLetters}
        builtIndices={builtLetters.map(bl => bl.wheelIndex)}
        pointerPosRef={pointerPosRef}
        draggingRef={draggingRef}
        onPointerDown={(e) => { claimPointer(e); handlePointerDown(e); }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPress={handleLetterPress}
        onHoldStart={holdPointerDown}
        onHoldEnd={holdPointerEnd}
        holdActiveIndex={holdActiveIndex}
        tileSkin={equippedTileSkin}
        fx={fx}
        release={release}
        checking={isValidating}
        reducedMotion={prefersReducedMotion}
        onPressedChange={setPendingLetter}
      >
        {/* exp-wordwheel-drag-hint-v1: idle "swipe to spell" coachmark (cyan = SP). */}
        {dragHintFtue.visible && (
          <MPDragCoachmark
            t={t}
            accent="cyan"
            onDismiss={() => {
              trackGrowthEvent('wordwheel_drag_hint_dismissed', { variant: dragHintVariant });
              dragHintFtue.dismiss();
            }}
          />
        )}
      </WheelDisc>

      {/* The center-letter + min-length rule was removed from the live board to
          cut mid-game clutter — it's still presented on the intro/ready screen
          and surfaced on demand via the "too short" / "missing center" toasts. */}

      {/* ── Action Buttons (inline below wheel, glued via flex cluster) ── */}
      <div
        data-testid="word-wheel-action-bar"
        className="w-full flex items-center justify-center gap-3 mt-1 short:mt-0"
      >
        {/* Clear */}
        <m.button
          type="button"
          onClick={handleClear}
          disabled={builtLetters.length === 0}
          className={cn(
            'p-3 rounded-neo border-3 border-neo-black bg-neo-navy-light text-neo-white shadow-hard',
            'hover:bg-neo-navy active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
          whileTap={{ scale: 0.9 }}
          aria-label={t('wordWheel.clear')}
        >
          <RotateCcw className="w-5 h-5" />
        </m.button>

        {/* Submit */}
        <m.button
          type="button"
          onClick={handleSubmit}
          disabled={isValidating || builtWord.length < 3}
          className={cn(
            'px-8 py-3 rounded-neo border-3 border-neo-black font-neo-display font-black text-lg',
            builtWord.length >= 3
              ? 'bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black shadow-[3px_3px_0px_black,0_0_16px_rgba(191,255,0,0.3)] hover:shadow-[3px_3px_0px_black,0_0_22px_rgba(0,255,255,0.4)]'
              : 'bg-neo-navy-light text-neo-white shadow-hard-lg',
            'active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
            'disabled:cursor-not-allowed',
          )}
          whileTap={builtWord.length >= 3 ? { scale: 0.92 } : {}}
          animate={isValidating ? { opacity: [1, 0.6, 1] } : {}}
          transition={isValidating ? { duration: 0.6, repeat: Infinity } : {}}
        >
          {t('wordWheel.submit')}
        </m.button>

        {/* Remove last letter */}
        <m.button
          type="button"
          onClick={handleBackspace}
          disabled={builtLetters.length === 0}
          className={cn(
            'p-3 rounded-neo border-3 border-neo-black bg-neo-navy-light text-neo-white shadow-hard',
            'hover:bg-neo-navy active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
          whileTap={{ scale: 0.9 }}
          aria-label={t('wordWheel.removeLetter')}
        >
          <Delete className="w-5 h-5" />
        </m.button>
      </div>
      </div>
    </>
  );

  // One tree for every screen: on desktop the GameShell frames it with rails.
  return (
    <GameShell
      mode="wheel"
      accent="lime"
      left={inShell ? (
        <>
          <div className="min-h-0 flex-1 overflow-hidden rounded-neo zone-panel-pink">
            {hideCompetitive ? (
              <div className="p-4">
                <WordWheelRankLadder t={t} score={score} thresholds={thresholds} rivals={rivals} variant="list" />
              </div>
            ) : (
              <WordWheelLiveRanks t={t} score={score} rivals={[...rivals].reverse()} />
            )}
          </div>
          <ShellKeysCard t={t} />
        </>
      ) : null}
      right={inShell ? <div className="h-full min-h-0 overflow-hidden rounded-neo zone-panel-lime">{foundWords}</div> : null}
    >
      <div
        ref={gameContainerRef}
        className={cn(
          // No bottom-stack padding: body.screen-fit-locked already reserves --bottom-stack-height.
          'relative flex flex-col items-center gap-3 w-full flex-1 min-h-0 max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto px-4 pb-3 rounded-neo select-none',
          'shell:max-w-none shell:h-full shell:px-0 shell:pb-0',
          equippedBoardTheme && `cosmetic-board-${equippedBoardTheme.replace('board-', '')}`,
        )}
        translate="no"
      >
        {wheelCluster}
      </div>
    </GameShell>
  );
};

export default WordWheelGame;
