'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWheelLetterInput } from '@/components/daily/wheel/useWheelLetterInput';
import WheelActionBar from '@/components/daily/wheel/WheelActionBar';
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
import WheelPassToasts from '@/components/daily/wheel/WheelPassToasts';
import { WheelRushHeader } from './WheelRushHeader';
import { WheelRushCelebration, type WheelCelebration } from './WheelRushCelebration';
import { classifyLetterCoverage, missingWheelLetter } from '@/lib/wheelRush/letterCoverage';
import { selectClosestRival } from '@/lib/wheelRush/closestRival';
import { selectWheelRadius } from '@/lib/wordWheel/wheelGeometry';
import { fireConfetti } from '@/utils/confettiUtils';
import { FloatingReaction } from '@/components/game/QuickReactions';
import { useQuickReactions } from '@/hooks/useQuickReactions';
import { useStuckCoach } from '@/hooks/useStuckCoach';
import { StuckCoachOverlay } from '@/components/game/ftue/StuckCoachOverlay';
import { trackMpFtue } from '@/utils/posthogEngagement';
import { useWordVerdict } from '@/lib/wordVerdict/useWordVerdict';
import { reasonFromCode, VERDICT_MS } from '@/lib/wordVerdict/wordVerdict';

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
/** Over my (still empty) words slot, below the wheel and its action bar. */
const RUSH_COACH_ANCHOR = { selector: '[data-testid="my-words-slot"]', edge: 'over' } as const;



export const FogCountdown: React.FC<{ endsAt: number }> = ({ endsAt }) => {
  // Ref-driven: the 250ms tick writes textContent directly, never triggering a
  // React re-render or subtree reconcile. Childless leaf — safe to mutate.
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const format = () => {
      const sec = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    };
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
  const verdicts = useWordVerdict({ t, playRejectedSound: playWordRejectedSound });

  const [puzzle, setPuzzle] = useState<WheelPuzzle | null>(null);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
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
  // Consecutive 'all'-tier clears this round — powers the streak badge (variable reward).
  const wheelStreakRef = useRef(0);
  // Consecutive ACCEPTED words (any tier) this round — drives the ring's combo glow
  // (WordWheelPixiRing already supports it; daily-challenge wires it, Wheel Rush never did).
  const [comboLevel, setComboLevel] = useState(0);
  // Ref-bridged so the once-bound socket onResult closure can reach the latest trigger.
  const celebrateRef = useRef<(tier: 'all' | 'almost', word: string, missingLetter?: string | null) => void>(() => {});

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

  // "You passed X" toasts — the mirror of the pointsToPass pill above: that
  // pill already celebrates falling behind, this celebrates catching up.
  // Mirrors the daily wheel's usePassToasts (useWheelRivals.ts), simplified
  // since MP already has a live leaderboard (no fetch/poll needed).
  const [passToasts, setPassToasts] = useState<Array<{ id: number; name: string }>>([]);
  const passedRivalsRef = useRef<Set<string>>(new Set());
  const passToastIdRef = useRef(0);
  const passToastTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  useEffect(() => {
    if (fogActive) return;
    const newlyPassed = leaderboard.filter(p =>
      p.username !== username && p.score > 0 && p.score < myScore && !passedRivalsRef.current.has(p.username)
    );
    newlyPassed.forEach((p, i) => {
      passedRivalsRef.current.add(p.username);
      const id = ++passToastIdRef.current;
      const showTimer = setTimeout(() => {
        passToastTimersRef.current.delete(showTimer);
        haptic(15);
        setPassToasts(prev => [...prev, { id, name: p.username }]);
        const hideTimer = setTimeout(() => {
          passToastTimersRef.current.delete(hideTimer);
          setPassToasts(prev => prev.filter(toast => toast.id !== id));
        }, 2400);
        passToastTimersRef.current.add(hideTimer);
      }, i * 250);
      passToastTimersRef.current.add(showTimer);
    });
  }, [leaderboard, myScore, username, fogActive]);
  useEffect(() => () => {
    passToastTimersRef.current.forEach(clearTimeout);
    passToastTimersRef.current.clear();
  }, []);

  const fbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Drag-release submits clear instantly on rejection; tap submits wait 1.5s.
  const lastSubmitWasDragRef = useRef(false);
  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const handleSubmitRef = useRef<() => void>(() => {});

  // Latest-value refs for socket handlers — prevent listener re-registration when
  // consumer-supplied values (t, sound funcs) change reference across renders.
  // Written in a commit-phase effect, NOT during render, so React Compiler can still
  // optimize this component (a `ref.current = …` in the render body bails the compiler,
  // "cannot access refs during render"). Socket/fog events fire async — always after
  // this effect runs — so the latest-value guarantee is unchanged.
  const latestRef = useRef({ puzzle, username, playWordAcceptedSound });
  const onFogProgressRef = useRef(onFogProgressChange);
  useEffect(() => {
    latestRef.current = { puzzle, username, playWordAcceptedSound };
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

  useEffect(() => {
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

  const flash = useCallback((type: 'ok' | 'err', msg: string, holdMs = VERDICT_MS) => {
    setFeedback({ type, msg });
    if (type === 'err') {
      setWordBuilderShake(true);
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => {
        shakeTimer.current = null;
        setWordBuilderShake(false);
      }, 400);
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
    fbTimer.current = setTimeout(() => setFeedback(null), holdMs);
  }, []);

  // Wheel-coverage celebration — fires when an accepted word uses all (or
  // all-but-one) distinct wheel letters, mirroring the daily-challenge pangram
  // beat. Single keyed state so a second pangram replaces (re-animates) rather
  // than queues. fireConfetti self-gates on reduced-motion/low-end devices.
  const triggerCelebration = useCallback((tier: 'all' | 'almost', word: string, missingLetter?: string | null) => {
    wheelStreakRef.current = tier === 'all' ? wheelStreakRef.current + 1 : 0;
    setCelebration({ tier, word, key: Date.now(), streak: wheelStreakRef.current, missingLetter: missingLetter ?? undefined });
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
    if (fbTimer.current) { clearTimeout(fbTimer.current); fbTimer.current = null; }
    if (shakeTimer.current) { clearTimeout(shakeTimer.current); shakeTimer.current = null; }
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
      wheelStreakRef.current = 0;
      setComboLevel(0);
      setLoadTimedOut(false);
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
    const onResult = (data: { word: string; accepted: boolean; kind?: string; score?: number; lockUntil?: number; error?: string }) => {
      const { puzzle: pz, playWordAcceptedSound: accSfx } = latestRef.current;
      if (!data.accepted) {
        const v = verdicts.reject(data.word, reasonFromCode(data.error) ?? 'not-a-word', { min: MIN_LEN, letter: pz?.centerLetter ?? '' });
        flash('err', v.message, v.durationMs);
        if (v.breaksCombo) setComboLevel(0);
        return;
      }
      verdicts.clearRepeat();
      if (data.kind === 'locked') {
        // Dedup by word: a duplicate result emission, or a buffered accept that
        // lands right after a reconnect snapshot already hydrated this word,
        // must not add a second chip. Each word is unique in the list.
        setMyWords(prev => prev.some(w => w.word === data.word)
          ? prev
          : [{ word: data.word, kind: 'locked', score: data.score, lockUntil: data.lockUntil, ts: Date.now() }, ...prev]);
        flash('ok', `+${data.score}`);
        setComboLevel(c => c + 1);
      }
      const coverage = classifyLetterCoverage(data.word, pz?.allLetters ?? []);
      if (coverage !== 'none') {
        const missingLetter = coverage === 'almost' ? missingWheelLetter(data.word, pz?.allLetters ?? []) : null;
        celebrateRef.current(coverage, data.word, missingLetter);
      }
      accSfx();
      haptic(20);
      setBuiltLetters([]);
    };

    socket.on('wheelRushInit', onInit);
    socket.on('wheelWordResult', onResult);

    socket.emit('requestWheelRushState');
    const onReconnect = () => socket.emit('requestWheelRushState');
    socket.on('connect', onReconnect);
    // If wheelRushState isn't ready server-side yet (puzzle-gen race / cold
    // trie), handleRequestWheelRushState silently no-ops — no error, no retry.
    // Without this, the client sits on the loading spinner forever. One retry,
    // then show an error state so the player isn't stuck with no feedback.
    const retryTimer = setTimeout(() => socket.emit('requestWheelRushState'), 4000);
    const timeoutTimer = setTimeout(() => {
      if (!latestRef.current.puzzle) setLoadTimedOut(true);
    }, 9000);
    return () => {
      socket.off('wheelRushInit', onInit);
      socket.off('wheelWordResult', onResult);
      socket.off('connect', onReconnect);
      clearTimeout(retryTimer);
      clearTimeout(timeoutTimer);
    };
  }, [socket, flash, verdicts]);

  const ftue = useStuckCoach({
    mode: 'wheelRush',
    active: !!puzzle,
    wordsFound: myWords.length,
    onShown: () => trackMpFtue({ event: 'shown', mode: 'wheel_rush' }),
    onDismissed: () => trackMpFtue({ event: 'dismissed', mode: 'wheel_rush', reason: 'manual' }),
  });

  // Same tap / double-tap / hold-to-submit / drag spelling as the daily wheel.
  const noop = useCallback(() => {}, []);
  const gameOverRef = useRef(false);
  const {
    usedIndices, holdActiveIndex, holdPointerDown, holdPointerEnd,
    handleLetterPress, handlePointerDown, handlePointerMove, handlePointerUp,
    handleRemoveLetter, handleClear, handleBackspace,
  } = useWheelLetterInput({
    builtLetters, setBuiltLetters, gameOverRef, handleSubmitRef, lastSubmitWasDragRef,
    gameContainerRef: wheelContainerRef, cancelIdleSubmit: noop, onActivity: ftue.markActivity,
    onEffect: noop, playTileSelectSound, playButtonClickSound,
  });

  const handleSubmit = useCallback(() => {
    if (!socket || !puzzle || builtLetters.length === 0) return;
    const word = builtWord.toUpperCase();

    const reason = word.length < MIN_LEN ? 'too-short'
      : !word.includes(puzzle.centerLetter.toUpperCase()) ? 'no-center'
      : !isValidWordWheelWord(word, puzzle.centerLetter, puzzle.allLetters) ? 'bad-letters'
      : null;
    if (reason) {
      const v = verdicts.reject(word, reason, { min: MIN_LEN, letter: puzzle.centerLetter });
      flash('err', v.message, v.durationMs);
      return;
    }

    socket.emit('submitWheelWord', { word });
  }, [socket, puzzle, builtLetters.length, builtWord, flash, verdicts]);

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
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-neo-navy text-neo-white p-4">
        {loadTimedOut ? (
          <>
            <div className="font-neo-display text-center">{t('wheel.rush.loadFailed')}</div>
            <button
              type="button"
              onClick={onQuit}
              className="px-4 py-2 rounded-neo border-neo border-neo-cream/40 bg-neo-navy-light font-neo-display text-sm"
            >
              {t('wheel.rush.loadFailedQuit')}
            </button>
          </>
        ) : (
          <div className="animate-pulse font-neo-display">{t('wheel.rush.loading')}</div>
        )}
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
          {t('wheel.rush.fogActive')}
          <FogCountdown endsAt={fogEndsAt} />
        </div>
      )}

      {/* Points only: rejections are read by the shared announcer. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {feedback?.type === 'ok' ? feedback.msg : ''}
      </div>

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
            {t('wordWheel.tapLetters')}
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
            combo={comboLevel}
            // Tiles below lay out on 360/outerLetters.length; the ring defaults
            // to 6. The server supplies outerLetters, so any non-hexagon puzzle
            // would drift the connector lines off the tiles. Keep them in sync.
            outerCount={outerLetters.length || 6}
            reducedMotion={!!prefersReduced}
          />
          <m.div
            className="absolute inset-0 rounded-full border-2 border-neo-lime/20"
            style={{ boxShadow: '0 0 24px rgba(191,255,0,0.12), inset 0 0 24px rgba(191,255,0,0.06)' }}
            animate={prefersReduced ? { opacity: 0.85 } : { opacity: [0.6, 1, 0.6] }}
            transition={prefersReduced ? { duration: 0 } : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-4 sm:inset-5 rounded-full border border-neo-cyan/10" />
          <div className="absolute inset-8 sm:inset-10 rounded-full border border-neo-cream/5" />

          <WheelLetter
            letter={puzzle.centerLetter}
            isCenter
            onPress={(letter, _i, el) => handleLetterPress(letter, -1, el)}
            onHoldStart={holdPointerDown}
            onHoldEnd={holdPointerEnd}
            showHoldRing={holdActiveIndex === -1}
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
              onHoldStart={holdPointerDown}
              onHoldEnd={holdPointerEnd}
              showHoldRing={holdActiveIndex === i}
              isUsed={usedIndices.has(i)}
              index={i}
            />
          ))}
        </div>
        <p className="text-neo-white text-xs text-center px-2">
          {t('wordWheel.centerLetterRule')} &middot; {t('wordWheel.minLetters', { min: MIN_LEN })}
        </p>

        {/* Actions (Clear / Submit / Remove-last) — sit directly under the wheel
            so the player's thumb stays in the wheel's gravity well. */}
        <WheelActionBar
          t={t}
          hasLetters={builtLetters.length > 0}
          canSubmit={builtWord.length >= MIN_LEN}
          isValidating={false}
          onClear={handleClear}
          onSubmit={handleSubmit}
          onBackspace={handleBackspace}
          submitIcon={<Sparkles className="w-5 h-5" />}
        />

      </div>

      {/* Found words — sit below the wheel cluster, mirroring the daily
          challenge's found-words slot (fixed-height slot inside MyWordsChips
          keeps the layout from reflowing). */}
      {!isDesktopCanvas && <MyWordsChips words={myWords} dir={wordDir} />}
      <StuckCoachOverlay coach={ftue} anchor={isDesktopCanvas ? undefined : RUSH_COACH_ANCHOR} />

      <WheelRushCelebration celebration={celebration} t={t} prefersReduced={!!prefersReduced} />
      <WheelPassToasts t={t} toasts={passToasts} reducedMotion={!!prefersReduced} />
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
