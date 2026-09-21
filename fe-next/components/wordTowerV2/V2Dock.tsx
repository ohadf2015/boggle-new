'use client';

import type { RefObject } from 'react';
import { Delete, Shuffle, Undo2 } from 'lucide-react';
import { WordTowerWheel } from '@/components/wordTower/WordTowerWheel';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  dockRef: RefObject<HTMLDivElement | null>;
  wide: boolean;
  dir: 'ltr' | 'rtl';
  swinging: boolean;
  composing: boolean;
  rejected: string | null;
  dictError: boolean;
  scrambles: number;
  wheel: string[];
  selected: number[];
  word: string;
  valid: boolean;
  intensity: number;
  accentHex: string;
  reducedMotion: boolean;
  /** The hanging word can still be put back (only while it hangs, once). */
  canPutBack: boolean;
  onScramble: () => void;
  onSelectTile: (i: number) => void;
  onDeselectTile: (i: number) => void;
  onSubmit: () => void;
  onDrop: () => void;
  onPutBack: () => void;
  onBackspace: () => void;
}

/**
 * The controls: scramble, the swipe wheel (which morphs into the drop dial),
 * and backspace / put-back.
 *
 * On a phone the strip itself is TRANSPARENT — only the wheel's own disc and
 * the two buttons are solid — so the city and the base of the tower run on
 * behind the controls instead of ending at a navy slab. The strip is also
 * click-through: a drag on its empty sides pans the camera like the rest of
 * the canvas. Its measured height still frames the ground (WordTowerV2), so
 * nothing about the camera changed.
 */
export function V2Dock(p: Props) {
  const { t } = p;

  return (
    <div
      ref={p.dockRef}
      className={
        p.wide
          ? 'absolute bottom-0 end-0 top-0 z-30 flex w-[22rem] flex-col justify-center border-s-4 border-neo-cream/30 bg-neo-navy px-6 xl:w-[26rem]'
          : 'pointer-events-none absolute inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-7'
      }
    >
      {p.rejected ? (
        <div className="absolute inset-x-0 top-1 z-40 mx-auto w-fit rounded-neo border-neo border-black bg-neo-red px-3 py-1 font-neo-display text-sm font-bold text-neo-navy shadow-hard animate-neo-shake">
          {t(p.rejected.includes('.') ? p.rejected : `wordTower.error.${p.rejected}`)}
        </div>
      ) : null}
      <div
        className={
          p.wide
            ? 'mx-auto flex w-full flex-wrap items-center justify-center gap-6 [&>div]:order-first [&>div]:w-full [&>div]:max-w-none'
            : 'mx-auto grid max-w-md grid-cols-[3.5rem_1fr_3.5rem] items-center gap-2 md:max-w-4xl md:grid-cols-[5rem_1fr_5rem] md:px-6 [&>*]:pointer-events-auto'
        }
      >
        <button
          type="button"
          onClick={p.onScramble}
          disabled={p.scrambles === 0 || !p.composing}
          aria-label={t('wordTower.hud.scramble')}
          className="relative flex h-14 w-14 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-purple text-neo-navy shadow-hard lg:h-16 lg:w-16 active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-40 disabled:shadow-none"
        >
          <Shuffle className="h-6 w-6" aria-hidden />
          <span className="absolute -end-2 -top-2 rounded-full border-neo border-black bg-neo-cream px-1.5 font-neo-display text-xs font-black">
            {p.scrambles}
          </span>
        </button>

        {p.dictError ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mx-auto rounded-neo border-neo-thick border-black bg-neo-red px-6 py-3 font-neo-display text-base font-bold uppercase text-neo-navy shadow-hard"
          >
            {t('wordTower.loadError')}
          </button>
        ) : (
          <WordTowerWheel
            tray={p.wheel.map((l) => l.toUpperCase())}
            selected={p.selected}
            word={p.word.toUpperCase()}
            placing={p.swinging}
            canBuild={p.valid}
            intensity={p.intensity}
            accentHex={p.accentHex}
            reducedMotion={p.reducedMotion}
            dir={p.dir}
            t={t}
            onSelectTile={p.onSelectTile}
            onDeselectTile={p.onDeselectTile}
            onSubmit={p.onSubmit}
            onDrop={p.onDrop}
          />
        )}

        {/* One slot, two jobs: rub out a letter while spelling, take the whole
            word back off the hook while it hangs. A second button would have
            been a third control competing for the same corner. */}
        <button
          type="button"
          onClick={p.swinging ? p.onPutBack : p.onBackspace}
          disabled={p.swinging ? !p.canPutBack : p.selected.length === 0 || !p.composing}
          aria-label={t(p.swinging ? 'wordTowerV2.changeWord' : 'wordTower.hud.backspace')}
          className={`flex h-14 w-14 items-center justify-center rounded-neo border-neo-thick border-black text-neo-navy shadow-hard transition-colors lg:h-16 lg:w-16 active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-40 disabled:shadow-none ${
            p.swinging ? 'bg-neo-pink' : 'bg-neo-cream'
          }`}
        >
          {p.swinging ? <Undo2 className="h-6 w-6" aria-hidden /> : <Delete className="h-6 w-6" aria-hidden />}
        </button>
      </div>
    </div>
  );
}
