'use client';

import { useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { useMachine } from '@xstate/react';
import type { CipherRiddle as CipherRiddleType } from '@/lib/word-vault/types';
import type { WordVaultStore } from '@/lib/word-vault/state/gameStore';
import { cipherRiddleMachine } from '@/lib/word-vault/machines/cipherRiddleMachine';
import { judgeCipherAttempt, isRiddleSolved } from '@/lib/word-vault/engine/cipherEngine';

interface Props {
  riddle: CipherRiddleType;
  store: WordVaultStore;
  onSolved: () => void;
}

export function CipherRiddle({ riddle, store: _store, onSolved }: Props) {
  const [snapshot, send] = useMachine(cipherRiddleMachine);
  const [solvedJars, setSolvedJars] = useState<Set<string>>(new Set());
  const [activeJarId, setActiveJarId] = useState<string | null>(null);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (snapshot.value === 'ready') send({ type: 'START' });
  }, [snapshot.value, send]);

  const allCorrectSolved = useMemo(() => isRiddleSolved(riddle, solvedJars), [riddle, solvedJars]);

  useEffect(() => {
    if (allCorrectSolved && snapshot.value !== 'solved') {
      send({ type: 'SUBMIT' });
      send({ type: 'VALIDATE_SUCCESS' });
    }
  }, [allCorrectSolved, snapshot.value, send]);

  useEffect(() => {
    if (snapshot.value !== 'solved') return;
    const t = setTimeout(() => onSolved(), 1100);
    return () => clearTimeout(t);
  }, [snapshot.value, onSolved]);

  const handleAttempt = () => {
    if (!activeJarId) return;
    const jar = riddle.jars.find((j) => j.id === activeJarId);
    if (!jar) return;
    const result = judgeCipherAttempt(jar, draftAnswer);
    if (result.ok) {
      setSolvedJars((s) => new Set(s).add(jar.id));
      setFeedback('✓');
      setActiveJarId(null);
      setDraftAnswer('');
    } else if (result.reason === 'red-herring') {
      setFeedback('הצנצנת הזו לא שייכת — נסה אחרת');
    } else if (result.reason === 'wrong-word') {
      setFeedback('מילה תקינה — אבל לא המצרך הזה. חשבי שוב לפי הרמז.');
    } else {
      setFeedback('לא תואם את האותיות. נסה שוב.');
    }
  };

  const activeJar = activeJarId ? riddle.jars.find((j) => j.id === activeJarId) : null;

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6">
      <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
        {riddle.jars.map((jar) => {
          const isSolved = solvedJars.has(jar.id);
          const isActive = activeJarId === jar.id;
          return (
            <m.button
              key={jar.id}
              type="button"
              onClick={() => {
                if (isSolved) return;
                setActiveJarId(jar.id);
                setDraftAnswer('');
                setFeedback(null);
              }}
              whileHover={isSolved ? undefined : { scale: 1.04 }}
              whileTap={isSolved ? undefined : { scale: 0.95 }}
              className={
                'flex aspect-square flex-col items-center justify-center rounded-md border-4 p-3 font-fredoka text-2xl font-bold shadow-[4px_4px_0_0_#000] ' +
                (isSolved
                  ? 'border-lime-300 bg-lime-300/20 text-lime-200'
                  : isActive
                  ? 'border-cyan-300 bg-cyan-300/20 text-white'
                  : 'border-white bg-pink-400 text-[#0b1220]')
              }
            >
              <span>{isSolved ? jar.answer : jar.scrambled}</span>
              <span className="mt-1 font-rubik text-xs">{isSolved ? '✓' : 'צנצנת'}</span>
            </m.button>
          );
        })}
      </div>

      {activeJarId && activeJar && (
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-md border-2 border-cyan-300 bg-[#111a2c] p-4">
          <p className="font-rubik text-sm text-white">פענח את התווית:</p>
          {activeJar.hint && (
            <p className="rounded border-2 border-orange-300/60 bg-orange-300/10 px-3 py-2 font-rubik text-sm text-orange-200">
              💡 {activeJar.hint.he}
            </p>
          )}
          <input
            type="text"
            value={draftAnswer}
            onChange={(e) => setDraftAnswer(e.target.value)}
            dir="rtl"
            className="rounded border-2 border-white/40 bg-[#0b1220] px-3 py-2 text-center font-fredoka text-2xl text-white outline-none focus:border-lime-300"
            autoFocus
          />
          <div className="flex justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveJarId(null);
                setDraftAnswer('');
              }}
              className="rounded border-2 border-white/40 px-3 py-1 text-sm font-bold text-white"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={handleAttempt}
              disabled={draftAnswer.length === 0}
              className="rounded border-2 border-lime-300 bg-lime-300 px-4 py-1 font-bold text-[#0b1220] disabled:opacity-30"
            >
              שלח
            </button>
          </div>
          {feedback && <p className="text-center font-rubik text-sm text-pink-300">{feedback}</p>}
        </div>
      )}

      {snapshot.value === 'solved' && (
        <m.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-md border-4 border-lime-300 bg-lime-300/20 px-6 py-3 text-center"
        >
          <p className="font-fredoka text-2xl font-black text-lime-200">המזווה נפתח!</p>
        </m.div>
      )}
    </div>
  );
}
