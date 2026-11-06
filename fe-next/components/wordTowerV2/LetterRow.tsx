'use client';

import { memo, useEffect, useRef } from 'react';
import { ArrowUp, ChevronsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWheelDragSpell } from '@/hooks/useWheelDragSpell';
import { releaseStuckPointers, subscribeForegroundResume } from '@/lib/native/foregroundResume';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface LetterRowProps {
  t: T;
  /** The letters the player spells from. */
  tray: string[];
  /** Indices into `tray`, in tap/drag order, that form the current word. */
  selected: number[];
  /** A word hangs on the hook: the button becomes DROP and the letters rest. */
  placing: boolean;
  /** The spelled word is long enough and real. */
  canBuild: boolean;
  reducedMotion: boolean;
  dir: 'ltr' | 'rtl';
  onSelectTile: (i: number) => void;
  onDeselectTile: (i: number) => void;
  onSubmit: () => void;
  onDrop: () => void;
}

/** Same hand-off beat as the old wheel: a buildable word rests this long, then goes to the crane. */
export const AUTO_BUILD_MS = 700;
const DRAG_ENGAGEMENT_THRESHOLD_PX = 8;

/**
 * The letters in ONE row, with one big button under them.
 *
 * It replaced the swipe wheel (players found it busy): a row of tiles you tap
 * (or slide a finger along) to spell, and a full-width button that builds the
 * word and then turns into DROP while the floor swings. The rules did not move:
 * same 3-letter minimum, same auto-build beat, same tap-a-used-letter-to-rewind.
 * Tiles keep `data-wheel-*` so the shared drag hook and the first-word coach
 * find them exactly as they found the wheel's.
 */
export const LetterRow = memo(function LetterRow({
  t, tray, selected, placing, canBuild, reducedMotion, dir, onSelectTile, onDeselectTile, onSubmit, onDrop,
}: LetterRowProps) {
  const draggingRef = useRef(false);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const addedDuringDragRef = useRef(false);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const submittedRef = useRef(false);
  const gestureRef = useRef<{ id: number; el: HTMLElement } | null>(null);
  const downRef = useRef<{ x: number; y: number } | null>(null);

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useWheelDragSpell({
    draggingRef,
    pointerPosRef,
    minLength: 3,
    isIndexUsed: (i) => selectedRef.current.includes(i),
    addLetter: (i) => {
      addedDuringDragRef.current = true;
      onSelectTile(i);
    },
    getBuiltLength: () => selectedRef.current.length,
    submit: () => {
      submittedRef.current = true;
      onSubmit();
    },
    // Capture only once a real drag starts, so a plain tap keeps its click.
    onEngage: () => {
      const g = gestureRef.current;
      if (g) {
        try {
          g.el.setPointerCapture(g.id);
        } catch {
          /* unsupported */
        }
      }
    },
  });

  const onDown = (e: React.PointerEvent) => {
    if (placing) return;
    addedDuringDragRef.current = false;
    downRef.current = { x: e.clientX, y: e.clientY };
    gestureRef.current = { id: e.pointerId, el: e.currentTarget as HTMLElement };
    handlePointerDown(e);
  };
  const onMove = (e: React.PointerEvent) => {
    const down = downRef.current;
    if (placing || !down) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < DRAG_ENGAGEMENT_THRESHOLD_PX) return;
    handlePointerMove(e);
  };
  const onUp = () => {
    downRef.current = null;
    const g = gestureRef.current;
    gestureRef.current = null;
    if (g) {
      try {
        g.el.releasePointerCapture(g.id);
      } catch {
        /* never claimed */
      }
    }
    handlePointerUp();
  };

  useEffect(
    () =>
      subscribeForegroundResume(() => {
        const g = gestureRef.current;
        gestureRef.current = null;
        downRef.current = null;
        if (g) releaseStuckPointers(g.el, [g.id]);
        handlePointerUp();
      }),
    [handlePointerUp],
  );

  // Auto-build, exactly as the wheel did it: a buildable word that rests goes to the crane.
  const selectedKey = selected.join(',');
  useEffect(() => {
    submittedRef.current = false;
    if (!canBuild || placing) return;
    const id = setTimeout(() => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      onSubmit();
    }, AUTO_BUILD_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, canBuild, placing]);

  const tapLetter = (i: number) => {
    if (addedDuringDragRef.current) {
      addedDuringDragRef.current = false;
      return;
    }
    if (placing) return;
    if (selected.includes(i)) {
      onDeselectTile(i);
      return;
    }
    onSelectTile(i);
  };

  const action = placing ? 'drop' : canBuild ? 'build' : 'idle';

  return (
    <div className="flex w-full flex-col gap-2.5" data-wt2-letter-row dir={dir}>
      <div
        role="group"
        aria-label={t('wordTower.hud.dragToBuild')}
        className="flex w-full touch-none select-none items-center justify-center gap-1.5 lg:gap-2"
        onPointerDown={onDown}
        onPointerMove={placing ? undefined : onMove}
        onPointerUp={placing ? undefined : onUp}
        onPointerCancel={placing ? undefined : onUp}
      >
        {tray.map((letter, i) => {
          const order = selected.indexOf(i);
          const used = order >= 0;
          return (
            <button
              key={i}
              type="button"
              data-wheel-letter={letter}
              data-wheel-index={i}
              disabled={placing}
              onClick={() => tapLetter(i)}
              aria-label={t('wordTower.a11y.tile', { letter })}
              aria-pressed={used}
              className={cn(
                'relative flex h-12 min-w-0 max-w-[3.25rem] flex-1 items-center justify-center rounded-neo border-neo-thick font-neo-display text-2xl font-black uppercase transition-colors duration-150 lg:h-14 lg:max-w-[3.5rem]',
                used
                  ? 'border-neo-cream/40 bg-neo-navy-light text-neo-cream/40'
                  : 'border-black bg-neo-lime text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
                placing && !used && 'opacity-40 shadow-none',
              )}
            >
              <span key={used ? `u${order}` : 'f'} className={cn('inline-block', used && !reducedMotion && 'wt-tile-pop')}>
                {letter}
              </span>
              {used ? (
                <span
                  aria-hidden
                  className="absolute -top-2 -start-2 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-black bg-neo-yellow font-neo-display text-[10px] font-black leading-none text-neo-navy"
                >
                  {order + 1}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        data-wt2-action={action}
        disabled={action === 'idle'}
        onClick={() => {
          if (action === 'drop') onDrop();
          else if (action === 'build') {
            submittedRef.current = true;
            onSubmit();
          }
        }}
        aria-label={t(action === 'drop' ? 'wordTower.crane.drop' : 'wordTower.hud.build')}
        className={cn(
          'relative flex h-[52px] w-full items-center justify-center gap-2 overflow-hidden rounded-neo border-neo-thick border-black font-neo-display text-xl font-black uppercase text-neo-navy shadow-hard transition-colors duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed lg:h-14',
          action === 'drop' ? 'bg-neo-cyan' : 'bg-neo-lime',
          action === 'idle' && 'opacity-40 shadow-none',
        )}
      >
        {/* The auto-build beat, drawn: the button fills, then the word goes up. */}
        {action === 'build' && !reducedMotion ? (
          <span
            key={selectedKey}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 start-0 w-full origin-left bg-neo-navy/15 rtl:origin-right"
            style={{ animation: `wt2-build-fill ${AUTO_BUILD_MS}ms linear forwards` }}
          />
        ) : null}
        {action === 'drop' ? <ChevronsDown className="relative h-6 w-6" aria-hidden /> : <ArrowUp className="relative h-6 w-6" aria-hidden />}
        <span className="relative">{t(action === 'drop' ? 'wordTower.crane.drop' : 'wordTower.hud.build')}</span>
        <style>{'@keyframes wt2-build-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}'}</style>
      </button>
    </div>
  );
});

/** The word being spelled, in one plain box between shuffle and backspace. */
export const WordBox = memo(function WordBox({ t, word, placing, reducedMotion }: { t: T; word: string; placing: boolean; reducedMotion: boolean }) {
  return (
    <div
      data-wt2-word
      aria-live="polite"
      className={cn(
        'flex h-12 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-neo border-neo-thick border-black px-2 font-neo-display font-black uppercase shadow-hard lg:h-14',
        placing ? 'bg-neo-cyan text-neo-navy' : 'bg-neo-cream text-neo-navy',
      )}
    >
      {word ? (
        <span key={word.length} className={cn('truncate text-2xl tracking-[0.12em]', !reducedMotion && 'wt-tile-pop')}>
          {word}
        </span>
      ) : (
        <span className="truncate font-neo-body text-sm font-bold normal-case text-neo-navy/50">{t('wordTower.hud.pickLetters')}</span>
      )}
    </div>
  );
});
