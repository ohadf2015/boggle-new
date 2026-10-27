'use client';

import React, { useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useWheelDragSpell } from '@/hooks/useWheelDragSpell';
import { claimPointer } from '@/lib/wordWheel/claimPointer';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import WheelDisc from './WheelDisc';
import { useWheelWordFx } from './useWheelWordFx';
import { howToPuzzle } from './wheelHowToPuzzles';

type Status = 'idle' | 'accepted' | 'needCenter' | 'tooShort' | 'notWord';

interface WheelHowToProps {
  onAccepted: (word: string) => void;
}

const MIN = 3;
const noop = () => {};

/** Learn by doing: a 5-letter wheel where the first swipe through the center is a real, accepted word. */
export default function WheelHowTo({ onAccepted }: WheelHowToProps) {
  const { t, language } = useLanguage();
  const puzzle = howToPuzzle(language);
  const letterAt = (i: number) => (i === -1 ? puzzle.center : puzzle.outer[i]);
  const show = (w: string) => (language === 'he' ? applyHebrewFinalLetters(w) : w);

  const [built, setBuilt] = useState<number[]>([]);
  const builtRef = useRef<number[]>([]);
  const [status, setStatus] = useState<{ kind: Status; word: string }>({ kind: 'idle', word: '' });
  const { fx, fire } = useWheelWordFx();
  const orbitRef = useRef<HTMLDivElement>(null);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const [reduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );

  const setWord = (next: number[]) => { builtRef.current = next; setBuilt(next); };

  const submit = () => {
    const indices = builtRef.current;
    if (indices.length === 0) return;
    const letters = indices.map(letterAt);
    const word = letters.join('');
    const kind: Status = indices.length < MIN ? 'tooShort'
      : !indices.includes(-1) ? 'needCenter'
        : puzzle.words.includes(word) ? 'accepted' : 'notWord';
    fire({ kind: kind === 'accepted' ? 'good' : 'bad', indices, letters, points: 0 });
    setStatus({ kind, word });
    setWord([]);
    if (kind === 'accepted') onAccepted(word);
  };

  const press = (_letter: string, index: number) => {
    const cur = builtRef.current;
    if (cur.includes(index)) {
      if (cur[cur.length - 1] === index) setWord(cur.slice(0, -1));
      return;
    }
    setWord([...cur, index]);
  };

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useWheelDragSpell({
    draggingRef,
    pointerPosRef,
    minLength: MIN,
    isIndexUsed: (i) => builtRef.current.includes(i),
    addLetter: (i, letter) => press(letter, i),
    getBuiltLength: () => builtRef.current.length,
    submit,
  });

  const message = status.kind === 'accepted'
    ? t('wordWheel.howTo.accepted', { word: show(status.word).toUpperCase() })
    : status.kind === 'needCenter' ? t('wordWheel.centerLetterRule')
      : status.kind === 'tooShort' ? t('wordWheel.minLetters', { min: String(MIN) })
        : status.kind === 'notWord' ? t('wordWheel.howTo.notWord', { word: show(puzzle.hint).toUpperCase() })
          : t('wordWheel.howTo.prompt', { word: show(puzzle.hint).toUpperCase() });

  return (
    <div data-testid="wheel-howto" className="flex flex-col items-center gap-3 px-4 pt-4">
      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-neo-yellow">{t('wordWheel.howTo.title')}</span>
      <div className="w-48 h-48 [container-type:size] flex items-center justify-center">
        <WheelDisc
          orbitRef={orbitRef}
          centerLetter={puzzle.center}
          outerLetters={puzzle.outer}
          builtIndices={built}
          pointerPosRef={pointerPosRef}
          draggingRef={draggingRef}
          onPointerDown={(e) => { claimPointer(e); handlePointerDown(e); }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPress={press}
          onHoldStart={noop}
          onHoldEnd={noop}
          holdActiveIndex={null}
          fx={fx}
          reducedMotion={reduced}
        />
      </div>
      <div className="flex items-center gap-2 min-h-10">
        <span dir="auto" className="font-neo-display font-black text-2xl tracking-widest text-neo-white uppercase min-w-[3ch] text-center">
          {show(built.map(letterAt).join(''))}
        </span>
        {built.length >= MIN && (
          <button
            type="button"
            data-testid="wheel-howto-check"
            onClick={submit}
            className="h-9 px-3 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black text-sm font-black shadow-hard-sm active:shadow-hard-pressed"
          >
            {t('wordWheel.howTo.check')}
          </button>
        )}
      </div>
      <p
        data-testid="wheel-howto-status"
        data-state={status.kind}
        aria-live="polite"
        className={cn(
          'text-center text-sm font-bold leading-snug',
          status.kind === 'accepted' ? 'text-neo-lime' : status.kind === 'idle' ? 'text-neo-white/80' : 'text-neo-pink',
        )}
      >
        {message}
      </p>
    </div>
  );
}
