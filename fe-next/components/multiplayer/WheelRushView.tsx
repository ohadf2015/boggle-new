'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { RotateCcw, Shuffle, Sparkles } from 'lucide-react';
import { WheelLetter, WordTile } from '@/components/daily/WordWheelParts';
import { useWordWheelKeyboard } from '@/hooks/useWordWheelKeyboard';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { isValidWordWheelWord } from '@/utils/dailyChallenge/wordWheelGeneration';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WHEEL_RUSH_FOG_MS, WHEEL_RUSH_MIN_WORD_LEN } from '@/shared/constants/wheelRushConstants';
import type { Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';
import { MyWordsChips, type WordEntry } from './WheelRushPieces';
import { FloatingReaction } from '@/components/game/QuickReactions';
import { useQuickReactions } from '@/hooks/useQuickReactions';

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

const FogCountdown: React.FC<{ endsAt: number }> = ({ endsAt }) => {
  const [secs, setSecs] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
  useEffect(() => {
    const tick = () => setSecs(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);
  return <span className="opacity-60 tabular-nums">{secs}s</span>;
};

export const WheelRushView: React.FC<Props> = ({ socket, username, leaderboard, onQuit, t }) => {
  const {
    playTileSelectSound, playWordAcceptedSound, playWordRejectedSound,
    playButtonClickSound, playBoardShuffleSound,
  } = useSoundEffects();

  const [puzzle, setPuzzle] = useState<WheelPuzzle | null>(null);
  const [outerLetters, setOuterLetters] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [builtLetters, setBuiltLetters] = useState<BuiltLetter[]>([]);
  const [myWords, setMyWords] = useState<WordEntry[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [wordBuilderShake, setWordBuilderShake] = useState(false);
  const [fogActive, setFogActive] = useState(false);
  const [wheelRadius, setWheelRadius] = useState(72);

  const { floatingReactions, dismissReaction } = useQuickReactions({ socket, username });

  const fbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastDragIdxRef = useRef<number | null>(null);
  const dragStartIdxRef = useRef<number | null>(null);
  const dragEngagedRef = useRef(false);
  const usedIndicesRef = useRef<Set<number>>(new Set());

  // Fog flips off once at expiry — no per-frame ticker on the parent.
  // FogCountdown leaf owns its own 100ms tick for the seconds display.
  useEffect(() => {
    if (startedAt == null) { setFogActive(false); return; }
    const remaining = startedAt + WHEEL_RUSH_FOG_MS - Date.now();
    if (remaining <= 0) { setFogActive(false); return; }
    setFogActive(true);
    const id = setTimeout(() => setFogActive(false), remaining);
    return () => clearTimeout(id);
  }, [startedAt]);

  // Track which wheel indices are used (-1 for center)
  const usedIndices = useMemo(() => {
    const set = new Set<number>();
    for (const bl of builtLetters) set.add(bl.wheelIndex);
    return set;
  }, [builtLetters]);
  useEffect(() => { usedIndicesRef.current = usedIndices; }, [usedIndices]);

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
    }
    if (fbTimer.current) clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => setFeedback(null), 1200);
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
      setPuzzle(data.puzzle);
      setOuterLetters(data.puzzle.outerLetters);
      setStartedAt(data.startedAt ?? Date.now());
      // Reconnect-snapshot hydration: rebuild client state from server payload.
      const mine = data.myWords ?? data.foundWords?.[username] ?? [];
      if (mine.length) {
        const closedSet = new Set(data.closed ?? []);
        const myLocks = data.locks ?? {};
        const ts = Date.now();
        setMyWords(mine.map(word => {
          const lk = myLocks[word];
          if (lk && lk.by === username) return { word, kind: 'locked', lockUntil: lk.until, ts };
          if (closedSet.has(word)) return { word, kind: 'closed', ts };
          return { word, kind: 'locked', ts };
        }));
      }
    };
    const onResult = (data: { word: string; accepted: boolean; kind?: string; score?: number; lockUntil?: number; stolenFrom?: string; error?: string }) => {
      if (!data.accepted) {
        const code = data.error as WheelErrorCode | undefined;
        const key = code && ERROR_KEY[code] ? ERROR_KEY[code] : 'wordWheel.notInDictionary';
        const msg = t(key, { min: MIN_LEN, letter: puzzle?.centerLetter ?? '' }) || key;
        flash('err', msg);
        playWordRejectedSound();
        return;
      }
      if (data.kind === 'locked') {
        setMyWords(prev => [{ word: data.word, kind: 'locked', score: data.score, lockUntil: data.lockUntil, ts: Date.now() }, ...prev]);
        flash('ok', `+${data.score}`);
      } else if (data.kind === 'stolen') {
        setMyWords(prev => [{ word: data.word, kind: 'stolen', score: data.score, stolenFrom: data.stolenFrom, ts: Date.now() }, ...prev]);
        flash('ok', t('wordWheel.stealGain', { score: data.score ?? 0 }) || `+${data.score}`);
      }
      playWordAcceptedSound();
      haptic(20);
      setBuiltLetters([]);
    };
    const onStolen = (data: { word: string; by?: string; from?: string }) => {
      if (data.from === username) {
        setMyWords(prev => prev.map(w =>
          w.word === data.word && w.kind === 'locked'
            ? { ...w, kind: 'stolen-from-me' as const, stolenFrom: data.by }
            : w,
        ));
        flash('err', t('wordWheel.yourWordStolen', { word: data.word, by: data.by ?? '' }) || 'Stolen!');
        playWordRejectedSound();
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
  }, [socket, flash, t, puzzle, username, playWordAcceptedSound, playWordRejectedSound]);

  // Letter tap handler (matches SP signature)
  const handleLetterPress = useCallback((letter: string, wheelIndex: number, _el: HTMLButtonElement) => {
    setBuiltLetters(prev => [...prev, { letter, wheelIndex }]);
    playTileSelectSound();
    haptic(10);
  }, [playTileSelectSound]);

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
    draggingRef.current = false;
    lastDragIdxRef.current = null;
    dragStartIdxRef.current = null;
    dragEngagedRef.current = false;
  }, []);

  const handleRemoveLetter = useCallback((index: number) => {
    setBuiltLetters(prev => prev.filter((_, i) => i !== index));
    playButtonClickSound();
  }, [playButtonClickSound]);

  const handleClear = useCallback(() => {
    setBuiltLetters([]);
    playButtonClickSound();
  }, [playButtonClickSound]);

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

  // Responsive wheel radius
  useEffect(() => {
    const update = () => {
      if (wheelContainerRef.current) {
        const w = wheelContainerRef.current.getBoundingClientRect().width;
        setWheelRadius(Math.max(56, Math.min(96, (w - 56) / 2)));
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [puzzle]);

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
      <div className="flex-1 flex items-center justify-center bg-neo-navy text-neo-cream">
        <div className="animate-pulse font-neo-display">{t('wheel.rush.loading') || 'Loading wheel...'}</div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-neo-navy p-3 md:p-4 gap-2 overflow-hidden">
      {/* Top bar: leaderboard (fog-of-war) + quit */}
      <div className="flex items-center justify-between gap-2 shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {leaderboard.map(p => {
            const isSelf = p.username === username;
            const fogged = !isSelf && fogActive;
            const wc = p.wordCount ?? 0;
            return (
              <div
                key={p.username}
                className={cn(
                  'shrink-0 px-2.5 py-1 rounded-neo border-2 border-neo-black font-neo-display font-bold text-xs sm:text-sm shadow-hard whitespace-nowrap',
                  isSelf ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy-light text-neo-cream',
                )}
              >
                <span className="opacity-80">{p.username}</span>
                <span className="mx-1 opacity-40">·</span>
                {fogged ? (
                  <span className="tracking-wider">???</span>
                ) : (
                  <span className="tabular-nums">{p.score}</span>
                )}
                {wc > 0 && (
                  <span className="ms-1 text-[10px] sm:text-xs opacity-60 tabular-nums">{wc}w</span>
                )}
              </div>
            );
          })}
        </div>
        <Button size="sm" variant="destructive" onClick={onQuit} className="shrink-0">{t('common.quit') || 'Quit'}</Button>
      </div>

      {fogActive && (
        <div className="text-center text-xs sm:text-sm text-neo-cyan font-neo-display font-bold tracking-wide flex items-center justify-center gap-2 shrink-0">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-neo-cyan animate-pulse" />
          {t('wheel.rush.fogActive') || 'Fog of War active!'}
          <FogCountdown endsAt={fogEndsAt} />
        </div>
      )}

      {/* Word builder (shared shake + motion) */}
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
                {t('wordWheel.tapLetters') || 'Tap letters to build a word'}
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
        <AnimatePresence>
          {feedback && (
            <motion.div
              className={cn(
                'absolute -bottom-7 left-1/2 -translate-x-1/2 px-3 py-1 rounded-neo border-2 border-neo-black text-sm font-bold whitespace-nowrap z-20',
                feedback.type === 'ok' ? 'bg-neo-lime text-neo-black' : 'bg-neo-red text-neo-white',
              )}
              initial={{ opacity: 0, y: -10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
            >
              {feedback.msg}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Wheel cluster — fills remaining vertical space, centered */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-2">
        <div
          ref={wheelContainerRef}
          className="relative w-52 h-52 sm:w-64 sm:h-64 md:w-72 md:h-72 flex items-center justify-center touch-none"
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
          <motion.div
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
        </div>
        <p className="text-neo-cream/40 text-xs text-center px-2">
          {t('wordWheel.centerLetterRule') || 'Must include center letter'} &middot; {(t('wordWheel.minLetters') || 'Min {min} letters').replace('{min}', String(MIN_LEN))}
        </p>
      </div>

      {/* Actions (Clear / Submit / Shuffle) */}
      <div className="flex items-center justify-center gap-3 shrink-0">
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
          aria-label={t('wordWheel.clear') || 'Clear'}
        >
          <RotateCcw className="w-5 h-5" />
        </motion.button>

        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={builtWord.length < MIN_LEN}
          className={cn(
            'px-8 py-3 rounded-neo border-3 border-neo-black font-neo-display font-black text-lg',
            builtWord.length >= MIN_LEN
              ? 'bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black shadow-[3px_3px_0px_black,0_0_16px_rgba(191,255,0,0.3)] hover:shadow-[3px_3px_0px_black,0_0_22px_rgba(0,255,255,0.4)]'
              : 'bg-neo-navy-light text-neo-cream/40 shadow-hard-lg',
            'active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
            'disabled:cursor-not-allowed',
          )}
          whileTap={builtWord.length >= MIN_LEN ? { scale: 0.92 } : {}}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {t('wordWheel.submit') || 'Submit'}
          </div>
        </motion.button>

        <motion.button
          type="button"
          onClick={handleShuffle}
          className={cn(
            'p-3 rounded-neo border-3 border-neo-black bg-neo-navy-light text-neo-cream shadow-hard',
            'hover:bg-neo-navy active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
          )}
          whileTap={{ scale: 0.9, rotate: 180 }}
          transition={{ type: 'spring', stiffness: 300 }}
          aria-label={t('wordWheel.shuffle') || 'Shuffle'}
        >
          <Shuffle className="w-5 h-5" />
        </motion.button>
      </div>

      <MyWordsChips words={myWords} />

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
