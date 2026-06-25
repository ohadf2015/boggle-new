'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ChevronUp, Delete, RotateCcw, Sparkles } from 'lucide-react';
import { WheelLetter, WordTile } from '@/components/daily/WordWheelParts';
import { useWordWheelKeyboard } from '@/hooks/useWordWheelKeyboard';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { isValidWordWheelWord } from '@/utils/dailyChallenge/wordWheelGeneration';
import { cn } from '@/lib/utils';
import { WHEEL_RUSH_FOG_MS, WHEEL_RUSH_MIN_WORD_LEN } from '@/shared/constants/wheelRushConstants';
import type { Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';
import type { Language } from '@/types';
import { wheelWordDir } from '@/lib/wheelRush/wordDirection';
import Avatar from '@/components/Avatar';
import { MyWordsChips, type WordEntry } from './WheelRushPieces';
import { WheelRushHeader } from './WheelRushHeader';
import { WheelRushCelebration, type WheelCelebration } from './WheelRushCelebration';
import { classifyLetterCoverage } from '@/lib/wheelRush/letterCoverage';
import { selectClosestRival } from '@/lib/wheelRush/closestRival';
import { selectWheelRadius } from '@/lib/wordWheel/wheelGeometry';
import { fireConfetti } from '@/utils/confettiUtils';
import { FloatingReaction } from '@/components/game/QuickReactions';
import { useQuickReactions } from '@/hooks/useQuickReactions';
import { useMPFTUEIdle } from '@/hooks/useMPFTUEIdle';
import { MPDragCoachmark } from './MPDragCoachmark';
import { trackMpFtue } from '@/utils/posthogEngagement';

const WordWheelPixiRing = dynamic(() => import('@/components/daily/WordWheelPixiRing'), { ssr: false });

const haptic = (pattern: number | number[]) => {
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
};

interface WheelPuzzle {
  centerLetter: string;
  outerLetters: string[];
  allLetters: string[];
}

interface LeaderboardEntry {
  username: string;
  score: number;
  wordCount?: number;
  avatar?: AvatarType;
  presenceStatus?: PresenceStatus;
}

interface BuiltLetter { letter: string; wheelIndex: number }

interface Props {
  socket: Socket | null;
  username: string;
  leaderboard: LeaderboardEntry[];
  onQuit: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  /** Match countdown in seconds, sourced from MP startGame.timerSeconds. Null while server timer not yet known. */
  remainingTime?: number | null;
  /** Total match duration in seconds — drives CircularTimer ring fill in the header. */
  totalTime?: number | null;
  /** Called every ~250ms with 0..1 fog progress while fog is active, then 0 when fog clears. */
  onFogProgressChange?: (progress: number) => void;
  /** When true, hides the internal top-bar (leaderboard chips + timer + quit) and word chips —
   *  the MultiplayerDesktopShell handles those via the side rails. */
  isDesktopCanvas?: boolean;
  /** Language of the GAME (not the UI). Drives word-display direction so an
   *  English game reads left-to-right even for a Hebrew-UI (RTL) player. */
  gameLanguage?: Language | null;
}

const MIN_LEN = WHEEL_RUSH_MIN_WORD_LEN;


type WheelErrorCode =
  | 'too-short' | 'no-center' | 'bad-letters' | 'not-a-word'
  | 'already-closed' | 'locked-by-other' | 'duplicate';

const ERROR_KEY: Record<WheelErrorCode, string> = {
  'too-short': 'wordWheel.tooShort',
  'no-center': 'wordWheel.missingCenter',
  'bad-letters': 'wordWheel.invalidLetters',
  'not-a-word': 'wordWheel.notInDictionary',
  'already-closed': 'wordWheel.alreadyClosed',
  'locked-by-other': 'wordWheel.lockedByOther',
  'duplicate': 'wordWheel.alreadyFound',
};

export const FogCountdown: React.FC<{ endsAt: number }> = ({ endsAt }) => {
  // Ref-driven: the 250ms tick writes textContent directly, never triggering a
  // React re-render or subtree reconcile. Childless leaf — safe to mutate.
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const format = () => `${Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))}s`;
    if (ref.current) ref.current.textContent = format();
    const id = setInterval(() => {
      if (ref.current) ref.current.textContent = format();
    }, 250);
    return () => clearInterval(id);
  }, [endsAt]);
  return <span ref={ref} data-testid="fog-countdown" className="opacity-60 tabular-nums" />;
};

export const WheelRushView: React.FC<Props> = ({ socket, username, leaderboard, onQuit, t, remainingTime, totalTime, onFogProgressChange, isDesktopCanvas = false, gameLanguage }) => {
  const {
    playTileSelectSound, playWordAcceptedSound, playWordRejectedSound,
    playButtonClickSound, playLegendaryWordSound,
  } = useSoundEffects();

  const prefersReduced = useReducedMotion();

  const [puzzle, setPuzzle] = useState<WheelPuzzle | null>(null);
  // Word-row direction follows the LETTERS on screen, not the gameLanguage prop
  // (which can arrive null at in-game render). Hebrew letters → rtl regardless;
  // an English game on a Hebrew UI keeps Latin letters L→R. See wheelWordDir.
  const wordDir = useMemo(() => wheelWordDir(puzzle?.allLetters, gameLanguage), [puzzle, gameLanguage]);
  const [outerLetters, setOuterLetters] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [builtLetters, setBuiltLetters] = useState<BuiltLetter[]>([]);
  const [myWords, setMyWords] = useState<WordEntry[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [wordBuilderShake, setWordBuilderShake] = useState(false);
  const [fogActive, setFogActive] = useState(false);
  // Seed at the center-clearing floor (see computeWheelRadius) so the pre-measure
  // first paint doesn't briefly collapse the petals onto the center letter.
  const [wheelRadius, setWheelRadius] = useState(76);
  const [celebration, setCelebration] = useState<WheelCelebration | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref-bridged so the once-bound socket onResult closure can reach the latest trigger.
  const celebrateRef = useRef<(tier: 'all' | 'almost', word: string) => void>(() => {});

  const { floatingReactions, dismissReaction } = useQuickReactions({ socket, username });

  // Next-rival hint — mirrors WordWheelGame.tsx for daily-challenge parity.
  // Hidden while fog-of-war is active so we don't leak masked opponent
  // scores. The slot itself stays mounted (reserved height) to prevent
  // mid-match layout shift when the pill toggles.
  // Single closest rival — same selection the header uses, so the pill and the
  // header chip never point at two different people. The pill is a *chase*
  // prompt, so it only shows when that one rival is ahead of me.
  const closestRival = useMemo(
    () => (fogActive ? null : selectClosestRival(leaderboard, username)),
    [leaderboard, username, fogActive],
  );
  const myScore = leaderboard.find(p => p.username === username)?.score ?? 0;
  const nextRival = closestRival && closestRival.score > myScore ? closestRival : null;
  const pointsToPass = nextRival ? nextRival.score - myScore : 0;

  const fbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Drag-release submits clear instantly on rejection; tap submits wait 1.5s.
  const lastSubmitWasDragRef = useRef(false);
  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastDragIdxRef = useRef<number | null>(null);
  const dragStartIdxRef = useRef<number | null>(null);
  const dragEngagedRef = useRef(false);
  const usedIndicesRef = useRef<Set<number>>(new Set());
  // Latest-builtLetters ref + submit ref let handlePointerUp finalize the drag without
  // re-creating the callback on every keystroke (matches WordWheelGame.tsx:165,176).
  const builtLettersRef = useRef<BuiltLetter[]>([]);
  const handleSubmitRef = useRef<() => void>(() => {});

  // Latest-value refs for socket handlers — prevent listener re-registration when
  // consumer-supplied values (t, sound funcs) change reference across renders.
  // Written in a commit-phase effect, NOT during render, so React Compiler can still
  // optimize this component (a `ref.current = …` in the render body bails the compiler,
  // "cannot access refs during render"). Socket/fog events fire async — always after
  // this effect runs — so the latest-value guarantee is unchanged.
  const latestRef = useRef({ t, puzzle, username, playWordAcceptedSound, playWordRejectedSound });
  const onFogProgressRef = useRef(onFogProgressChange);
  useEffect(() => {
    latestRef.current = { t, puzzle, username, playWordAcceptedSound, playWordRejectedSound };
    onFogProgressRef.current = onFogProgressChange;
  });

  // Fog flips off once at expiry. Drives onFogProgressChange every 250ms
  // so the desktop adapter's fog-progress meter stays live.
  useEffect(() => {
    if (startedAt == null) { setFogActive(false); return; }
    const remaining = startedAt + WHEEL_RUSH_FOG_MS - Date.now();
    if (remaining <= 0) { setFogActive(false); return; }
    setFogActive(true);

    const tick = () => {
      const progress = Math.min(1, (Date.now() - startedAt) / WHEEL_RUSH_FOG_MS);
      onFogProgressRef.current?.(progress);
    };
    tick();
    const tickId = setInterval(tick, 250);

    const expireId = setTimeout(() => {
      clearInterval(tickId);
      setFogActive(false);
      onFogProgressRef.current?.(0);
    }, remaining);

    return () => {
      clearTimeout(expireId);
      clearInterval(tickId);
    };
  }, [startedAt]);

  // Track which wheel indices are used (-1 for center)
  const usedIndices = useMemo(() => {
    const set = new Set<number>();
    for (const bl of builtLetters) set.add(bl.wheelIndex);
    return set;
  }, [builtLetters]);
  useEffect(() => { usedIndicesRef.current = usedIndices; }, [usedIndices]);
  useEffect(() => {
    builtLettersRef.current = builtLetters;
    // Any user input during the 1.5s post-error window cancels the reset
    // so a fresh attempt isn't wiped mid-typing.
    if (builtLetters.length > 0 && autoResetTimerRef.current) {
      clearTimeout(autoResetTimerRef.current);
      autoResetTimerRef.current = null;
    }
  }, [builtLetters]);
  useEffect(() => () => {
    if (autoResetTimerRef.current) { clearTimeout(autoResetTimerRef.current); autoResetTimerRef.current = null; }
  }, []);

  const builtWord = useMemo(
    () => builtLetters.map(bl => bl.letter).join(''),
    [builtLetters],
  );

  const flash = useCallback((type: 'ok' | 'err', msg: string) => {
    setFeedback({ type, msg });
    if (type === 'err') {
      setWordBuilderShake(true);
      haptic([30, 50, 30]);
      setTimeout(() => setWordBuilderShake(false), 400);
      // Auto-clear the rejected built word so the next attempt isn't blocked.
      // Drag-release errors clear instantly; tap errors get a 1.5s read window.
      if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
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
    } else {
      if (autoResetTimerRef.current) { clearTimeout(autoResetTimerRef.current); autoResetTimerRef.current = null; }
      lastSubmitWasDragRef.current = false;
    }
    if (fbTimer.current) clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => setFeedback(null), 1200);
  }, []);

  // Wheel-coverage celebration — fires when an accepted word uses all (or
  // all-but-one) distinct wheel letters, mirroring the daily-challenge pangram
  // beat. Single keyed state so a second pangram replaces (re-animates) rather
  // than queues. fireConfetti self-gates on reduced-motion/low-end devices.
  const triggerCelebration = useCallback((tier: 'all' | 'almost', word: string) => {
    setCelebration({ tier, word, key: Date.now() });
    playLegendaryWordSound?.();
    haptic([50, 30, 50, 30, 80]);
    fireConfetti({
      particleCount: tier === 'all' ? 60 : 36,
      spread: tier === 'all' ? 110 : 80,
      startVelocity: 50,
      origin: { y: 0.5 },
    });
    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    celebrationTimerRef.current = setTimeout(() => {
      celebrationTimerRef.current = null;
      setCelebration(null);
    }, 1900);
  }, [playLegendaryWordSound]);
  useEffect(() => { celebrateRef.current = triggerCelebration; }, [triggerCelebration]);
  useEffect(() => () => {
    if (celebrationTimerRef.current) { clearTimeout(celebrationTimerRef.current); celebrationTimerRef.current = null; }
  }, []);

  // Socket wiring
  useEffect(() => {
    if (!socket) return;

    const onInit = (data: {
      puzzle: WheelPuzzle;
      startedAt?: number;
      foundWords?: Record<string, string[]>;
      locks?: Record<string, { by: string; until: number }>;
      closed?: string[];
      myWords?: string[];
    }) => {
      const me = latestRef.current.username;
      setPuzzle(data.puzzle);
      setOuterLetters(data.puzzle.outerLetters);
      const sa = data.startedAt ?? Date.now();
      setStartedAt(sa);
      // Flip fog ON synchronously with startedAt so the next-rival memo
      // never sees fogActive=false on the same render that opponents
      // first appear (race that leaked masked scores). The off-flip
      // still belongs to the timeout effect below.
      if (Date.now() < sa + WHEEL_RUSH_FOG_MS) setFogActive(true);
      // Reconnect-snapshot hydration: rebuild client state from server payload.
      const mine = data.myWords ?? data.foundWords?.[me] ?? [];
      if (mine.length) {
        const closedSet = new Set(data.closed ?? []);
        const myLocks = data.locks ?? {};
        const ts = Date.now();
        setMyWords(mine.map(word => {
          const lk = myLocks[word];
          if (lk && lk.by === me) return { word, kind: 'locked', lockUntil: lk.until, ts };
          if (closedSet.has(word)) return { word, kind: 'closed', ts };
          return { word, kind: 'locked', ts };
        }));
      }
    };
    const onResult = (data: { word: string; accepted: boolean; kind?: string; score?: number; lockUntil?: number; stolenFrom?: string; error?: string }) => {
      const { t: tt, puzzle: pz, playWordAcceptedSound: accSfx, playWordRejectedSound: rejSfx } = latestRef.current;
      if (!data.accepted) {
        const code = data.error as WheelErrorCode | undefined;
        const key = code && ERROR_KEY[code] ? ERROR_KEY[code] : 'wordWheel.notInDictionary';
        const msg = tt(key, { min: MIN_LEN, letter: pz?.centerLetter ?? '' }) || key;
        flash('err', msg);
        rejSfx();
        return;
      }
      if (data.kind === 'locked') {
        // Dedup by word: a duplicate result emission, or a buffered accept that
        // lands right after a reconnect snapshot already hydrated this word,
        // must not add a second chip. Each word is unique in the list (the
        // stolen/closed handlers mutate the single matching entry in place).
        setMyWords(prev => prev.some(w => w.word === data.word)
          ? prev
          : [{ word: data.word, kind: 'locked', score: data.score, lockUntil: data.lockUntil, ts: Date.now() }, ...prev]);
        flash('ok', `+${data.score}`);
      } else if (data.kind === 'stolen') {
        setMyWords(prev => prev.some(w => w.word === data.word)
          ? prev
          : [{ word: data.word, kind: 'stolen', score: data.score, stolenFrom: data.stolenFrom, ts: Date.now() }, ...prev]);
        flash('ok', tt('wordWheel.stealGain', { score: data.score ?? 0 }) || `+${data.score}`);
      }
      const coverage = classifyLetterCoverage(data.word, pz?.allLetters ?? []);
      if (coverage !== 'none') celebrateRef.current(coverage, data.word);
      accSfx();
      haptic(20);
      setBuiltLetters([]);
    };
    const onStolen = (data: { word: string; by?: string; from?: string }) => {
      const { t: tt, username: me, playWordRejectedSound: rejSfx } = latestRef.current;
      if (data.from === me) {
        setMyWords(prev => prev.map(w =>
          w.word === data.word && w.kind === 'locked'
            ? { ...w, kind: 'stolen-from-me' as const, stolenFrom: data.by }
            : w,
        ));
        flash('err', tt('wordWheel.yourWordStolen', { word: data.word, by: data.by ?? '' }) || 'Stolen!');
        rejSfx();
        haptic([40, 30, 40]);
      }
    };
    const onClosed = (data: { word: string; finder: string }) => {
      setMyWords(prev => prev.map(w => (w.word === data.word && w.kind === 'locked' ? { ...w, kind: 'closed' as const } : w)));
    };

    socket.on('wheelRushInit', onInit);
    socket.on('wheelWordResult', onResult);
    socket.on('wheelWordStolen', onStolen);
    socket.on('wheelWordClosed', onClosed);

    socket.emit('requestWheelRushState');
    const onReconnect = () => socket.emit('requestWheelRushState');
    socket.on('connect', onReconnect);
    return () => {
      socket.off('wheelRushInit', onInit);
      socket.off('wheelWordResult', onResult);
      socket.off('wheelWordStolen', onStolen);
      socket.off('wheelWordClosed', onClosed);
      socket.off('connect', onReconnect);
    };
  }, [socket, flash]);

  // FTUE — drag-teaching coachmark after 20s of no activity / no word.
  // Hides forever on first valid word; persists 'dismissed' to localStorage.
  const ftue = useMPFTUEIdle({
    enabled: !!puzzle,
    wordsFound: myWords.length,
    onShown: () => trackMpFtue({ event: 'shown', mode: 'wheel_rush' }),
  });

  // Letter tap handler — parity with SP WordWheelGame:386.
  // Re-tap on a used wheel index toggles it off (removes from built word) instead
  // of duplicating. Each wheelIndex appears at most once in builtLetters.
  const handleLetterPress = useCallback((letter: string, wheelIndex: number, _el: HTMLButtonElement) => {
    ftue.markActivity();
    const existingIdx = builtLettersRef.current.findIndex(bl => bl.wheelIndex === wheelIndex);
    if (existingIdx !== -1) {
      setBuiltLetters(prev => prev.filter((_, i) => i !== existingIdx));
      playButtonClickSound();
      haptic(8);
      return;
    }
    setBuiltLetters(prev => [...prev, { letter, wheelIndex }]);
    playTileSelectSound();
    haptic(10);
  }, [playTileSelectSound, playButtonClickSound, ftue]);

  // Drag-to-build — drag engages only after pointer moves to a DIFFERENT letter,
  // so single taps are handled by the button's native onClick (no double-fire).
  const tryDragHit = useCallback((clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const btn = el?.closest<HTMLButtonElement>('[data-wheel-letter]');
    if (!btn || btn.disabled) return;
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
    // Auto-submit when drag actually traversed letters and built ≥MIN_LEN — mirrors WordWheelGame.tsx:334.
    if (wasEngaged && builtLettersRef.current.length >= MIN_LEN) {
      lastSubmitWasDragRef.current = true;
      handleSubmitRef.current();
    }
  }, []);

  const handleRemoveLetter = useCallback((index: number) => {
    setBuiltLetters(prev => prev.filter((_, i) => i !== index));
    playButtonClickSound();
  }, [playButtonClickSound]);

  const handleClear = useCallback(() => {
    setBuiltLetters([]);
    playButtonClickSound();
  }, [playButtonClickSound]);

  // Remove just the last built letter (backspace). Pairs with Clear (wipe all);
  // replaces the old shuffle button. Parity with daily WordWheelGame.
  const handleBackspace = useCallback(() => {
    setBuiltLetters(prev => prev.slice(0, -1));
    playButtonClickSound();
  }, [playButtonClickSound]);

  const handleSubmit = useCallback(() => {
    if (!socket || !puzzle || builtLetters.length === 0) return;
    const word = builtWord.toUpperCase();

    if (word.length < MIN_LEN) {
      flash('err', t('wordWheel.tooShort', { min: MIN_LEN }) || `Too short (min ${MIN_LEN} letters)`);
      playWordRejectedSound();
      return;
    }
    if (!word.includes(puzzle.centerLetter.toUpperCase())) {
      flash('err', t('wordWheel.missingCenter', { letter: puzzle.centerLetter }) || `Missing center letter (${puzzle.centerLetter})`);
      playWordRejectedSound();
      return;
    }
    if (!isValidWordWheelWord(word, puzzle.centerLetter, puzzle.allLetters)) {
      flash('err', t('wordWheel.invalidLetters') || 'Invalid letters');
      playWordRejectedSound();
      return;
    }

    socket.emit('submitWheelWord', { word });
  }, [socket, puzzle, builtLetters.length, builtWord, flash, t, playWordRejectedSound]);

  // Keep submit ref fresh so handlePointerUp can reach the latest closure without re-binding pointer handlers.
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  // Responsive wheel radius — observe the container directly. Browser batches
  // ResizeObserver callbacks per-frame, so rapid window resizes won't thrash.
  useEffect(() => {
    const el = wheelContainerRef.current;
    if (!el) return;
    const shortVp = typeof window !== 'undefined' ? window.matchMedia('(max-height: 600px)') : null;
    const update = () => {
      const rect = el.getBoundingClientRect();
      // Shared selector — keeps the orbit cap in lockstep with the daily wheel
      // (both render the same square container). Previously capped at 96 here,
      // which shrank the flower inside a full-size rim on phones.
      setWheelRadius(
        selectWheelRadius({
          width: rect.width,
          height: rect.height,
          isDesktop: isDesktopCanvas,
          isShort: !isDesktopCanvas && !!shortVp?.matches,
        }),
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    shortVp?.addEventListener?.('change', update);
    return () => {
      ro.disconnect();
      shortVp?.removeEventListener?.('change', update);
    };
  }, [puzzle, isDesktopCanvas]);

  // Keyboard input (shared hook)
  useWordWheelKeyboard({
    centerLetter: puzzle?.centerLetter ?? '',
    outerLetters,
    usedIndices,
    handleSubmit,
    handleClear,
    setBuiltLetters,
    gameOver: false,
    playTileSelectSound,
    playButtonClickSound,
  });

  const fogEndsAt = (startedAt ?? 0) + WHEEL_RUSH_FOG_MS;
  if (!puzzle) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy text-neo-white">
        <div className="animate-pulse font-neo-display">{t('wheel.rush.loading') || 'Loading wheel...'}</div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col items-center min-h-0 bg-neo-navy p-3 md:p-4 gap-2 overflow-hidden">
      {/* Inner column caps width to match the daily-challenge wheel (max-w-lg)
          so the play area has the same proportions on desktop instead of
          stretching edge-to-edge. bg stays full-bleed on outer. */}
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col min-h-0 gap-2">
      {/* Top bar: opponent progress rail + prominent self score + timer + quit
          — hidden in desktop shell (handled by side rails). */}
      {!isDesktopCanvas && (
        <WheelRushHeader
          leaderboard={leaderboard}
          username={username}
          fogActive={fogActive}
          remainingTime={remainingTime}
          totalTime={totalTime}
          onQuit={onQuit}
          t={t}
        />
      )}

      {fogActive && (
        <div className="text-center text-xs sm:text-sm text-neo-cyan font-neo-display font-bold tracking-wide flex items-center justify-center gap-2 shrink-0">
          <span className={cn('inline-block w-1.5 h-1.5 rounded-full bg-neo-cyan', !prefersReduced && 'animate-pulse')} />
          {t('wheel.rush.fogActive') || 'Fog of War active!'}
          <FogCountdown endsAt={fogEndsAt} />
        </div>
      )}

      {/* Word builder (shared shake + motion). Fixed height (not min-h) mirrors
          the daily challenge so the row never grows as tiles wrap. */}
      <m.div
        className="relative w-full h-[52px] sm:h-[72px] short:h-[44px] flex items-center justify-center"
        animate={
          wordBuilderShake && !prefersReduced
            ? { x: [-4, 4, -3, 3, -1, 0] }
            : { scale: prefersReduced ? 1 : 1 + builtLetters.length * 0.008 }
        }
        transition={wordBuilderShake && !prefersReduced
          ? { duration: 0.35 }
          : prefersReduced
            ? { duration: 0 }
            : { type: 'spring', stiffness: 300, damping: 20 }
        }
      >
        <div dir={wordDir} className="relative flex items-center justify-center gap-1 sm:gap-2 flex-wrap max-w-full w-full">
          {/* Placeholder is absolute-centered so layout never reflows when letters clear/repopulate
              (prevents post-reset horizontal shift). */}
          <m.span
            aria-hidden={builtLetters.length > 0}
            className="absolute inset-0 flex items-center justify-center text-neo-white font-neo-display text-base sm:text-lg pointer-events-none"
            animate={{ opacity: builtLetters.length === 0 ? 1 : 0 }}
            transition={{ duration: 0.18 }}
          >
            {t('wordWheel.tapLetters') || 'Tap letters to build a word'}
          </m.span>
          {builtLetters.map((bl, i) => (
            <WordTile
              key={`${bl.wheelIndex}-${i}`}
              letter={bl.letter}
              index={i}
              onRemove={handleRemoveLetter}
              isCenter={bl.wheelIndex === -1}
            />
          ))}
        </div>
        <AnimatePresence>
          {feedback && (
            <m.div
              // dir="auto" so localized feedback (Hebrew messages like "מילה
              // קצרה מדי") renders RTL while score strings like "+45" stay LTR.
              dir="auto"
              className={cn(
                'absolute -bottom-7 left-1/2 -translate-x-1/2 px-3 py-1 rounded-neo border-2 border-neo-black text-sm font-bold whitespace-nowrap z-20',
                feedback.type === 'ok' ? 'bg-neo-lime text-neo-black' : 'bg-neo-red text-neo-white',
              )}
              initial={{ opacity: 0, y: -10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
            >
              {feedback.msg}
            </m.div>
          )}
        </AnimatePresence>
      </m.div>

      {/* Points-to-pass next-rival hint. Reserved-height slot —
          ALWAYS rendered so toggling visibility never shifts the wheel.
          Hidden during fog-of-war (don't reveal opponent scores). */}
      <div
        data-testid="mp-next-rival-slot"
        className="w-full mt-1 min-h-[30px] sm:min-h-[32px] flex items-center justify-center shrink-0"
      >
        <AnimatePresence>
          {nextRival && (
            <m.div
              data-testid="mp-next-rival-pill"
              className="px-2.5 py-1 rounded-neo border-2 border-neo-cream/20 bg-neo-navy-light/60 text-[11px] sm:text-xs text-neo-white font-semibold flex items-center gap-1.5"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <ChevronUp className="w-3 h-3 text-neo-lime" />
              <Avatar
                pixelSize={20}
                customAvatar={nextRival.avatar?.customAvatar}
                userId={nextRival.username}
                className="shrink-0 rounded-full"
              />
              <span dir="auto" translate="no" className="notranslate">
                {t('wordWheel.pointsToPass', { count: pointsToPass, name: nextRival.username })}
              </span>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Wheel + actions cluster — kept tight together, vertically centered.
          container-type:size lets the wheel's max-* height cap (below) read the
          cluster's block size via cqb. */}
      <div className="@container/wheel [container-type:size] flex-1 flex flex-col items-center justify-center w-full min-h-0 gap-2 py-1 short:gap-0.5 short:py-0" data-testid="wheel-cluster">
        {/* Tap-to-remove + double-tap-to-submit hint — reserved-height slot
            (mirrors the daily challenge) so the wheel never shifts when the
            hint text mounts/unmounts. */}
        <div data-testid="tap-hint-slot" className="h-[14px] sm:h-[16px] flex items-center justify-center">
          {builtLetters.length > 0 && (
            <p className="text-neo-white text-[10px] sm:text-xs text-center">
              {t('wordWheel.tapToRemove')} &middot; {t('wordWheel.doubleTapToSubmit')}
            </p>
          )}
        </div>
        <div
          ref={wheelContainerRef}
          className={cn(
            "relative flex items-center justify-center touch-none shrink-0",
            // Height-cap binds only when smaller than the fixed size → tall screens
            // unchanged, short/landscape ones shrink to fit. Sizing + reserve
            // (~116px: tap-hint + rule hint + action bar + gaps) match the daily
            // challenge wheel for visual parity; floor 176px.
            isDesktopCanvas
              ? "w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96"
              // On short viewports (<=600px tall) drop the floor to 132px and
              // the reserve to 72px so the wheel keeps shrinking instead of
              // overflowing the `justify-center` cluster — which spilled the
              // action bar onto the found-words chips below. Mirrors
              // WordWheelGame.tsx:977.
              : "w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 max-w-[max(176px,calc(100cqb-116px))] max-h-[max(176px,calc(100cqb-116px))] short:max-w-[max(132px,min(calc(100cqb-72px),46svh))] short:max-h-[max(132px,min(calc(100cqb-72px),46svh))]",
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <WordWheelPixiRing
            selectedIndices={builtLetters.map(bl => bl.wheelIndex)}
            radius={wheelRadius}
            combo={0}
          />
          <m.div
            className="absolute inset-0 rounded-full border-2 border-neo-lime/20"
            style={{ boxShadow: '0 0 24px rgba(191,255,0,0.12), inset 0 0 24px rgba(191,255,0,0.06)' }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-4 sm:inset-5 rounded-full border border-neo-cyan/10" />
          <div className="absolute inset-8 sm:inset-10 rounded-full border border-neo-cream/5" />

          <WheelLetter
            letter={puzzle.centerLetter}
            isCenter
            onPress={(letter, _i, el) => handleLetterPress(letter, -1, el)}
            isUsed={usedIndices.has(-1)}
            index={-1}
          />
          {outerLetters.map((letter, i) => (
            <WheelLetter
              key={`${letter}-${i}`}
              letter={letter}
              isCenter={false}
              angle={(360 / outerLetters.length) * i}
              radius={wheelRadius}
              onPress={(l, _idx, el) => handleLetterPress(l, i, el)}
              isUsed={usedIndices.has(i)}
              index={i}
            />
          ))}
          {ftue.visible && (
            <MPDragCoachmark
              t={t}
              accent="pink"
              onDismiss={() => {
                trackMpFtue({ event: 'dismissed', mode: 'wheel_rush', reason: 'manual' });
                ftue.dismiss();
              }}
            />
          )}
        </div>
        <p className="text-neo-white text-xs text-center px-2">
          {t('wordWheel.centerLetterRule') || 'Must include center letter'} &middot; {(t('wordWheel.minLetters') || 'Min {min} letters').replace('{min}', String(MIN_LEN))}
        </p>

        {/* Actions (Clear / Submit / Remove-last) — sit directly under the wheel
            so the player's thumb stays in the wheel's gravity well. */}
        <div data-testid="word-wheel-action-bar" className="w-full flex items-center justify-center gap-3 shrink-0 mt-1 short:mt-0">
        <m.button
          type="button"
          onClick={handleClear}
          disabled={builtLetters.length === 0}
          className={cn(
            'p-3 rounded-neo border-3 border-neo-black bg-neo-navy-light text-neo-white shadow-hard',
            'hover:bg-neo-navy active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
          whileTap={prefersReduced ? {} : { scale: 0.9 }}
          aria-label={t('wordWheel.clear') || 'Clear'}
        >
          <RotateCcw className="w-5 h-5" />
        </m.button>

        <m.button
          type="button"
          onClick={handleSubmit}
          disabled={builtWord.length < MIN_LEN}
          className={cn(
            'px-8 py-3 rounded-neo border-3 border-neo-black font-neo-display font-black text-lg',
            builtWord.length >= MIN_LEN
              ? 'bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black shadow-[3px_3px_0px_black,0_0_16px_rgba(191,255,0,0.3)] hover:shadow-[3px_3px_0px_black,0_0_22px_rgba(0,255,255,0.4)]'
              : 'bg-neo-navy-light text-neo-white shadow-hard-lg',
            'active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
            'disabled:cursor-not-allowed',
          )}
          whileTap={prefersReduced || builtWord.length < MIN_LEN ? {} : { scale: 0.92 }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {t('wordWheel.submit') || 'Submit'}
          </div>
        </m.button>

        <m.button
          type="button"
          onClick={handleBackspace}
          disabled={builtLetters.length === 0}
          className={cn(
            'p-3 rounded-neo border-3 border-neo-black bg-neo-navy-light text-neo-white shadow-hard',
            'hover:bg-neo-navy active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
          whileTap={prefersReduced ? {} : { scale: 0.9 }}
          aria-label={t('wordWheel.removeLetter') || 'Remove letter'}
        >
          <Delete className="w-5 h-5" />
        </m.button>
        </div>

      </div>

      {/* Found words — sit below the wheel cluster, mirroring the daily
          challenge's found-words slot (fixed-height slot inside MyWordsChips
          keeps the layout from reflowing). */}
      {!isDesktopCanvas && <MyWordsChips words={myWords} dir={wordDir} />}

      <WheelRushCelebration celebration={celebration} t={t} prefersReduced={!!prefersReduced} />
      </div>

      <div className="pointer-events-none absolute inset-0 z-40">
        {floatingReactions.map(r => (
          <FloatingReaction
            key={r.id}
            id={r.id}
            emoji={r.emoji}
            username={r.username}
            x={r.x}
            y={r.y}
            onComplete={dismissReaction}
          />
        ))}
      </div>
    </div>
  );
};

export default WheelRushView;
