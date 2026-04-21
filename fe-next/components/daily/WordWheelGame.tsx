'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Shuffle, RotateCcw, Sparkles, Flame, TrendingUp, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { isValidWordWheelWord, type WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';
import { scoreWord } from '@/utils/dailyChallenge/wordWheelScoring';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { WordWheelEffect } from './WordWheelEffectsCanvas';
import { WheelLetter, WordTile } from './WordWheelParts';
import { useWordWheelKeyboard } from '@/hooks/useWordWheelKeyboard';
import { trackGameEnd } from '@/utils/growthTracking';
import dynamic from 'next/dynamic';

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
}

// Rough avg points per word for "X words to pass" estimate
const AVG_POINTS_PER_WORD = 6;

interface RivalScore { name: string; score: number }

const WordWheelGame: React.FC<WordWheelGameProps> = ({
  puzzle, duration, onComplete, onValidateWord, onEffect, language, paused = false,
}) => {
  const { t } = useLanguage();
  const {
    playTileSelectSound, playWordAcceptedSound, playWordRejectedSound,
    playComboSound, playLegendaryWordSound, playEpicVictorySound,
    playCountdownBeep, playBoardShuffleSound, playButtonClickSound,
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

  const gameOverRef = useRef(false);
  const wordsFoundRef = useRef<string[]>([]);
  const scoreRef = useRef(0);
  const timeWarningFiredRef = useRef(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const idleSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Live leaderboard rivals (snapshot on mount) ──
  const [rivals, setRivals] = useState<RivalScore[]>([]);
  const [passToast, setPassToast] = useState<string | null>(null);
  const passedNamesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/daily-challenge/word-wheel/leaderboard/${today}/${language}?limit=100`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const list: RivalScore[] = (json.data || [])
          .filter((r: { score?: number; display_name?: string }) => typeof r.score === 'number' && r.display_name)
          .map((r: { score: number; display_name: string }) => ({ name: r.display_name, score: r.score }))
          .sort((a: RivalScore, b: RivalScore) => a.score - b.score);
        setRivals(list);
      } catch { /* leaderboard is best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [language]);

  // Closest rival above me + pass detection
  const nextRival = useMemo(
    () => rivals.find(r => r.score > score) || null,
    [rivals, score],
  );
  const wordsToPass = nextRival
    ? Math.max(1, Math.ceil((nextRival.score - score) / AVG_POINTS_PER_WORD))
    : 0;

  useEffect(() => { wordsFoundRef.current = wordsFound; }, [wordsFound]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // Detect newly-passed rivals when score changes
  useEffect(() => {
    if (!rivals.length) return;
    for (const r of rivals) {
      if (r.score > 0 && r.score <= score && !passedNamesRef.current.has(r.name)) {
        passedNamesRef.current.add(r.name);
        setPassToast(r.name);
        haptic([20, 40, 20]);
        setTimeout(() => setPassToast(null), 2400);
      }
    }
  }, [score, rivals]);

  // ── Drag-to-build support ── (handlers defined after handleLetterPress)
  const draggingRef = useRef(false);
  const lastDragIdxRef = useRef<number | null>(null);
  const dragStartIdxRef = useRef<number | null>(null);
  const dragEngagedRef = useRef(false);

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

  // Auto-submit after 2s idle when word is long enough
  useEffect(() => {
    if (idleSubmitTimerRef.current) { clearTimeout(idleSubmitTimerRef.current); idleSubmitTimerRef.current = null; }
    if (builtLetters.length >= 3 && !gameOverRef.current) {
      idleSubmitTimerRef.current = setTimeout(() => {
        idleSubmitTimerRef.current = null;
        handleSubmitRef.current();
      }, 2000);
    }
    return () => { if (idleSubmitTimerRef.current) { clearTimeout(idleSubmitTimerRef.current); idleSubmitTimerRef.current = null; } };
  }, [builtLetters]);

  const builtWord = useMemo(
    () => builtLetters.map(bl => bl.letter).join(''),
    [builtLetters],
  );

  // Timer
  useEffect(() => {
    if (gameOverRef.current || paused) return;
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
  }, [duration, onComplete, onEffect, playEpicVictorySound, playCountdownBeep, paused]);

  // ── Feedback toast ──
  const showFeedback = useCallback((message: string, type: 'success' | 'error') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 1500);
    if (type === 'error') {
      setWordBuilderShake(true);
      haptic([30, 50, 30]);
      setTimeout(() => setWordBuilderShake(false), 400);
    }
  }, []);

  // ── Letter tap (toggle: add if unused, remove matching if already used;
  //    double-tap within DOUBLE_TAP_MS submits the built word) ──
  const handleLetterPress = useCallback((letter: string, wheelIndex: number, el: HTMLButtonElement) => {
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
      playButtonClickSound();
      haptic(8);
      lastTapRef.current = { idx: wheelIndex, time: now };
      return;
    }
    setBuiltLetters(prev => [...prev, { letter, wheelIndex }]);
    playTileSelectSound();
    haptic(10);
    lastTapRef.current = { idx: wheelIndex, time: now };
    // Get element position for particle effect
    const rect = el.getBoundingClientRect();
    const containerRect = gameContainerRef.current?.getBoundingClientRect();
    if (containerRect) {
      onEffect({
        type: 'letterTap',
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
      });
    }
  }, [onEffect, playTileSelectSound, playButtonClickSound]);

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
      const startBtn = document.querySelector<HTMLButtonElement>(
        `[data-wheel-index="${startIdx}"]`,
      );
      if (startBtn && !usedIndicesRef.current.has(startIdx)) {
        handleLetterPress(startBtn.dataset.wheelLetter || '', startIdx, startBtn);
      }
    }
    if (usedIndicesRef.current.has(idx)) return;
    lastDragIdxRef.current = idx;
    handleLetterPress(btn.dataset.wheelLetter || '', idx, btn);
  }, [handleLetterPress]);
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    dragEngagedRef.current = false;
    lastDragIdxRef.current = null;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const btn = el?.closest<HTMLButtonElement>('[data-wheel-letter]');
    dragStartIdxRef.current = btn ? Number(btn.dataset.wheelIndex) : null;
  }, []);
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    tryDragHit(e.clientX, e.clientY);
  }, [tryDragHit]);
  const handlePointerUp = useCallback(() => {
    const wasEngaged = dragEngagedRef.current;
    draggingRef.current = false;
    lastDragIdxRef.current = null;
    dragStartIdxRef.current = null;
    dragEngagedRef.current = false;
    if (wasEngaged && builtLettersRef.current.length >= 3) {
      if (idleSubmitTimerRef.current) { clearTimeout(idleSubmitTimerRef.current); idleSubmitTimerRef.current = null; }
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

  // ── Shuffle outer letters ──
  const handleShuffle = useCallback(() => {
    setOuterLetters(prev => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
    playBoardShuffleSound();
  }, [playBoardShuffleSound]);

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
      showFeedback(t('wordWheel.tooShort').replace('{min}', '3'), 'error');
      onEffect({ type: 'error', x: cx, y: 80 });
      playWordRejectedSound();
      return;
    }

    if (!word.includes(puzzle.centerLetter.toUpperCase())) {
      showFeedback(t('wordWheel.missingCenter').replace('{letter}', puzzle.centerLetter), 'error');
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

        // Sound + haptic feedback
        const isPangram = word.length >= 9;
        if (isPangram) {
          playLegendaryWordSound();
          haptic([50, 30, 50, 30, 80]);
        } else {
          playWordAcceptedSound();
          haptic(newCombo >= 2 ? [15, 30, 15, 30, 15] : 20);
        }
        if (newCombo >= 2) {
          playComboSound(newCombo);
        }

        // Trigger celebration effects
        if (isPangram) {
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
    }
  }, [builtWord, isValidating, puzzle, wordsFound, onValidateWord, showFeedback, t, onEffect, combo, playWordRejectedSound, playWordAcceptedSound, playLegendaryWordSound, playComboSound]);

  // Keep submit ref fresh so double-tap handler (created earlier) can reach the latest closure.
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  // Responsive wheel radius based on the wheel div width (not the game container)
  const [wheelRadius, setWheelRadius] = useState(72);
  useEffect(() => {
    const update = () => {
      if (wheelContainerRef.current) {
        const w = wheelContainerRef.current.getBoundingClientRect().width;
        // Radius should keep outer letters inside the wheel div (account for letter size ~52px)
        setWheelRadius(Math.max(56, Math.min(96, (w - 56) / 2)));
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
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

  return (
    <div ref={gameContainerRef} className="relative flex flex-col items-center w-full flex-1 max-w-lg mx-auto px-3 sm:px-4 pb-3">
      {/* ── Timer & Score Bar ── */}
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between w-full gap-2">
          <div className={cn('flex items-center gap-1.5 font-neo-display font-black text-lg sm:text-xl shrink-0', timerColor, timerPulse)}>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="tabular-nums">{minutes}:{seconds.toString().padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Combo counter */}
            <AnimatePresence>
              {combo >= 2 && (
                <motion.div
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-neo border-2 border-neo-black bg-linear-to-r from-neo-pink to-neo-red shadow-[0_0_10px_rgba(255,20,147,0.4)] shrink-0"
                  initial={{ scale: 0, x: 20 }}
                  animate={{ scale: 1, x: 0 }}
                  exit={{ scale: 0, x: 20 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  <Flame className="w-3.5 h-3.5 text-neo-white" />
                  <span className="font-neo-display font-black text-neo-white text-xs sm:text-sm">x{combo}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <span className="text-neo-cream/60 text-xs sm:text-sm font-semibold truncate">
              {t('wordWheel.wordsFound').replace('{count}', String(wordsFound.length))}
            </span>
            <motion.span
              key={score}
              className="font-neo-display font-black text-neo-lime text-lg sm:text-xl shrink-0"
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              {score}
            </motion.span>
          </div>
        </div>
        {/* Timer progress bar */}
        <div className="w-full h-1.5 rounded-full bg-neo-navy-light border border-neo-cream/10 overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full',
              timeLeft <= 10 ? 'bg-neo-red' : timeLeft <= 30 ? 'bg-neo-orange' : 'bg-linear-to-r from-neo-lime to-neo-cyan',
            )}
            style={{ width: `${(timeLeft / duration) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* ── Word Builder Area ── */}
      <motion.div
        className="relative w-full min-h-[52px] sm:min-h-[72px] flex items-center justify-center"
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
              <motion.span
                key="placeholder"
                className="text-neo-cream/30 font-neo-display text-base sm:text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {t('wordWheel.tapLetters')}
              </motion.span>
            ) : (
              builtLetters.map((bl, i) => (
                <WordTile
                  key={`${bl.wheelIndex}-${i}`}
                  letter={bl.letter}
                  index={i}
                  onRemove={handleRemoveLetter}
                  isCenter={bl.wheelIndex === -1}
                />
              ))
            )}
          </AnimatePresence>
        </div>
        {/* Inline feedback toast */}
        <AnimatePresence>
          {feedback && (
            <motion.div
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
            </motion.div>
          )}
        </AnimatePresence>
        {/* Flying score */}
        <AnimatePresence>
          {lastWordScore !== null && (
            <motion.div
              key={`score-${Date.now()}`}
              className="absolute top-0 left-1/2 -translate-x-1/2 font-neo-display font-black text-neo-lime text-3xl pointer-events-none z-20"
              initial={{ opacity: 1, y: 0, scale: 0.5 }}
              animate={{ opacity: 0, y: -60, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            >
              +{lastWordScore}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Words-to-pass next-rival hint (under word builder, above wheel) */}
      <AnimatePresence>
        {nextRival && (
          <motion.div
            className="mt-2 mb-1 px-2.5 py-1 rounded-neo border-2 border-neo-cream/20 bg-neo-navy-light/60 text-[11px] sm:text-xs text-neo-cream/80 font-semibold flex items-center gap-1.5"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <ChevronUp className="w-3 h-3 text-neo-lime" />
            <span>
              {t('wordWheel.wordsToPass')
                .replace('{count}', String(wordsToPass))
                .replace('{name}', nextRival.name)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pass notification toast */}
      <AnimatePresence>
        {passToast && (
          <motion.div
            className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-neo border-3 border-neo-black bg-linear-to-r from-neo-pink to-neo-purple text-neo-white font-neo-display font-black text-sm shadow-[3px_3px_0px_black,0_0_18px_rgba(255,20,147,0.5)] flex items-center gap-1.5 whitespace-nowrap"
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
          >
            <TrendingUp className="w-4 h-4" />
            {t('wordWheel.passedPlayer').replace('{name}', passToast)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Centered wheel region (absorbs leftover vertical space) ── */}
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 gap-1.5 py-2">
      {/* Tap-to-remove + double-tap-to-submit hint */}
      {builtLetters.length > 0 && (
        <p className="text-neo-cream/40 text-[10px] sm:text-xs text-center">
          {t('wordWheel.tapToRemove')} &middot; {t('wordWheel.doubleTapToSubmit')}
        </p>
      )}

      {/* ── The Wheel ── */}
      <div
        ref={wheelContainerRef}
        className="relative w-52 h-52 sm:w-64 sm:h-64 md:w-72 md:h-72 shrink-0 flex items-center justify-center touch-none"
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
        />
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-neo-lime/20"
          style={{ boxShadow: '0 0 24px rgba(191,255,0,0.12), inset 0 0 24px rgba(191,255,0,0.06)' }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
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
        />
        {/* Outer letters */}
        {outerLetters.map((letter, i) => (
          <WheelLetter
            key={letter}
            letter={letter}
            isCenter={false}
            angle={i * 60}
            radius={wheelRadius}
            onPress={(l, _, el) => handleLetterPress(l, i, el)}
            isUsed={usedIndices.has(i)}
            index={i}
          />
        ))}
      </div>

      {/* ── Center letter rule hint ── */}
      <p className="text-neo-cream/40 text-xs text-center">
        {t('wordWheel.centerLetterRule')} &middot; {t('wordWheel.minLetters').replace('{min}', '3')}
      </p>
      </div>

      {/* ── Action Buttons (sticky so Submit stays in view as found-words list grows) ── */}
      <div className="sticky bottom-0 z-30 w-full flex items-center justify-center gap-3 py-2 bg-linear-to-t from-neo-navy via-neo-navy/95 to-transparent">
        {/* Clear */}
        <motion.button
          type="button"
          onClick={handleClear}
          disabled={builtLetters.length === 0}
          className={cn(
            'p-3 rounded-neo border-3 border-neo-black bg-neo-navy-light text-neo-cream shadow-hard',
            'hover:bg-neo-navy active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
          whileTap={{ scale: 0.9 }}
          aria-label={t('wordWheel.clear')}
        >
          <RotateCcw className="w-5 h-5" />
        </motion.button>

        {/* Submit */}
        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={isValidating || builtWord.length < 3}
          className={cn(
            'px-8 py-3 rounded-neo border-3 border-neo-black font-neo-display font-black text-lg',
            builtWord.length >= 3
              ? 'bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black shadow-[3px_3px_0px_black,0_0_16px_rgba(191,255,0,0.3)] hover:shadow-[3px_3px_0px_black,0_0_22px_rgba(0,255,255,0.4)]'
              : 'bg-neo-navy-light text-neo-cream/40 shadow-hard-lg',
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
        </motion.button>

        {/* Shuffle */}
        <motion.button
          type="button"
          onClick={handleShuffle}
          className={cn(
            'p-3 rounded-neo border-3 border-neo-black bg-neo-navy-light text-neo-cream shadow-hard',
            'hover:bg-neo-navy active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
          )}
          whileTap={{ scale: 0.9, rotate: 180 }}
          transition={{ type: 'spring', stiffness: 300 }}
          aria-label={t('wordWheel.shuffle')}
        >
          <Shuffle className="w-5 h-5" />
        </motion.button>
      </div>

      {/* ── Found Words ── */}
      <AnimatePresence>
        {wordsFound.length > 0 && (
          <motion.div
            className="w-full"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <h3 className="text-neo-cream/50 text-xs font-bold uppercase mb-2">
              {t('wordWheel.foundWords')} ({wordsFound.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {wordsFound.map((word) => (
                <motion.span
                  key={word}
                  className={cn(
                    'px-2.5 py-1 rounded-neo border-2 text-neo-cream text-xs font-semibold shadow-hard-xs',
                    word === lastFoundWord
                      ? 'bg-neo-lime/20 border-neo-lime ring-1 ring-neo-lime/40'
                      : 'bg-neo-navy-light border-neo-black',
                  )}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={word === lastFoundWord
                    ? { scale: [0, 1.15, 1], opacity: 1 }
                    : { scale: 1, opacity: 1 }
                  }
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  {word} <span className="text-neo-lime font-black">+{scoreWord(word)}</span>
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WordWheelGame;
