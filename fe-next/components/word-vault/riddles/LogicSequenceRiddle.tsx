'use client';

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { useMachine } from '@xstate/react';
import type { LogicSequenceRiddle as LogicSequenceRiddleType } from '@/lib/word-vault/types';
import type { WordVaultStore } from '@/lib/word-vault/state/gameStore';
import { logicRiddleMachine } from '@/lib/word-vault/machines/logicRiddleMachine';
import { isCorrectOrder } from '@/lib/word-vault/engine/logicSequenceEngine';

interface Props {
  riddle: LogicSequenceRiddleType;
  store: WordVaultStore;
  onSolved: () => void;
}

export function LogicSequenceRiddle({ riddle, store: _store, onSolved }: Props) {
  const [snapshot, send] = useMachine(logicRiddleMachine);
  const [order, setOrder] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (snapshot.value === 'ready') send({ type: 'START' });
  }, [snapshot.value, send]);

  useEffect(() => {
    if (snapshot.value !== 'solved') return;
    const t = setTimeout(() => onSolved(), 1100);
    return () => clearTimeout(t);
  }, [snapshot.value, onSolved]);

  const handlePick = (id: string) => {
    if (order.includes(id)) return;
    setFeedback(null);
    setOrder([...order, id]);
  };

  const handleClear = () => {
    setOrder([]);
    setFeedback(null);
    if (snapshot.value === 'failed') send({ type: 'RETRY' });
  };

  const handleSubmit = () => {
    send({ type: 'SUBMIT' });
    if (isCorrectOrder(riddle, order)) {
      send({ type: 'VALIDATE_SUCCESS' });
    } else {
      send({ type: 'VALIDATE_FAIL' });
      setFeedback('סדר שגוי. קרא את החרוז שוב.');
    }
  };

  const isComplete = order.length === riddle.steps.length;
  const isSolved = snapshot.value === 'solved';

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <p className="rounded-md border-2 border-cyan-300 bg-cyan-300/10 px-4 py-3 text-center font-rubik text-cyan-200">
        {riddle.hintRhyme.he}
      </p>

      <ol className="flex w-full flex-col gap-2" dir="rtl">
        {order.map((id, idx) => {
          const step = riddle.steps.find((s) => s.id === id);
          return (
            <li key={id}>
              <div className="flex items-center gap-3 rounded border-2 border-lime-300 bg-lime-300/10 px-3 py-2">
                <span className="font-fredoka text-lg font-black text-lime-300">{idx + 1}</span>
                <span className="font-rubik text-white">{step?.label.he}</span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap justify-center gap-3">
        {riddle.steps
          .filter((s) => !order.includes(s.id))
          .map((step) => (
            <m.button
              key={step.id}
              type="button"
              onClick={() => handlePick(step.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded border-4 border-white bg-pink-400 px-4 py-3 font-fredoka font-bold text-[#0b1220] shadow-[3px_3px_0_0_#000]"
            >
              {step.label.he}
            </m.button>
          ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleClear}
          disabled={order.length === 0}
          className="rounded border-2 border-white/40 px-4 py-2 font-bold text-white disabled:opacity-30"
        >
          נקה
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isComplete || isSolved}
          className="rounded border-2 border-lime-300 bg-lime-300 px-6 py-2 font-bold text-[#0b1220] disabled:opacity-30"
        >
          שלח
        </button>
      </div>

      {feedback && (
        <p className="text-center font-rubik text-pink-300">{feedback}</p>
      )}

      {isSolved && (
        <m.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-md border-4 border-lime-300 bg-lime-300/20 px-6 py-3 text-center"
        >
          <p className="font-fredoka text-2xl font-black text-lime-200">הסדר נכון!</p>
        </m.div>
      )}
    </div>
  );
}
