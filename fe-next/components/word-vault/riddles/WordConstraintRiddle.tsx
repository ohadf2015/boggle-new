'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useStore } from 'zustand';
import { useMachine } from '@xstate/react';
import type { Tile, WordConstraintRiddle as WordConstraintRiddleType } from '@/lib/word-vault/types';
import type { WordVaultStore } from '@/lib/word-vault/state/gameStore';
import { wordRiddleMachine } from '@/lib/word-vault/machines/wordRiddleMachine';
import { validateWordConstraint } from '@/lib/word-vault/engine/wordConstraintEngine';

interface Props {
  riddle: WordConstraintRiddleType;
  store: WordVaultStore;
  onSolved: () => void;
}

export function WordConstraintRiddle({ riddle, store, onSolved }: Props) {
  const [snapshot, send] = useMachine(wordRiddleMachine);
  const [selected, setSelected] = useState<Tile[]>([]);
  const hintTokens = useStore(store, (s) => s.hintTokens);

  useEffect(() => {
    if (snapshot.value === 'ready') send({ type: 'START' });
  }, [snapshot.value, send]);

  const word = useMemo(() => selected.map((t) => t.letter).join(''), [selected]);

  const remainingTiles = useMemo(() => {
    const used = new Set(selected.map((t) => t.id));
    return riddle.tiles.filter((t) => !used.has(t.id));
  }, [riddle.tiles, selected]);

  const handleSelect = useCallback((tile: Tile) => {
    setSelected((s) => (s.some((t) => t.id === tile.id) ? s : [...s, tile]));
  }, []);

  const handleClear = useCallback(() => setSelected([]), []);

  const handleSubmit = useCallback(() => {
    if (word.length < riddle.minLength) return;
    send({ type: 'SUBMIT', payload: word });
    const result = validateWordConstraint(word, riddle);
    if (result.ok) {
      store.getState().recordWordSpelled(word);
      send({ type: 'VALIDATE_SUCCESS' });
    } else {
      send({ type: 'VALIDATE_FAIL' });
    }
  }, [word, riddle, send, store]);

  useEffect(() => {
    if (snapshot.value !== 'solved') return;
    const t = setTimeout(() => onSolved(), 900);
    return () => clearTimeout(t);
  }, [snapshot.value, onSolved]);

  const handleHint = useCallback(() => {
    if (!store.getState().spendHintToken()) return;
    send({ type: 'USE_HINT' });
  }, [send, store]);

  const handleRetry = useCallback(() => {
    setSelected([]);
    send({ type: 'RETRY' });
  }, [send]);

  const isSolved = snapshot.value === 'solved';
  const isFailed = snapshot.value === 'failed';
  const isHinting = snapshot.value === 'hint-active';

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <div className="flex min-h-[80px] w-full items-center justify-center rounded border-4 border-lime-300 bg-[#0b1220] p-4">
        <span className="font-fredoka text-4xl font-black tracking-widest text-lime-200">
          {word || ' '}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3" dir="ltr">
        <AnimatePresence>
          {remainingTiles.map((tile) => (
            <m.button
              key={tile.id}
              type="button"
              onClick={() => handleSelect(tile)}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
              className="grid h-16 w-16 place-items-center rounded-md border-4 border-white bg-pink-400 font-fredoka text-3xl font-black text-[#0b1220] shadow-[4px_4px_0_0_#000]"
            >
              {tile.letter}
            </m.button>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleClear}
          disabled={selected.length === 0}
          className="rounded border-2 border-white/40 bg-transparent px-4 py-2 font-bold text-white disabled:opacity-30"
        >
          נקה
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={word.length < riddle.minLength}
          className="rounded border-2 border-lime-300 bg-lime-300 px-6 py-2 font-bold text-[#0b1220] disabled:opacity-30"
        >
          שלח
        </button>
        <button
          type="button"
          onClick={handleHint}
          disabled={hintTokens <= 0 || isSolved}
          className="rounded border-2 border-cyan-300 bg-transparent px-4 py-2 font-bold text-cyan-300 disabled:opacity-30"
        >
          רמז ({hintTokens})
        </button>
      </div>

      {isHinting && (
        <HintPanel
          targetWords={riddle.targetWords}
          onDismiss={() => send({ type: 'HINT_DISMISS' })}
        />
      )}

      {isFailed && (
        <div className="flex flex-col items-center gap-2 rounded border-2 border-pink-400 bg-pink-400/10 px-4 py-2">
          <p className="font-rubik text-pink-300">לא בדיוק. נסה שוב.</p>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded border-2 border-pink-400 px-3 py-1 text-sm font-bold text-pink-300"
          >
            נסיון נוסף
          </button>
        </div>
      )}

      {isSolved && (
        <m.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-md border-4 border-lime-300 bg-lime-300/20 px-6 py-3 text-center"
        >
          <p className="font-fredoka text-2xl font-black text-lime-200">פתרת!</p>
        </m.div>
      )}
    </div>
  );
}

function HintPanel({ targetWords, onDismiss }: { targetWords: string[]; onDismiss: () => void }) {
  const first = targetWords[0] ?? '';
  const reveal = first.length > 0 ? first[0] : '';
  return (
    <div className="flex flex-col items-center gap-2 rounded border-2 border-cyan-300 bg-cyan-300/10 px-4 py-3">
      <p className="font-rubik text-cyan-200">
        אות ראשונה: <span className="font-fredoka text-2xl font-black text-cyan-300">{reveal}</span>
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded border-2 border-cyan-300 px-3 py-1 text-sm font-bold text-cyan-300"
      >
        סגור רמז
      </button>
    </div>
  );
}
