'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Clock, Delete, RotateCcw, Sparkles, Flame, TrendingUp, ChevronUp, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { computeWheelRadius } from '@/lib/wordWheel/wheelGeometry';
import { isValidWordWheelWord, type WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';
import { scoreWord } from '@/utils/dailyChallenge/wordWheelScoring';
import { classifyLetterCoverage } from '@/lib/wheelRush/letterCoverage';
import { WheelRushCelebration, type WheelCelebration } from '@/components/multiplayer/WheelRushCelebration';
import { fireConfetti } from '@/utils/confettiUtils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { WordWheelEffect } from './WordWheelEffectsCanvas';
import { WheelLetter, WordTile } from './WordWheelParts';
import { useHoldToSubmit } from '@/hooks/useHoldToSubmit';
import { useWordWheelKeyboard } from '@/hooks/useWordWheelKeyboard';
import { useEquippedCosmetic } from '@/hooks/useEquippedCosmetic';
import { trackGameEnd, trackGameStart } from '@/utils/growthTracking';
import dynamic from 'next/dynamic';
import PracticeCoachTip from '@/components/practice/PracticeCoachTip';
import Avatar from '@/components/Avatar';

const WordWheelPixiRing = dynamic(() => import('./WordWheelPixiRing'), { ssr: false });

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
}


interface RivalScore {
  name: string;
  score: number;
  avatarImage: string | null;
  customAvatar: import('@/shared/types/customAvatar').CustomAvatarConfig | null;
  playerId: string | null;
}

const WordWheelGame: React.FC<WordWheelGameProps> = ({
  puzzle, duration, onComplete, onValidateWord, onEffect, language, paused = false, practice = false,
}) => {
  const { t } = useLanguage();
  // `useReducedMotion` returns `true` when the user has set the OS-level
  // reduced-motion preference; we gate the breathing/pulse loops on it
  // (WCAG 2.3.3) but leave functional feedback animations (tap, success) intact.
  const prefersReducedMotion = useReducedMotion() ?? false;
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
  const [outerLetters, setOuterLetters] = useState(puzzle.outerLetters);
  const [lastWordScore, setLastWordScore] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wordBuilderShake, setWordBuilderShake] = useState(false);
  const [lastFoundWord, setLastFoundWord] = useState<string | null>(null);
  // "You used the whole wheel" banner — fires when an accepted word covers all
  // (or all-but-one) distinct wheel letters. Single keyed state so a second
  // pangram replaces (re-animates) rather than stacks.
  const [celebration, setCelebration] = useState<WheelCelebration | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [rivals, setRivals] = useState<RivalScore[]>([]);
  const [passToasts, setPassToasts] = useState<Array<{ id: number; name: string }>>([]);
  const passedNamesRef = useRef<Set<string>>(new Set());
  const passToastIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    const fetchRivals = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/daily-challenge/word-wheel/leaderboard/${today}/${language}?limit=100`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const list: RivalScore[] = (json.data || [])
          .filter((r: { score?: number; display_name?: string }) => typeof r.score === 'number' && r.display_name)
          .map((r: { score: number; display_name: string; avatar_image?: string | null; custom_avatar?: import('@/shared/types/customAvatar').CustomAvatarConfig | null; player_id?: string | null }) => ({
            name: r.display_name,
            score: r.score,
            avatarImage: r.avatar_image ?? null,
            customAvatar: r.custom_avatar ?? null,
            playerId: r.player_id ?? null,
          }))
          .sort((a: RivalScore, b: RivalScore) => a.score - b.score);
        setRivals(list);
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
  }, [language]);

  // Closest rival above me + pass detection
  const nextRival = useMemo(
    () => rivals.find(r => r.score > score) || null,
    [rivals, score],
  );
  const pointsToPass = nextRival ? nextRival.score - score : 0;

  useEffect(() => { wordsFoundRef.current = wordsFound; }, [wordsFound]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // Funnel parity: emit game_started once on mount to pair with trackGameEnd('word-wheel', ...)
  useEffect(() => {
    trackGameStart('word-wheel', { language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect newly-passed rivals when score changes — queue toasts so multiple
  // simultaneous passes (combo + pangram) all celebrate, plus mini-celebration
  // burst (combo-flash particles + sound + haptic).
  useEffect(() => {
    if (!rivals.length) return;
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
  }, [score, rivals, onEffect, playComboSound]);

  // ── Drag-to-build support ── (handlers defined after handleLetterPress)
  const draggingRef = useRef(false);
  const lastDragIdxRef = useRef<number | null>(null);
  const dragStartIdxRef = useRef<number | null>(null);
  const dragEngagedRef = useRef(false);
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
  useEffect(() => {
    if (idleSubmitTimerRef.current) { clearTimeout(idleSubmitTimerRef.current); idleSubmitTimerRef.current = null; }
    if (autoResetTimerRef.current) { clearTimeout(autoResetTimerRef.current); autoResetTimerRef.current = null; }
    if (builtLetters.length >= 3 && !gameOverRef.current) {
      idleSubmitTimerRef.current = setTimeout(() => {
        idleSubmitTimerRef.current = null;
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
  const triggerFeatBanner = useCallback((tier: 'all' | 'almost', word: string) => {
    setCelebration({ tier, word, key: Date.now() });
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
  const showFeedback = useCallback((message: string, type: 'success' | 'error') => {
    setFeedback({ message, type });
    const toastDuration = type === 'error' ? 1500 : 1500;
    setTimeout(() => setFeedback(null), toastDuration);
    if (type === 'error') {
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
  }, []);

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
  }, [addLetter, holdSuppressClick, playButtonClickSound]);

  // ── Drag-to-build handlers (additive only — skips letters already used) ──
  // Drag only engages once pointer moves to a DIFFERENT letter than the start,
  // so single taps stay handled by the button's native onClick (preserving
  // double-tap-to-submit without a duplicate press from pointerdown).
  const tryDragHit = useCallback((clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const btn = el?.closest<HTMLButtonElement>('[data-wheel-letter]');
    if (!btn) return;
    const idx = Number(btn.dataset.wheelIndex);
    if (idx === lastDragIdxRef.current) return;
    if (!dragEngagedRef.current) {
      const startIdx = dragStartIdxRef.current;
      if (startIdx === null || idx === startIdx) return;
      dragEngagedRef.current = true;
      lastDragIdxRef.current = startIdx;
      // Drag took over — abort any in-flight hold ring. Capture the eager-added
      // index first so we don't re-add the start letter below.
      const eagerIdx = holdGetEagerAdded();
      holdCancel();
      const startBtn = document.querySelector<HTMLButtonElement>(
        `[data-wheel-index="${startIdx}"]`,
      );
      if (startBtn && !usedIndicesRef.current.has(startIdx) && eagerIdx !== startIdx) {
        handleLetterPress(startBtn.dataset.wheelLetter || '', startIdx, startBtn);
      }
    }
    if (usedIndicesRef.current.has(idx)) return;
    lastDragIdxRef.current = idx;
    handleLetterPress(btn.dataset.wheelLetter || '', idx, btn);
  }, [handleLetterPress, holdCancel, holdGetEagerAdded]);
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    dragEngagedRef.current = false;
    lastDragIdxRef.current = null;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const btn = el?.closest<HTMLButtonElement>('[data-wheel-letter]');
    dragStartIdxRef.current = btn ? Number(btn.dataset.wheelIndex) : null;
  }, []);
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    pointerPosRef.current = { x: e.clientX, y: e.clientY };
    if (!draggingRef.current) return;
    tryDragHit(e.clientX, e.clientY);
  }, [tryDragHit]);
  const handlePointerUp = useCallback(() => {
    pointerPosRef.current = null;
    const wasEngaged = dragEngagedRef.current;
    draggingRef.current = false;
    lastDragIdxRef.current = null;
    dragStartIdxRef.current = null;
    dragEngagedRef.current = false;
    if (wasEngaged && builtLettersRef.current.length >= 3) {
      if (idleSubmitTimerRef.current) { clearTimeout(idleSubmitTimerRef.current); idleSubmitTimerRef.current = null; }
      lastSubmitWasDragRef.current = true;
      handleSubmitRef.current();
    }
  }, []);

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
      showFeedback(t('wordWheel.alreadyFound'), 'error');
      onEffect({ type: 'error', x: cx, y: 80 });
      playWordRejectedSound();
      return;
    }

    setIsValidating(true);
    try {
      const isValid = await onValidateWord(word);
      if (isValid) {
        const points = scoreWord(word);
        setWordsFound(prev => [...prev, word]);
        setScore(prev => prev + points);
        setLastWordScore(points);
        setTimeout(() => setLastWordScore(null), 1200);
        showFeedback(`+${points}`, 'success');
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
        const wheelLetters = puzzle.allLetters ?? [puzzle.centerLetter, ...puzzle.outerLetters];
        const coverage = classifyLetterCoverage(word, wheelLetters);
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

        // Headline banner for full / near-full wheel coverage.
        if (coverage !== 'none') {
          triggerFeatBanner(coverage, word);
        }
      } else {
        showFeedback(t('wordWheel.notInDictionary'), 'error');
        onEffect({ type: 'error', x: cx, y: 80 });
      }
    } finally {
      setIsValidating(false);
    }
  }, [builtWord, isValidating, puzzle, wordsFound, onValidateWord, showFeedback, t, onEffect, combo, playWordRejectedSound, playWordAcceptedSound, playLegendaryWordSound, playComboSound, playWordLengthSound, triggerFeatBanner]);

  // Keep submit ref fresh so double-tap handler (created earlier) can reach the latest closure.
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  // Responsive wheel radius based on the wheel div width (not the game container).
  // The container is height-capped on short viewports (max-w/max-h below), so the
  // measured width shrinks there and the orbit pulls inward to stay inside the rim.
  const [wheelRadius, setWheelRadius] = useState(96);
  useEffect(() => {
    const el = wheelContainerRef.current;
    if (!el) return;
    const update = () => setWheelRadius(computeWheelRadius(el.getBoundingClientRect().width, 136));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Keyboard input ──
  useWordWheelKeyboard({
    centerLetter: puzzle.centerLetter, outerLetters, usedIndices,
    handleSubmit, handleClear, setBuiltLetters,
    gameOver: gameOverRef.current, playTileSelectSound, playButtonClickSound,
  });

  // Timer display
  const timerColor = timeLeft <= 10 ? 'text-neo-red' : timeLeft <= 30 ? 'text-neo-orange' : 'text-neo-white';
  const timerPulse = timeLeft <= 10 ? 'animate-pulse' : '';
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const equippedBoardTheme = useEquippedCosmetic('boardTheme');

  return (
    <div
      ref={gameContainerRef}
      className={cn(
        // Defense in depth: parent (WordWheelChallenge playing wrapper) already
        // reserves --bottom-stack-height, but if banner ever paints anyway
        // (Android mid-nav race, future routes), the found-words list below
        // the sticky action bar would bleed into reserved zone. pb-bottom-stack
        // here keeps the list above any banner overlap.
        'relative flex flex-col items-center w-full flex-1 max-w-lg mx-auto px-3 sm:px-4 pb-bottom-stack rounded-neo',
        equippedBoardTheme && `cosmetic-board-${equippedBoardTheme.replace('board-', '')}`,
      )}
    >
      {/* Full / near-full wheel-coverage banner (pointer-events disabled). */}
      <WheelRushCelebration celebration={celebration} t={t} prefersReduced={prefersReducedMotion} />

      {/* Practice-mode coach — auto-hides on first found word. */}
      {practice && (
        <div className="w-full pb-2">
          <PracticeCoachTip mode="wheelRush" wordsFound={wordsFound.length} />
        </div>
      )}

      {/* ── Timer & Score Bar ── */}
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between w-full gap-2">
          <div className={cn('flex items-center gap-1.5 font-neo-display font-black text-lg sm:text-xl shrink-0', timerColor, timerPulse)}>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="tabular-nums">{minutes}:{seconds.toString().padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Combo counter — reserved slot avoids horizontal layout shift in top bar */}
            <div data-testid="combo-slot" className="min-w-[56px] sm:min-w-[64px] flex justify-end shrink-0">
              <AnimatePresence>
                {combo >= 2 && (
                  <m.div
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-neo border-2 border-neo-black bg-linear-to-r from-neo-pink to-neo-red shadow-[0_0_10px_rgba(255,20,147,0.4)] shrink-0"
                    initial={{ scale: 0, x: 20 }}
                    animate={{ scale: 1, x: 0 }}
                    exit={{ scale: 0, x: 20 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                  >
                    <Flame className="w-3.5 h-3.5 text-neo-white" />
                    <span className="font-neo-display font-black text-neo-white text-xs sm:text-sm">x{combo}</span>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
            <span className="text-neo-white text-xs sm:text-sm font-semibold truncate">
              {t('wordWheel.wordsFound', { count: wordsFound.length })}
            </span>
            <m.span
              key={score}
              className="font-neo-display font-black text-neo-lime text-lg sm:text-xl shrink-0"
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              {score}
            </m.span>
          </div>
        </div>
        {/* Timer progress bar — replaced by manual end-CTA in practice mode. */}
        {practice ? (
          <button
            type="button"
            onClick={handleEndPractice}
            className="w-full bg-neo-lime text-neo-black border-2 border-neo-black rounded-neo py-2 px-3 font-neo-display font-black text-sm shadow-hard active:shadow-hard-pressed active:translate-x-px active:translate-y-px"
          >
            {t('practice.endRun')}
          </button>
        ) : (
          <div className="w-full h-1.5 rounded-full bg-neo-navy-light border border-neo-cream/10 overflow-hidden">
            <m.div
              className={cn(
                'h-full rounded-full',
                timeLeft <= 10 ? 'bg-neo-red' : timeLeft <= 30 ? 'bg-neo-orange' : 'bg-linear-to-r from-neo-lime to-neo-cyan',
              )}
              style={{ width: `${(timeLeft / duration) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>

      {/* ── Word Builder Area ──
          Fixed height (not min-h) so popLayout tile-exit animations on submit
          don't briefly collapse/expand the box and cause the wheel cluster
          (flex-1 + justify-center sibling below) to re-center. */}
      <m.div
        data-testid="word-builder"
        className="relative w-full h-[52px] sm:h-[72px] flex items-center justify-center"
        animate={
          wordBuilderShake
            ? { x: [-4, 4, -3, 3, -1, 0] }
            : { scale: 1 + builtLetters.length * 0.008 }
        }
        transition={wordBuilderShake
          ? { duration: 0.35 }
          : { type: 'spring', stiffness: 300, damping: 20 }
        }
      >
        <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap max-w-full">
          <AnimatePresence mode="popLayout">
            {builtLetters.length === 0 ? (
              <m.span
                key="placeholder"
                className="text-neo-white font-neo-display text-base sm:text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {t('wordWheel.tapLetters')}
              </m.span>
            ) : (
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
              // dir="auto" so localized feedback (e.g. Hebrew validation
              // messages) renders RTL while score strings like "+45" stay LTR.
              dir="auto"
              className={cn(
                'absolute -bottom-7 left-1/2 -translate-x-1/2 px-3 py-1 rounded-neo border-2 border-neo-black text-sm font-bold whitespace-nowrap z-20',
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
        {/* Flying score */}
        <AnimatePresence>
          {lastWordScore !== null && (
            <m.div
              key={`score-${Date.now()}`}
              className="absolute top-0 left-1/2 -translate-x-1/2 font-neo-display font-black text-neo-lime text-3xl pointer-events-none z-20"
              initial={{ opacity: 1, y: 0, scale: 0.5 }}
              animate={{ opacity: 0, y: -60, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            >
              +{lastWordScore}
            </m.div>
          )}
        </AnimatePresence>
      </m.div>

      {/* Points-to-pass next-rival hint — fixed-height reserved slot.
          h-* (not min-h-*) + whitespace-nowrap + truncate keeps the pill
          locked to one line. pointsToPass derives from score → mutates every
          submit; long HE/JA strings or long player names would otherwise
          wrap the pill and grow the slot, recentering the wheel cluster. */}
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

      {/* Pass notification toast stack — queued so back-to-back passes all
          celebrate. Each toast stacks vertically with a small offset. */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-1.5">
        <AnimatePresence>
          {passToasts.map((toast, i) => (
            <m.div
              key={toast.id}
              className="px-3 py-1.5 rounded-neo border-3 border-neo-black bg-linear-to-r from-neo-pink to-neo-purple text-neo-white font-neo-display font-black text-sm shadow-[3px_3px_0px_black,0_0_18px_rgba(255,20,147,0.6)] flex items-center gap-1.5 whitespace-nowrap"
              initial={{ opacity: 0, y: -20, scale: 0.6, rotate: -4 }}
              animate={prefersReducedMotion
                ? { opacity: 1, y: i * 4, scale: 1, rotate: 0 }
                : { opacity: 1, y: i * 4, scale: [0.6, 1.15, 1], rotate: [-4, 2, 0] }
              }
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

      {/* ── Centered wheel + actions cluster (absorbs leftover vertical space) ──
          Action bar lives INSIDE the flex-1 cluster so wheel and buttons stay
          glued together regardless of viewport height. Previously the action
          bar was sticky at the screen bottom, which on tall phones/tablets
          left a 100–250px gap between the wheel and Submit. The inline-submit
          chip near the word-builder still serves as the primary CTA when the
          found-words list grows past viewport. */}
      <div className="@container/wheel [container-type:size] flex-1 flex flex-col items-center justify-center w-full min-h-0 gap-2 py-1" data-testid="wheel-cluster">
      {/* Tap-to-remove + double-tap-to-submit hint — fixed-height reserved
          slot (h-*, not min-h-*) so even font/locale ascender variance can't
          grow the slot when builtLetters mounts/unmounts the hint text. */}
      <div
        data-testid="tap-hint-slot"
        className="h-[14px] sm:h-[16px] flex items-center justify-center"
      >
        {builtLetters.length > 0 && (
          <p className="text-neo-white text-[10px] sm:text-xs text-center">
            {t('wordWheel.tapToRemove')} &middot; {t('wordWheel.doubleTapToSubmit')}
          </p>
        )}
      </div>

      {/* ── The Wheel ── */}
      <div
        ref={wheelContainerRef}
        // Height-cap (max-*) only binds when smaller than the fixed size, so tall
        // screens are unchanged while short/landscape ones shrink the wheel to fit
        // the cluster instead of overlapping the pills above / buttons below.
        // Reserve ~116px (tap-hint + rule-hint + action bar + gaps); floor 176px.
        className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 max-w-[max(176px,calc(100cqb-116px))] max-h-[max(176px,calc(100cqb-116px))] shrink-0 flex items-center justify-center touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* PixiJS wheel decorations: orbital rings + connection lines */}
        <WordWheelPixiRing
          selectedIndices={builtLetters.map(bl => bl.wheelIndex)}
          radius={wheelRadius}
          combo={combo}
          pointerPosRef={pointerPosRef}
          isDraggingRef={draggingRef}
        />
        {/* Outer glow ring — breathing loop disabled under reduced-motion */}
        <m.div
          className="absolute inset-0 rounded-full border-2 border-neo-lime/20"
          style={{ boxShadow: '0 0 24px rgba(191,255,0,0.12), inset 0 0 24px rgba(191,255,0,0.06)' }}
          animate={prefersReducedMotion ? { opacity: 0.85 } : { opacity: [0.6, 1, 0.6] }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Inner decorative ring */}
        <div className="absolute inset-4 sm:inset-5 rounded-full border border-neo-cyan/10" />
        <div className="absolute inset-8 sm:inset-10 rounded-full border border-neo-cream/5" />

        {/* Center letter */}
        <WheelLetter
          letter={puzzle.centerLetter}
          isCenter
          onPress={(letter, _, el) => handleLetterPress(letter, -1, el)}
          isUsed={usedIndices.has(-1)}
          index={-1}
          reducedMotion={prefersReducedMotion}
          showHoldRing={holdActiveIndex === -1}
          onHoldStart={(l, _, el) => holdPointerDown(l, -1, el)}
          onHoldEnd={holdPointerEnd}
        />
        {/* Outer letters */}
        {outerLetters.map((letter, i) => (
          <WheelLetter
            key={`${letter}-${i}`}
            letter={letter}
            isCenter={false}
            angle={i * 60}
            radius={wheelRadius}
            onPress={(l, _, el) => handleLetterPress(l, i, el)}
            isUsed={usedIndices.has(i)}
            index={i}
            reducedMotion={prefersReducedMotion}
            showHoldRing={holdActiveIndex === i}
            onHoldStart={(l, _, el) => holdPointerDown(l, i, el)}
            onHoldEnd={holdPointerEnd}
          />
        ))}
      </div>

      {/* ── Center letter rule hint ── */}
      <p className="text-neo-white text-xs text-center">
        {t('wordWheel.centerLetterRule')} &middot; {t('wordWheel.minLetters', { min: '3' })}
      </p>

      {/* ── Action Buttons (inline below wheel, glued via flex cluster) ── */}
      <div
        data-testid="word-wheel-action-bar"
        className="w-full flex items-center justify-center gap-3 mt-1"
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
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {t('wordWheel.submit')}
          </div>
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
        <div className="flex flex-wrap gap-1.5 overflow-y-auto pr-1 flex-1 min-h-0">
          {wordsFound.map((word) => (
            <m.span
              key={word}
              className={cn(
                'px-2.5 py-1 rounded-neo border-2 text-neo-white text-xs font-semibold shadow-hard-xs h-fit',
                word === lastFoundWord
                  ? 'bg-neo-lime/20 border-neo-lime ring-1 ring-neo-lime/40'
                  : 'bg-neo-navy-light border-neo-black',
              )}
              initial={{ scale: 0, opacity: 0 }}
              animate={word === lastFoundWord && !prefersReducedMotion
                ? { scale: [0, 1.15, 1], opacity: 1 }
                : { scale: 1, opacity: 1 }
              }
              transition={prefersReducedMotion ? { duration: 0.2 } : { type: 'spring', stiffness: 500 }}
            >
              {displayWord(word)} <span className="text-neo-lime font-black">+{scoreWord(word)}</span>
            </m.span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WordWheelGame;
