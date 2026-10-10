'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Delete, RotateCcw, TrendingUp, ChevronUp, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { isValidWordWheelWord, type WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';
import { scoreWord } from '@/utils/dailyChallenge/wordWheelScoring';
import { classifyLetterCoverage } from '@/lib/wheelRush/letterCoverage';
import { wheelWordDir } from '@/lib/wheelRush/wordDirection';
import type { Language } from '@/types';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { WordWheelEffect } from './WordWheelEffectsCanvas';
import { WordTile } from './WordWheelParts';
import WheelDisc from './wheel/WheelDisc';
import WheelRanksPanel, { type RivalScore } from './wheel/WheelRanksPanel';
import WheelHud from './wheel/WheelHud';
import WheelFoundWords from './wheel/WheelFoundWords';
import { LaunchFx } from './wheel/WheelWordFx';
import { useWheelWordFx, rectsWithin, centreWithin } from './wheel/useWheelWordFx';
import { useHoldToSubmit } from '@/hooks/useHoldToSubmit';
import { useWheelDragSpell } from '@/hooks/useWheelDragSpell';
import { useWordWheelKeyboard } from '@/hooks/useWordWheelKeyboard';
import { useEquippedCosmetic } from '@/hooks/useEquippedCosmetic';
import { trackGameEnd, trackGameStart, trackGrowthEvent } from '@/utils/growthTracking';
import { useExperiment } from '@/hooks/useExperiment';
import { useMPFTUEIdle } from '@/hooks/useMPFTUEIdle';
import { MPDragCoachmark } from '@/components/multiplayer/MPDragCoachmark';
import WheelCoachSlot from './wheel/WheelCoachSlot';
import { ModeCoach } from '@/components/tutorial/ModeCoach';
import Avatar from '@/components/Avatar';

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
  onEffect: (effect: WordWheelEffect) => void;
  language: string;
  paused?: boolean;
  /** Practice mode: suppress countdown timer + show manual "end practice" CTA. */
  practice?: boolean;
  /**
   * Suppress ModeCoach FTUE and PracticeCoachTip without enabling practice
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
  /** Desktop layout (1024w + 700h) — 3-column grid with ranks/wheel/words. */
  isDesktop?: boolean;
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


const WordWheelGame: React.FC<WordWheelGameProps> = ({
  puzzle, duration, onComplete, onValidateWord, onEffect, language, paused = false, practice = false,
  hideModeCoach = false,
  hideCompetitive = false, rivals: rivalsOverride, onWordFound, isDesktop = false,
  puzzleDate, currentPlayerId = null, currentGuestFingerprint = null, onExit,
}) => {
  const { t } = useLanguage();
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
  const [isValidating, setIsValidating] = useState(false);
  const outerLetters = puzzle.outerLetters;
  const { fx, fire: fireFx, release, hold: holdRelease, drop: dropRelease } = useWheelWordFx();
  // Bumped when a word launches off the tray, so its tiles vanish instead of playing their exit under the launch copies.
  const [trayGen, setTrayGen] = useState(0);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const [combo, setCombo] = useState(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wordBuilderShake, setWordBuilderShake] = useState(false);
  const [lastFoundWord, setLastFoundWord] = useState<string | null>(null);
  // "You used the whole wheel" banner — fires when an accepted word covers all
  // (or all-but-one) distinct wheel letters. Single keyed state so a second
  // pangram replaces (re-animates) rather than stacks.

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
  const scoreValueRef = useRef(0);
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

  // Closest rival above me + pass detection
  const nextRival = useMemo(
    () => rivals.find(r => r.score > score) || null,
    [rivals, score],
  );
  const pointsToPass = nextRival ? nextRival.score - score : 0;

  useEffect(() => { wordsFoundRef.current = wordsFound; }, [wordsFound]);
  useEffect(() => { scoreValueRef.current = score; }, [score]);

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
      const fireIdleSubmit = () => {
        if (draggingRef.current) {
          idleSubmitTimerRef.current = setTimeout(fireIdleSubmit, 250);
          return;
        }
        idleSubmitTimerRef.current = null;
        handleSubmitRef.current();
      };
      idleSubmitTimerRef.current = setTimeout(fireIdleSubmit, 1000);
    }
    return () => { if (idleSubmitTimerRef.current) { clearTimeout(idleSubmitTimerRef.current); idleSubmitTimerRef.current = null; } };
  }, [builtLetters]);

  useEffect(() => () => {
    if (autoResetTimerRef.current) { clearTimeout(autoResetTimerRef.current); autoResetTimerRef.current = null; }
  }, []);

  const builtWord = useMemo(
    () => builtLetters.map(bl => bl.letter).join(''),
    [builtLetters],
  );

  // Wheel tiles always carry regular (non-sofit) forms, so the built-word
  // bar and found-words list show the same glyphs as the tiles.
  const displayLetters = useMemo(() => builtLetters.map(bl => bl.letter), [builtLetters]);
  const displayWord = useCallback((word: string) => word, []);

  // Timer — suppressed in practice mode (no countdown, no auto-complete).
  // Player ends the run via the manual "End practice" CTA below.
  useEffect(() => {
    if (gameOverRef.current || paused || practice) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          gameOverRef.current = true;
          onEffect({ type: 'gameComplete', score: scoreValueRef.current });
          playEpicVictorySound();
          trackGameEnd(
            'word-wheel',
            scoreValueRef.current,
            wordsFoundRef.current.length,
            true,
            duration,
            { isWinner: wordsFoundRef.current.length > 0 }
          );
          onComplete({
            wordsFound: wordsFoundRef.current,
            score: scoreValueRef.current,
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
      score: scoreValueRef.current,
      timeSeconds: 0,
    });
  }, [onComplete]);

  // ── Feedback toast ──
  // Errors hold the toast longer (2500ms) and auto-reset the built word at the
  // same moment, so the player sees *why* it failed and the wheel clears for a
  // fresh attempt without needing the manual reset button. New input within
  // the window cancels the auto-reset (see builtLetters effect above).
  const tileLaunch = useCallback(() => {
    const root = gameContainerRef.current;
    const tiles = root ? Array.from(root.querySelectorAll('[data-testid="built-letter-tile"]')) : [];
    const to = centreWithin(root, scoreRef.current) ?? { x: root?.clientWidth ?? 0, y: 0 };
    return { from: rectsWithin(root, tiles), to };
  }, []);

  const showFeedback = useCallback((message: string, type: 'success' | 'error') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 1500);
    if (type === 'error') {
      const spelled = builtLettersRef.current;
      if (spelled.length > 0) {
        fireFx({
          kind: 'bad',
          indices: spelled.map(bl => bl.wheelIndex),
          letters: spelled.map(bl => bl.letter),
          points: 0,
          launch: lastSubmitWasDragRef.current ? tileLaunch() : null,
        });
        if (lastSubmitWasDragRef.current) setTrayGen(g => g + 1);
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
      const wasDrag = lastSubmitWasDragRef.current;
      lastSubmitWasDragRef.current = false;
      if (wasDrag) {
        setBuiltLetters([]);
      } else {
        autoResetTimerRef.current = setTimeout(() => {
          autoResetTimerRef.current = null;
          setBuiltLetters([]);
        }, 1500);
      }
    }
  }, [fireFx, tileLaunch]);

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
    hubIndex: -1,
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

  // ── Submit word ──
  const handleSubmit = useCallback(async () => {
    if (isValidating || builtWord.length === 0 || gameOverRef.current) return;

    const word = builtWord.toUpperCase();

    // Container-relative center for effects
    const cx = gameContainerRef.current
      ? gameContainerRef.current.getBoundingClientRect().width / 2
      : 200;

    // Client-side checks
    if (word.length < 3) {
      showFeedback(t('wordWheel.tooShort', { min: '3' }), 'error');
      onEffect({ type: 'error', x: cx, y: 80 });
      playWordRejectedSound();
      return;
    }

    if (!word.includes(puzzle.centerLetter.toUpperCase())) {
      showFeedback(t('wordWheel.missingCenter', { letter: puzzle.centerLetter }), 'error');
      onEffect({ type: 'error', x: cx, y: 80 });
      playWordRejectedSound();
      return;
    }

    if (!isValidWordWheelWord(word, puzzle.centerLetter, puzzle.allLetters)) {
      showFeedback(t('wordWheel.invalidLetters'), 'error');
      onEffect({ type: 'error', x: cx, y: 80 });
      playWordRejectedSound();
      return;
    }

    if (wordsFound.includes(word)) {
      // Daily is single-player: once you've found a word it's yours, so
      // re-typing it is blocked outright (no points). This differs from
      // multiplayer Wheel Rush, where the same word can be re-submitted because
      // a different player found it first — but that path is server-authoritative
      // (WheelRushView), not this client-side check.
      showFeedback(t('wordWheel.alreadyFound'), 'error');
      onEffect({ type: 'error', x: cx, y: 80 });
      playWordRejectedSound();
      setBuiltLetters([]);
      return;
    }

    const releasing = builtLettersRef.current;
    // Committed before validation starts, so the release reacts even while a cold dictionary blocks the thread.
    flushSync(() => {
      setIsValidating(true);
      holdRelease({ indices: releasing.map(bl => bl.wheelIndex), letters: releasing.map(bl => bl.letter) });
    });
    try {
      const isValid = await onValidateWord(word);
      if (isValid) {
        const points = scoreWord(word);
        const nextWordsFound = [...wordsFoundRef.current, word];
        wordsFoundRef.current = nextWordsFound;
        setWordsFound(nextWordsFound);
        // Surface progress to the practice shell (goal tracking) — fires for
        // every accepted word, competitive or practice.
        onWordFound?.(word, nextWordsFound);
        setScore(prev => prev + points);
        const wheelLetters = puzzle.allLetters ?? [puzzle.centerLetter, ...puzzle.outerLetters];
        const coverage = classifyLetterCoverage(word, wheelLetters);
        const spelled = builtLettersRef.current;
        fireFx({
          kind: 'good',
          indices: spelled.map(bl => bl.wheelIndex),
          letters: spelled.map(bl => bl.letter),
          points,
          launch: tileLaunch(),
          coverage,
        });
        setTrayGen(g => g + 1);
        setBuiltLetters([]);
        setLastFoundWord(word);
        setTimeout(() => setLastFoundWord(null), 2000);

        // Combo tracker — resets after 5s of inactivity
        const hadActiveCombo = comboTimerRef.current !== null;
        if (comboTimerRef.current) { clearTimeout(comboTimerRef.current); comboTimerRef.current = null; }
        const newCombo = hadActiveCombo ? combo + 1 : 1;
        setCombo(newCombo);
        comboTimerRef.current = setTimeout(() => { setCombo(0); comboTimerRef.current = null; }, 5000);

        // Wheel-coverage feat: 'all' = used every distinct wheel letter (a true
        // wheel pangram — the old `length >= 9` check was dead code since a
        // 7-letter wheel caps words at 7 chars); 'almost' = all-but-one.
        const isAllLetters = coverage === 'all';

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

      } else {
        showFeedback(t('wordWheel.notInDictionary'), 'error');
        onEffect({ type: 'error', x: cx, y: 80 });
      }
    } finally {
      setIsValidating(false);
      dropRelease();
    }
  }, [builtWord, isValidating, puzzle, wordsFound, onValidateWord, showFeedback, t, onEffect, combo, playWordRejectedSound, playWordAcceptedSound, playLegendaryWordSound, playComboSound, playWordLengthSound, onWordFound, fireFx, tileLaunch, holdRelease, dropRelease]);

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

  const ranksPanel = !hideCompetitive ? (
    <WheelRanksPanel rivals={rivals} score={score} hasNextRival={!!nextRival} t={t} />
  ) : null;

  // Wheel cluster JSX (header/timer + wheel + word-builder + action-bar)
  const wheelCluster = (
    <>

      {practice && !hideModeCoach && <WheelCoachSlot wordsFound={wordsFound.length} />}

      {/* Mode coach for non-practice mode. Suppressed by hideModeCoach (Quick Play). */}
      {!practice && !hideModeCoach && <ModeCoach mode="wheelRush" />}

      <WheelHud
        t={t}
        onExit={onExit}
        practice={practice}
        timeLeft={timeLeft}
        duration={duration}
        showCombo={!hideCompetitive}
        combo={combo}
        score={score}
        wordsCount={wordsFound.length}
        scoreRef={scoreRef}
        onEndPractice={handleEndPractice}
      />

      {/* Points-to-pass next-rival hint — fixed-height reserved slot.
          h-* (not min-h-*) + whitespace-nowrap + truncate keeps the pill
          locked to one line. pointsToPass derives from score → mutates every
          submit; long HE/JA strings or long player names would otherwise
          wrap the pill and grow the slot, recentering the wheel cluster. */}
      {showRivalLayer && (
      <div
        data-testid="next-rival-slot"
        className="w-full mt-1.5 h-[30px] sm:h-[32px] flex items-center justify-center px-2"
      >
        <AnimatePresence>
          {nextRival && (
            <m.div
              className="max-w-full px-2.5 py-1 rounded-neo border-2 border-neo-cream/20 bg-neo-navy-light/60 text-[11px] sm:text-xs text-neo-white font-semibold flex items-center gap-1.5 whitespace-nowrap"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <ChevronUp className="w-3 h-3 text-neo-lime shrink-0" />
              <Avatar
                pixelSize={20}
                userId={nextRival.playerId ?? nextRival.name}
                customAvatar={nextRival.customAvatar ?? undefined}
                avatarImage={nextRival.avatarImage ?? undefined}
                className="shrink-0 rounded-full"
              />
              <span className="truncate">
                {t('wordWheel.pointsToPass', { count: pointsToPass, name: nextRival.name })}
              </span>
            </m.div>
          )}
        </AnimatePresence>
      </div>
      )}

      {/* Pass notification toast stack — queued so back-to-back passes all
          celebrate. Each toast stacks vertically with a small offset.
          Suppressed in the practice hub unless the caller supplied rivals. */}
      {showRivalLayer && (
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-1.5">
        <AnimatePresence>
          {passToasts.map((toast, i) => (
            <m.div
              key={toast.id}
              className="px-3 py-1.5 rounded-neo border-3 border-neo-black bg-linear-to-r from-neo-pink to-neo-purple text-neo-white font-neo-display font-black text-sm shadow-[3px_3px_0px_black,0_0_18px_rgba(255,20,147,0.6)] flex items-center gap-1.5 whitespace-nowrap"
              initial={{ opacity: 0, y: -20, scale: 0.6, rotate: -4 }}
              // Springs support 2 keyframes max — a [0.6, 1.15, 1] array here
              // logged "Only two keyframes currently supported with spring..."
              // in real browsers. The underdamped spring overshoots on its own.
              animate={{ opacity: 1, y: i * 4, scale: 1, rotate: 0 }}
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

      <div className="@container/wheel [container-type:size] flex-1 flex flex-col items-center justify-center w-full min-h-0 gap-2 py-1 short:gap-0.5 short:py-0" data-testid="wheel-cluster">
      {/* Fixed height so tile pop-in/out never re-centres the cluster; mt-2 keeps the × badges off whatever sits above. */}
      <m.div
        data-testid="word-builder"
        className="relative z-20 w-full mt-2 short:mt-1 h-[60px] sm:h-[72px] short:h-[44px] shrink-0 flex items-center justify-center"
        animate={
          wordBuilderShake
            ? { x: [-4, 4, -3, 3, -1, 0] }
            : { scale: isValidating ? 1.12 : 1 + builtLetters.length * 0.008 }
        }
        transition={wordBuilderShake
          ? { duration: 0.35 }
          : { type: 'spring', stiffness: 300, damping: 20 }
        }
      >
        <div
          dir={wordDir}
          data-testid="word-tray"
          data-ready={builtWord.length >= 3 ? 'true' : 'false'}
          data-releasing={release ? 'true' : 'false'}
          className={cn(
            'flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap max-w-full rounded-full border-3 px-2.5 py-1.5 sm:px-3 transition-[background-color,border-color,box-shadow] duration-150',
            builtLetters.length === 0
              ? 'border-transparent'
              : builtWord.length >= 3
                ? 'border-neo-black bg-neo-lime/20 shadow-[4px_4px_0_#000,0_0_0_5px_rgba(191,255,0,0.25)]'
                : 'border-neo-black bg-neo-navy-light shadow-[4px_4px_0_#000]',
          )}
        >
          <AnimatePresence key={trayGen} mode="popLayout">
            {builtLetters.length === 0 ? (fx ? null : (
              <m.span
                key="placeholder"
                className="text-neo-white/55 font-medium text-sm sm:text-base"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {t('wordWheel.tapLetters')}
              </m.span>
            )) : (
              builtLetters.map((bl, i) => (
                <WordTile
                  key={`${bl.wheelIndex}-${i}`}
                  letter={displayLetters[i] ?? bl.letter}
                  index={i}
                  onRemove={handleRemoveLetter}
                  isCenter={bl.wheelIndex === -1}
                />
              ))
            )}
          </AnimatePresence>
          {/* Inline submit chip — primary tap-friendly affordance.
              Sits next to the built word so the thumb never has to travel
              down to the sticky bottom bar. Disabled-styled until min-len
              reached, but still tappable so users get a "too short" toast. */}
          <AnimatePresence>
            {builtLetters.length > 0 && (
              <m.button
                key="inline-submit-chip"
                type="button"
                data-testid="inline-submit-chip"
                onClick={handleSubmit}
                disabled={isValidating}
                aria-label={t('wordWheel.submit')}
                className={cn(
                  'ms-1 sm:ms-2 w-9 h-10 sm:w-11 sm:h-12 md:w-12 md:h-14 rounded-neo border-3 border-neo-black flex items-center justify-center touch-manipulation cursor-pointer',
                  'before:absolute before:-inset-2 before:content-[""] relative',
                  'active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
                  builtWord.length >= 3
                    ? 'bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black shadow-[2px_2px_0px_black,0_0_14px_rgba(191,255,0,0.5)]'
                    : 'bg-neo-navy-light text-neo-white shadow-hard-xs',
                )}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileTap={builtWord.length >= 3 ? { scale: 0.9 } : { scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 600, damping: 22 }}
              >
                <Check className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={3} />
              </m.button>
            )}
          </AnimatePresence>
        </div>
        {/* Inline feedback toast */}
        <AnimatePresence>
          {feedback && (
            <m.div
              dir="auto"
              className={cn(
                'absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-neo border-2 border-neo-black text-sm font-bold whitespace-nowrap z-20',
                feedback.type === 'success'
                  ? 'bg-neo-lime text-neo-black'
                  : 'bg-neo-red text-neo-white',
              )}
              initial={{ opacity: 0, y: -10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
            >
              {feedback.message}
            </m.div>
          )}
        </AnimatePresence>
      </m.div>


      <WheelDisc
        orbitRef={wheelContainerRef}
        centerLetter={puzzle.centerLetter}
        outerLetters={outerLetters}
        builtIndices={builtLetters.map(bl => bl.wheelIndex)}
        pointerPosRef={pointerPosRef}
        draggingRef={draggingRef}
        onPointerDown={handlePointerDown}
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
        t={t}
        reducedMotion={prefersReducedMotion}
      >
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

      <div
        data-testid="word-wheel-action-bar"
        className="w-full flex items-center justify-center gap-2.5 sm:gap-3 mt-2 short:mt-0"
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
      <div
        data-testid="tap-hint-slot"
        className="h-[14px] sm:h-[16px] flex items-center justify-center"
      >
        {builtLetters.length > 0 && (
          <p className="text-neo-white/45 text-[10px] sm:text-xs text-center">
            {t('wordWheel.tapToRemove')} &middot; {t('wordWheel.doubleTapToSubmit')}
          </p>
        )}
      </div>
      </div>
    </>
  );

  const foundWordsList = (
    <WheelFoundWords
      words={wordsFound.map(displayWord)}
      fresh={lastFoundWord}
      score={scoreWord}
      dir={wordDir}
      reducedMotion={prefersReducedMotion}
    />
  );

  // Desktop / Mobile branch
  if (isDesktop) {
    return (
      <div
        ref={gameContainerRef}
        className="relative flex h-full w-full bg-neo-navy"
        translate="no"
      >
        <LaunchFx fx={fx} reducedMotion={prefersReducedMotion} />
        {/* 3-Column Grid */}
        <div
          data-testid="word-wheel-desktop-grid"
          className="flex w-full h-full max-h-full gap-6 p-5 overflow-hidden"
          style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr 280px',
            gridTemplateRows: '1fr',
          }}
        >
          {/* Left Sidebar — Live Ranks (pink accent) */}
          <div className="h-full overflow-hidden zone-panel-pink rounded-neo">
            {ranksPanel}
          </div>

          {/* Center — Game Area (cyan accent) */}
          <div className="flex flex-col items-center justify-center h-full min-w-0 min-h-0 gap-2 relative z-10 zone-panel-cyan rounded-neo px-4 py-3">
            {wheelCluster}
          </div>

          {/* Right Sidebar — Found Words (lime accent) */}
          <div className="h-full overflow-hidden zone-panel-lime rounded-neo flex flex-col">
            <h3 className="text-xs font-bold uppercase mb-1.5 shrink-0 px-4 py-3 border-b-3 border-neo-black bg-neo-black/30">
              {t('wordWheel.foundWords')} ({wordsFound.length})
            </h3>
            {foundWordsList}
          </div>
        </div>
      </div>
    );
  }

  // Mobile / tablet layout (single column)
  return (
    <div
      ref={gameContainerRef}
      className={cn(
        // No bottom-stack padding here. `body.screen-fit-locked` already reserves
        // --bottom-stack-height, and padding is additive, not idempotent: this
        // used to reserve it a third time (body + challenge playing wrapper +
        // here). On Android with an AdMob banner that is 3 x 154px = 462px lost
        // from an 832px viewport — the board was crushed into the top third and
        // Submit sat on top of the found-words chips. The action bar is no
        // longer sticky (it moved inside the wheel cluster), so the original
        // "defence in depth" reason no longer applies either.
        'relative flex flex-col items-center w-full flex-1 max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto px-3 sm:px-4 rounded-neo',
        equippedBoardTheme && `cosmetic-board-${equippedBoardTheme.replace('board-', '')}`,
      )}
      translate="no"
    >
      <LaunchFx fx={fx} reducedMotion={prefersReducedMotion} />
      {wheelCluster}

      {/* ── Found Words — fixed-height reserved slot. Always rendered so the
          wheel cluster's `flex-1 justify-center` parent never re-centers when
          the first word lands or new chips wrap to a new row. Chips scroll
          inside the cap; only the chip animations move, never the slot. ── */}
      <div
        data-testid="found-words-slot"
        className="w-full mt-2 medium-short:mt-1 h-[112px] sm:h-[136px] medium-short:h-[88px] short:h-16 flex flex-col"
      >
        <h3
          className={cn(
            'text-xs font-bold uppercase mb-1.5 shrink-0 transition-opacity',
            wordsFound.length > 0 ? 'text-neo-white opacity-100' : 'opacity-0',
          )}
          aria-hidden={wordsFound.length === 0}
        >
          {t('wordWheel.foundWords')} ({wordsFound.length})
        </h3>
        {foundWordsList}
      </div>
    </div>
  );
};

export default WordWheelGame;
