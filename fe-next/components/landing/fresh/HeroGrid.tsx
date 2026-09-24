'use client';

/**
 * Section 1 art: a 3x3 board that teaches the game in one glance. At rest it
 * autoplays (CSS keyframes only) a lime trace of the locale's demo word; the
 * tiles are always visible, only the highlight moves. A visitor can then tap
 * the word (or drag with a mouse). Only the target word counts: we never ship
 * guessed word lists. Owner: piece B.
 *
 * - `dir="ltr"` on the board: SVG coordinates never mirror, so the Hebrew path
 *   (right to left) must be drawn on an unmirrored grid to match its tiles.
 * - No touch-action:none: the board covers a quarter of the first mobile
 *   viewport, and blocking scroll there would rebuild the trap this page fixes.
 *   Touch input is tap-by-tap; drag is mouse only.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDemoConfig, type DemoConfig } from '@/components/onboarding/demoConfigs';
import { cn } from '@/lib/utils';

type Cell = { row: number; col: number };
type Mode = 'demo' | 'play' | 'found' | 'miss';

/** demoConfigs has no Russian board; КОТ (cat) on the same C-A-T geometry. */
const EXTRA_DEMOS: Record<string, DemoConfig> = {
  ru: {
    letters: [
      ['К', 'О', 'Л'],
      ['Д', 'Т', 'Р'],
      ['Е', 'С', 'А'],
    ],
    path: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 },
    ],
    word: 'КОТ',
  },
};

export function getHeroDemo(language: string): DemoConfig {
  return EXTRA_DEMOS[language] ?? getDemoConfig(language);
}

/** Tile geometry in a 0-100 box: 3 tiles of 30 with gaps of 5. */
const center = (i: number) => i * 35 + 15;
const points = (cells: Cell[]) => cells.map((c) => `${center(c.col)},${center(c.row)}`).join(' ');
const same = (a: Cell, b: Cell) => a.row === b.row && a.col === b.col;
const adjacent = (a: Cell, b: Cell) => Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)) === 1;

/*
 * Scoped CSS for the board. Transform/opacity (and stroke-dashoffset) only.
 * Everything is visible at rest; the demo highlight is decoration that
 * collapses to the finished trace under prefers-reduced-motion.
 */
const CSS = `
.hg .hg-lit{opacity:0}
.hg .hg-line,.hg .hg-line-edge{stroke-dasharray:1;stroke-dashoffset:1}
.hg .hg-line{stroke:var(--neo-lime)}
.hg .hg-line-edge{stroke:rgb(var(--neo-black))}
.hg .hg-chip{opacity:0;transform:translate(-50%,6px) scale(.8)}
.hg:not([data-mode=demo]) .hg-tile[data-lit] .hg-lit{opacity:1}
.hg .hg-btn{paint-order:stroke fill}
.hg:not([data-mode=demo]) .hg-tile[data-lit] .hg-btn{color:var(--neo-cream);-webkit-text-stroke:.14em rgb(var(--neo-black))}
.hg:not([data-mode=demo]) .hg-line,.hg:not([data-mode=demo]) .hg-line-edge{stroke-dasharray:none;stroke-dashoffset:0}
.hg[data-mode=found] .hg-chip{opacity:1;transform:translate(-50%,0) scale(1)}
.hg[data-mode=miss] .hg-lit{background:var(--neo-red)}
.hg[data-mode=miss] .hg-line{stroke:var(--neo-red)}
@media (prefers-reduced-motion: no-preference){
.hg .hg-face,.hg .hg-btn{transition:transform .16s cubic-bezier(.34,1.56,.64,1)}
.hg .hg-lit{transition:opacity .12s ease-out}
.hg[data-mode=play] .hg-tile[data-lit] .hg-face,.hg[data-mode=play] .hg-tile[data-lit] .hg-btn{transform:scale(1.07) rotate(-2deg)}
.hg .hg-tile:active .hg-face{transform:translate(2px,2px) scale(.97)}
@media (hover:hover){.hg .hg-tile:hover .hg-face,.hg .hg-tile:hover .hg-btn{transform:rotate(-4deg) scale(1.05)}}
.hg[data-mode=demo] .hg-tile[data-order] .hg-lit{animation:hg-lit 5.2s infinite both}
.hg[data-mode=demo] .hg-tile[data-order] .hg-btn{animation:hg-pop 5.2s infinite both,hg-ink 5.2s infinite both}
.hg[data-mode=demo] .hg-tile[data-order] .hg-face{animation:hg-pop 5.2s infinite both}
.hg[data-mode=demo] .hg-tile[data-order="1"] *{animation-delay:.45s}
.hg[data-mode=demo] .hg-tile[data-order="2"] *{animation-delay:.9s}
.hg[data-mode=demo] .hg-line,.hg[data-mode=demo] .hg-line-edge{animation:hg-draw 5.2s infinite both}
.hg[data-mode=demo] .hg-chip{animation:hg-chip 5.2s infinite both}
.hg[data-mode=found] .hg-chip{animation:hg-chip-in .5s cubic-bezier(.34,1.56,.64,1) both}
.hg[data-mode=found] .hg-tile[data-lit] .hg-face,.hg[data-mode=found] .hg-tile[data-lit] .hg-btn{animation:hg-cheer .55s cubic-bezier(.34,1.56,.64,1) both}
.hg[data-mode=found] .hg-tile[data-order="1"] *{animation-delay:.07s}
.hg[data-mode=found] .hg-tile[data-order="2"] *{animation-delay:.14s}
.hg[data-mode=miss] .hg-board{animation:hg-shake .45s cubic-bezier(.36,.07,.19,.97)}
}
@media (prefers-reduced-motion: reduce){
.hg[data-mode=demo] .hg-tile[data-order] .hg-lit{opacity:1}
.hg[data-mode=demo] .hg-tile[data-order] .hg-btn{color:var(--neo-cream);-webkit-text-stroke:.14em rgb(var(--neo-black))}
.hg[data-mode=demo] .hg-line,.hg[data-mode=demo] .hg-line-edge{stroke-dashoffset:0}
.hg[data-mode=demo] .hg-chip{opacity:1;transform:translate(-50%,0)}
}
@keyframes hg-ink{0%,12%{color:rgb(var(--neo-black));-webkit-text-stroke:0 transparent}15%,72%{color:var(--neo-cream);-webkit-text-stroke:.14em rgb(var(--neo-black))}80%,100%{color:rgb(var(--neo-black));-webkit-text-stroke:0 transparent}}
@keyframes hg-lit{0%,12%{opacity:0}15%,72%{opacity:1}80%,100%{opacity:0}}
@keyframes hg-pop{0%,12%{transform:scale(1)}15%{transform:scale(1.13) rotate(-3deg)}20%,100%{transform:scale(1)}}
@keyframes hg-draw{0%,12%{stroke-dashoffset:1;opacity:1}30%,72%{stroke-dashoffset:0;opacity:1}80%{stroke-dashoffset:0;opacity:0}100%{stroke-dashoffset:1;opacity:0}}
@keyframes hg-chip{0%,31%{opacity:0;transform:translate(-50%,6px) scale(.8)}35%{opacity:1;transform:translate(-50%,0) scale(1.1)}39%,72%{opacity:1;transform:translate(-50%,0) scale(1)}80%,100%{opacity:0;transform:translate(-50%,0) scale(1)}}
@keyframes hg-chip-in{0%{opacity:0;transform:translate(-50%,8px) scale(.6)}100%{opacity:1;transform:translate(-50%,0) scale(1)}}
@keyframes hg-cheer{0%{transform:scale(1)}45%{transform:scale(1.16) rotate(5deg)}100%{transform:scale(1.04)}}
@keyframes hg-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(2px)}}
`;

export interface HeroGridProps {
  /** Fires once when the visitor traces the demo word. */
  onFound?: () => void;
}

export function HeroGrid({ onFound }: HeroGridProps) {
  const { t, language } = useLanguage();
  const demo = getHeroDemo(language);
  const [mode, setMode] = useState<Mode>('demo');
  const [sel, setSel] = useState<Cell[]>([]);
  const dragging = useRef(false);
  const lastPointer = useRef<string | null>(null);
  const missTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stop = () => {
      dragging.current = false;
    };
    window.addEventListener('pointerup', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      if (missTimer.current) clearTimeout(missTimer.current);
    };
  }, []);

  const judge = useCallback(
    (next: Cell[]) => {
      const word = next.map((c) => demo.letters[c.row][c.col]).join('');
      if (word === demo.word) {
        dragging.current = false;
        setMode('found');
        onFound?.();
        return;
      }
      dragging.current = false;
      setMode('miss');
      missTimer.current = setTimeout(() => {
        setSel([]);
        setMode('play');
      }, 700);
    },
    [demo, onFound]
  );

  const add = useCallback(
    (cell: Cell) => {
      if (mode === 'miss') return;
      if (missTimer.current) clearTimeout(missTimer.current);
      const base = mode === 'found' ? [] : sel;
      const last = base[base.length - 1];
      let next: Cell[];
      if (last && same(last, cell)) next = base.slice(0, -1);
      else if (base.some((c) => same(c, cell))) return;
      else if (last && !adjacent(last, cell)) next = [cell];
      else next = [...base, cell];
      setSel(next);
      setMode('play');
      if (next.length === demo.word.length) judge(next);
    },
    [mode, sel, demo.word.length, judge]
  );

  const spelled = [...demo.word].join('-');
  const caption =
    mode === 'found'
      ? t('homeFresh.hero.found', { word: demo.word })
      : mode === 'miss'
        ? t('homeFresh.hero.miss', { letters: spelled })
        : t('homeFresh.hero.hint', { letters: spelled });
  const litCells = mode === 'demo' ? demo.path : sel;

  return (
    <figure className="hg relative m-0 flex w-full flex-col items-center" data-mode={mode}>
      <style>{CSS}</style>
      <div
        data-hero-grid
        data-state={mode}
        dir="ltr"
        role="group"
        aria-label={t('homeFresh.hero.gridLabel', { word: demo.word })}
        className="hg-board relative w-full rounded-neo-xl border-3 border-neo-black bg-neo-navy-light p-[5%] shadow-[7px_7px_0_0_var(--neo-pink)]"
      >
        <div
          aria-hidden="true"
          className="hg-chip absolute -top-5 left-1/2 z-30 inline-flex items-center gap-1.5 rounded-neo-pill border-3 border-neo-black bg-neo-lime px-3 py-1 font-neo-display text-base font-bold text-neo-black shadow-hard"
        >
          {demo.word}
          <Check className="h-4 w-4" strokeWidth={3.5} />
        </div>
        <div className="relative aspect-square w-full [container-type:inline-size]">
          {demo.letters.map((row, r) =>
            row.map((letter, c) => {
              const cell = { row: r, col: c };
              const order = demo.path.findIndex((p) => same(p, cell));
              const lit = litCells.some((p) => same(p, cell));
              return (
                <div
                  key={`${r}-${c}`}
                  className="hg-tile absolute"
                  data-lit={lit || undefined}
                  data-order={order >= 0 ? order : undefined}
                  style={{ left: `${c * 35}%`, top: `${r * 35}%`, width: '30%', height: '30%' }}
                >
                  <span
                    aria-hidden="true"
                    className="hg-face absolute inset-0 z-0 overflow-hidden rounded-neo-lg border-3 border-neo-black bg-neo-cream shadow-hard-lg"
                  >
                    <span className="hg-lit absolute inset-0 bg-neo-pink" />
                  </span>
                  <button
                    type="button"
                    data-cell={`${r}-${c}`}
                    aria-pressed={mode !== 'demo' && lit}
                    onPointerDown={(e) => {
                      lastPointer.current = e.pointerType;
                      if (e.pointerType !== 'mouse') return;
                      dragging.current = true;
                      add(cell);
                    }}
                    onPointerEnter={(e) => {
                      if (e.pointerType === 'mouse' && dragging.current) add(cell);
                    }}
                    onKeyDown={() => {
                      lastPointer.current = null;
                    }}
                    onClick={() => {
                      if (lastPointer.current === 'mouse') return;
                      add(cell);
                    }}
                    className="hg-btn absolute inset-0 z-20 flex select-none items-center justify-center rounded-neo-lg font-neo-display text-[16cqi] font-bold leading-none text-neo-black focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cream"
                  >
                    {letter}
                  </button>
                </div>
              );
            })
          )}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            className="hg-path pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
          >
            <polyline
              points={points(litCells)}
              pathLength={1}
              className="hg-line-edge"
              fill="none"
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={points(litCells)}
              pathLength={1}
              className="hg-line"
              fill="none"
              strokeWidth={4.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <figcaption
        aria-live="polite"
        className={cn(
          'mt-3 flex min-h-7 items-center text-center font-neo-body text-sm font-bold md:text-base',
          mode === 'found' ? 'text-neo-lime' : 'text-neo-cream/80'
        )}
      >
        {caption}
      </figcaption>
    </figure>
  );
}
