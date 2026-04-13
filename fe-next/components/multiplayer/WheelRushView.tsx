'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';
import { WheelLetter, WordTile } from '@/components/daily/WordWheelParts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WHEEL_RUSH_FOG_MS } from '@/shared/constants/wheelRushConstants';
import type { Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';

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

interface WheelLockInfo {
  word: string;
  by: string;
  lockUntil: number;
}

interface WordEntry {
  word: string;
  kind: 'locked' | 'stolen' | 'closed';
  score?: number;
  lockUntil?: number;
  stolenFrom?: string;
  ts: number;
}

interface Props {
  socket: Socket | null;
  username: string;
  leaderboard: LeaderboardEntry[];
  onQuit: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const OUTER_RADIUS = 110;

export const WheelRushView: React.FC<Props> = ({ socket, username, leaderboard, onQuit, t }) => {
  const [puzzle, setPuzzle] = useState<WheelPuzzle | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [built, setBuilt] = useState<Array<{ letter: string; index: number }>>([]);
  const [myWords, setMyWords] = useState<WordEntry[]>([]);
  const [activeLocks, setActiveLocks] = useState<WheelLockInfo[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const fbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 100ms tick for countdowns + fog window
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const flash = useCallback((type: 'ok' | 'err', msg: string) => {
    setFeedback({ type, msg });
    if (fbTimer.current) clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => setFeedback(null), 1200);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onInit = (data: { puzzle: WheelPuzzle; startedAt?: number }) => {
      setPuzzle(data.puzzle);
      setStartedAt(data.startedAt ?? Date.now());
    };
    const onResult = (data: { word: string; accepted: boolean; kind?: string; score?: number; lockUntil?: number; stolenFrom?: string; error?: string }) => {
      if (!data.accepted) {
        flash('err', data.error || 'rejected');
        return;
      }
      if (data.kind === 'locked') {
        setMyWords(prev => [{ word: data.word, kind: 'locked', score: data.score, lockUntil: data.lockUntil, ts: Date.now() }, ...prev]);
        flash('ok', `+${data.score}`);
      } else if (data.kind === 'stolen') {
        setMyWords(prev => [{ word: data.word, kind: 'stolen', score: data.score, stolenFrom: data.stolenFrom, ts: Date.now() }, ...prev]);
        flash('ok', `STEAL +${data.score}`);
      }
      setBuilt([]);
    };
    const onLocked = (data: { word: string; by: string; lockUntil: number }) => {
      setActiveLocks(prev => [...prev.filter(l => l.word !== data.word), data]);
    };
    const onStolen = (data: { word: string }) => {
      setActiveLocks(prev => prev.filter(l => l.word !== data.word));
    };
    const onClosed = (data: { word: string; finder: string }) => {
      setActiveLocks(prev => prev.filter(l => l.word !== data.word));
      setMyWords(prev => prev.map(w => (w.word === data.word && w.kind === 'locked' ? { ...w, kind: 'closed' as const } : w)));
    };

    socket.on('wheelRushInit', onInit);
    socket.on('wheelWordResult', onResult);
    socket.on('wheelWordLocked', onLocked);
    socket.on('wheelWordStolen', onStolen);
    socket.on('wheelWordClosed', onClosed);
    return () => {
      socket.off('wheelRushInit', onInit);
      socket.off('wheelWordResult', onResult);
      socket.off('wheelWordLocked', onLocked);
      socket.off('wheelWordStolen', onStolen);
      socket.off('wheelWordClosed', onClosed);
    };
  }, [socket, flash]);

  const handlePressLetter = useCallback((letter: string, index: number) => {
    setBuilt(prev => [...prev, { letter, index }]);
  }, []);

  const handleRemove = useCallback((idx: number) => {
    setBuilt(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleClear = useCallback(() => setBuilt([]), []);

  const handleSubmit = useCallback(() => {
    if (!socket || built.length === 0) return;
    const word = built.map(b => b.letter).join('');
    socket.emit('submitWheelWord', { word });
  }, [socket, built]);

  const handleShuffle = useCallback(() => {
    if (!puzzle) return;
    const shuffled = [...puzzle.outerLetters].sort(() => Math.random() - 0.5);
    setPuzzle({ ...puzzle, outerLetters: shuffled });
  }, [puzzle]);

  // Keyboard input
  useEffect(() => {
    if (!puzzle) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { handleSubmit(); return; }
      if (e.key === 'Backspace') { setBuilt(prev => prev.slice(0, -1)); return; }
      if (e.key === 'Escape') { handleClear(); return; }
      const k = e.key.toUpperCase();
      const all = puzzle.allLetters;
      const idx = all.indexOf(k);
      if (idx >= 0) setBuilt(prev => [...prev, { letter: k, index: idx }]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [puzzle, handleSubmit, handleClear]);

  const fogEndsAt = (startedAt ?? 0) + WHEEL_RUSH_FOG_MS;
  const fogActive = startedAt != null && now < fogEndsAt;
  const stealableLocks = activeLocks.filter(l => l.lockUntil > now);

  if (!puzzle) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy text-neo-cream">
        <div className="animate-pulse">{t('wheel.rush.loading') || 'Loading wheel...'}</div>
      </div>
    );
  }

  const builtWord = built.map(b => b.letter).join('');

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neo-navy p-3 md:p-4 gap-3">
      {/* Top bar: leaderboard + quit. Fog hides opponent scores for first WHEEL_RUSH_FOG_MS */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {leaderboard.map(p => {
            const isSelf = p.username === username;
            const fogged = !isSelf && fogActive;
            return (
              <div
                key={p.username}
                className={cn(
                  'px-3 py-1.5 rounded-neo border-2 border-neo-black font-neo-display font-bold text-sm',
                  isSelf ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy-light text-neo-cream',
                )}
              >
                {p.username}: {fogged ? '???' : p.score}
                {fogged && p.wordCount != null && (
                  <span className="ml-1 text-xs opacity-60">({p.wordCount}w)</span>
                )}
              </div>
            );
          })}
        </div>
        <Button size="sm" variant="destructive" onClick={onQuit}>{t('common.quit') || 'Quit'}</Button>
      </div>

      {fogActive && (
        <div className="text-center text-xs text-neo-cyan font-neo-body">
          {t('wheel.rush.fogActive') || `Fog of war: ${Math.ceil((fogEndsAt - now) / 1000)}s`}
        </div>
      )}

      {/* Built word */}
      <div className="flex items-center justify-center gap-2 min-h-[60px]">
        <AnimatePresence mode="popLayout">
          {built.map((b, i) => (
            <WordTile
              key={`${b.letter}-${i}-${b.index}`}
              letter={b.letter}
              index={i}
              onRemove={handleRemove}
              isCenter={b.letter === puzzle.centerLetter}
            />
          ))}
        </AnimatePresence>
        {built.length === 0 && (
          <div className="text-neo-cream/40 font-neo-body text-sm">{t('wheel.rush.tapLetters') || 'Tap letters to build a word'}</div>
        )}
      </div>

      {/* Wheel */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px]">
          <WheelLetter
            letter={puzzle.centerLetter}
            isCenter
            onPress={handlePressLetter}
            isUsed={false}
            index={0}
          />
          {puzzle.outerLetters.map((letter, i) => (
            <WheelLetter
              key={`${letter}-${i}`}
              letter={letter}
              isCenter={false}
              angle={(360 / puzzle.outerLetters.length) * i}
              radius={OUTER_RADIUS}
              onPress={(l) => handlePressLetter(l, i + 1)}
              isUsed={false}
              index={i + 1}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={handleShuffle}>{t('wheel.rush.shuffle') || 'Shuffle'}</Button>
        <Button variant="outline" size="sm" onClick={handleClear} disabled={built.length === 0}>{t('wheel.rush.clear') || 'Clear'}</Button>
        <Button size="sm" onClick={handleSubmit} disabled={built.length === 0}>
          {t('wheel.rush.submit') || 'Submit'} {builtWord && `(${builtWord})`}
        </Button>
      </div>

      {/* Feedback + active locks */}
      <div className="flex flex-col items-center gap-2 min-h-[40px]">
        {feedback && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              'px-3 py-1 rounded-neo border-2 border-neo-black font-neo-display font-bold text-sm',
              feedback.type === 'ok' ? 'bg-neo-lime text-neo-black' : 'bg-neo-red text-neo-white',
            )}
          >
            {feedback.msg}
          </motion.div>
        )}
        {stealableLocks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            {stealableLocks.map(lock => {
              const msLeft = Math.max(0, lock.lockUntil - now);
              const pct = Math.max(0, Math.min(100, (msLeft / 3000) * 100));
              return (
                <div
                  key={lock.word}
                  className="relative px-2 py-0.5 rounded border-2 border-neo-black bg-neo-pink text-neo-white text-xs font-bold font-neo-body overflow-hidden"
                  title={`Locked by ${lock.by} — ${(msLeft / 1000).toFixed(1)}s to steal`}
                >
                  <span className="relative z-10">
                    {lock.by === username ? lock.word : `??? (${Math.ceil(msLeft / 100) / 10}s)`}
                  </span>
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-neo-pink-dark/60"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My words list */}
      <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1.5 justify-center">
        {myWords.slice(0, 20).map((w, i) => (
          <span
            key={`${w.word}-${i}`}
            className={cn(
              'px-2 py-0.5 rounded border-2 border-neo-black text-xs font-neo-body font-bold',
              w.kind === 'stolen' ? 'bg-neo-pink text-neo-white' :
              w.kind === 'closed' ? 'bg-neo-cyan text-neo-black' :
              'bg-neo-lime text-neo-black',
            )}
          >
            {w.word}{w.score ? ` +${w.score}` : ''}
          </span>
        ))}
      </div>
    </div>
  );
};

export default WheelRushView;
