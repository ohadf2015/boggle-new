'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Delete, Shuffle, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { displayWord, fold } from '@/lib/holidays/arcade/letters';
import { cn } from '@/lib/utils';
import styles from './arcade.module.css';

export type RackVerdict = 'good' | 'bad' | 'retry';

interface Props {
  letters: string[];
  lang: string;
  onSubmit: (word: string, el: HTMLElement | null) => Promise<RackVerdict>;
  disabled?: boolean;
  tone?: 'gold' | 'red' | 'blue' | 'snow';
}

const TONES = {
  gold: 'bg-neo-holiday-gold text-neo-navy',
  red: 'bg-neo-holiday-red text-neo-white',
  blue: 'bg-neo-holiday-blue text-neo-white',
  snow: 'bg-neo-holiday-snow text-neo-navy',
};

function shuffled(n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export default function LetterRack({ letters, lang, onSubmit, disabled, tone = 'gold' }: Props) {
  const { t } = useLanguage();
  const [picked, setPicked] = useState<number[]>([]);
  const [order, setOrder] = useState<number[]>(() => letters.map((_, i) => i));
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const [busy, setBusy] = useState(false);
  const wordRef = useRef<HTMLDivElement>(null);
  const sig = letters.join('|');

  useEffect(() => {
    setPicked([]);
    setOrder(letters.map((_, i) => i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const word = picked.map((i) => letters[i]).join('');

  const submit = useCallback(async () => {
    if (!word || busy || disabled) return;
    setBusy(true);
    const verdict = await onSubmit(word, wordRef.current);
    setBusy(false);
    if (verdict === 'retry') return;
    setFlash(verdict);
    setPicked([]);
  }, [word, busy, disabled, onSubmit]);

  const tap = useCallback(
    (i: number) => {
      if (disabled || busy) return;
      setPicked((p) => (p.includes(i) ? p.slice(0, p.indexOf(i)) : [...p, i]));
    },
    [disabled, busy],
  );

  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        void submit();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPicked((p) => p.slice(0, -1));
      } else if (e.key === 'Escape') {
        setPicked([]);
      } else if (e.key.length === 1) {
        const k = fold(e.key, lang);
        setPicked((p) => {
          const i = order.find((idx) => !p.includes(idx) && fold(letters[idx], lang) === k);
          return i === undefined ? p : [...p, i];
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled, submit, order, letters, lang]);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={wordRef}
        dir="auto"
        aria-live="polite"
        onAnimationEnd={() => setFlash(null)}
        className={cn(
          'flex min-h-14 items-center justify-center rounded-xl border-[3px] border-black bg-neo-cream px-3 font-neo-display text-3xl font-black uppercase tracking-wider text-neo-navy shadow-hard',
          flash === 'good' && styles.good,
          flash === 'bad' && styles.shake,
          busy && 'opacity-70',
        )}
      >
        {displayWord(word, lang) || <span className="text-sm font-bold normal-case tracking-normal text-neo-navy/50">{t('holiday.arcade.rackHint')}</span>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {order.map((i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => tap(i)}
            aria-pressed={picked.includes(i)}
            className={cn(
              styles.tile,
              'grid size-14 place-items-center rounded-xl border-[3px] border-black font-neo-display text-2xl font-black uppercase shadow-hard',
              TONES[tone],
              picked.includes(i) && styles.picked,
            )}
          >
            {letters[i]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] gap-2">
        <button
          type="button"
          onClick={() => setPicked((p) => p.slice(0, -1))}
          disabled={disabled || !word}
          aria-label={t('holiday.arcade.erase')}
          className="grid size-14 place-items-center rounded-xl border-[3px] border-black bg-neo-navy-light shadow-hard disabled:opacity-40"
        >
          <Delete className="size-5 rtl:rotate-180" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={disabled || !word || busy}
          className="flex h-14 items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-neo-lime font-neo-display text-xl font-black text-neo-navy shadow-hard active:translate-x-px active:translate-y-px active:shadow-hard-pressed disabled:opacity-50"
        >
          <Check className="size-5" aria-hidden="true" />
          {t('holiday.arcade.submit')}
        </button>
        <button
          type="button"
          onClick={() => setOrder(shuffled(letters.length))}
          disabled={disabled}
          aria-label={t('holiday.arcade.shuffle')}
          className="grid size-14 place-items-center rounded-xl border-[3px] border-black bg-neo-navy-light shadow-hard disabled:opacity-40"
        >
          <Shuffle className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
