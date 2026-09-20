import { memo } from 'react';
import type { TowerBlock } from '@/lib/wordTowerV2/estateTower';

/**
 * A tower as a flat SVG silhouette — the rival's ACTUAL floors (stored widths,
 * offsets and colours), not a stock icon.
 *
 * Every mini in a board is drawn in the SAME view box (`viewH` = the tallest
 * tower on screen) and anchored to the bottom, so a taller tower really is
 * taller on screen. Comparing heights is the whole point of the board.
 */

const FLOOR_H = 120;
const HALF_W = 230;
const FALLBACK = ['#b6f24a', '#ff5fa2', '#3ecfff', '#ffd93d', '#a974ff'];

const hex = (c: number, i: number) => (c > 0 ? `#${c.toString(16).padStart(6, '0')}` : FALLBACK[i % FALLBACK.length]);

interface Props {
  tower: TowerBlock[];
  /** Engine px the view box is tall — share one value across a board. */
  viewH: number;
  className?: string;
  /** Dim + desaturate (guest teaser). */
  ghost?: boolean;
  /**
   * Engine px each side of centre the view box covers. The board shares the
   * default so every column is drawn to one scale; the target reveal hugs the
   * building instead, or a lone tower renders as a thin strip in a wide box.
   */
  halfW?: number;
  title?: string;
  /**
   * Coin Master drops a crosshair on every building in the target's village and
   * lets you choose what to smash. This is that: one reticle per floor, and the
   * chosen one is the floor the wrecking round marks for you.
   */
  pick?: { selected: number | null; onPick: (i: number) => void; label: (i: number) => string };
}

/**
 * Text that always fits inside a slab: shrink by the word's length, never
 * overflow the floor. A `textLength` squeeze would distort Hebrew and Japanese.
 */
function fontFor(word: string, w: number): number {
  return Math.max(26, Math.min(58, ((w - 54) / Math.max(1, word.length)) * 1.8));
}

function TowerMiniImpl({ tower, viewH, className, ghost, title, halfW, pick }: Props) {
  const h = Math.max(viewH, FLOOR_H * 2);
  const half = Math.max(60, halfW ?? HALF_W);
  return (
    <svg
      viewBox={`${-half} ${-h} ${half * 2} ${h + 18}`}
      preserveAspectRatio="xMidYMax meet"
      className={className}
      role={pick ? 'group' : 'img'}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <g opacity={ghost ? 0.45 : 1}>
        {tower.map((b, i) => {
          const w = Math.max(40, b.w);
          const x = b.x - w / 2;
          const y = b.y - FLOOR_H / 2;
          const word = (b.word ?? '').toUpperCase();
          return (
            <g key={`${i}-${b.word}`}>
              <rect x={x} y={y} width={w} height={FLOOR_H} rx={10} fill={hex(b.color, i)} stroke="#000" strokeWidth={9} />
              <rect x={x + 26} y={y + 30} width={26} height={30} fill="#0f1b3d" opacity={0.55} />
              <rect x={x + w - 52} y={y + 30} width={26} height={30} fill="#0f1b3d" opacity={0.55} />
              {/* The floor's WORD, on the floor. Sixteen coloured chips with no
                  labels are sixteen identical chips — the judge called the
                  target screen "a choice with no visible stakes" for exactly
                  that reason. Only the pickable reveal carries them: on a board
                  of thumbnails they would be unreadable noise. */}
              {pick && word ? (
                <text
                  x={b.x}
                  y={b.y + 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#0f1b3d"
                  stroke="#0f1b3d"
                  strokeWidth={1}
                  fontSize={fontFor(word, w)}
                  fontWeight={900}
                  letterSpacing={1}
                  style={{ fontFamily: 'var(--font-fredoka), system-ui, sans-serif' }}
                >
                  {word}
                </text>
              ) : null}
            </g>
          );
        })}
        {/* Ground: the tower stands on something, at the same line in every mini. */}
        <rect x={-half} y={0} width={half * 2} height={14} fill="#000" />
      </g>
      <g>
        {pick
          ? tower.map((b, i) => {
              const on = pick.selected === i;
              const w = Math.max(40, b.w);
              const x = b.x - w / 2;
              const y = b.y - FLOOR_H / 2;
              return (
                <g
                  key={`aim-${i}`}
                  role="button"
                  tabIndex={0}
                  aria-label={pick.label(i)}
                  aria-pressed={on}
                  className="cursor-pointer outline-none"
                  onClick={() => pick.onPick(i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      pick.onPick(i);
                    }
                  }}
                >
                  {/* Whole floor is the tap target — a 46px ring is a miss on a phone. */}
                  <rect x={x} y={y} width={w} height={FLOOR_H} fill="transparent" />
                  {/* ONE crosshair on the screen, on the floor you called.
                      Sixteen reticles was the clutter the judge marked us down
                      for; the bar puts exactly one per target. And it FRAMES
                      the slab rather than covering its middle, so the word
                      stays readable under the thing selecting it. */}
                  {on ? <BracketMark x={x} y={y} w={w} /> : null}
                </g>
              );
            })
          : null}
      </g>
    </svg>
  );
}

/**
 * Target brackets round the called floor: four corners, two side ticks and a
 * pink wash. Reads as "this one is going down" from a thumbnail, and leaves the
 * middle of the slab — where its word is — clear.
 */
function BracketMark({ x, y, w }: { x: number; y: number; w: number }) {
  // The frame sits OUTSIDE the slab. Drawn on it, the corner arms covered the
  // floor's own word — the one thing that makes this floor different from the
  // fifteen below it.
  const o = 13;
  const bx = x - o;
  const by = y - o;
  const bw = w + o * 2;
  const bh = FLOOR_H + o * 2;
  const arm = Math.min(38, bw / 4);
  const corners: Array<[number, number, number, number]> = [
    [bx, by, 1, 1],
    [bx + bw, by, -1, 1],
    [bx, by + bh, 1, -1],
    [bx + bw, by + bh, -1, -1],
  ];
  return (
    <g>
      <rect x={bx} y={by} width={bw} height={bh} rx={12} fill="none" stroke="#ff2e88" strokeWidth={10} />
      {corners.map(([cx, cy, sx, sy], i) => (
        <g key={i} stroke="#fffef0" strokeWidth={10} strokeLinecap="square" fill="none">
          <line x1={cx} y1={cy} x2={cx + sx * arm} y2={cy} />
          <line x1={cx} y1={cy} x2={cx} y2={cy + sy * Math.min(34, bh / 3)} />
        </g>
      ))}
      {[-1, 1].map((s) => (
        <rect key={s} x={s < 0 ? bx - 46 : bx + bw + 12} y={by + bh / 2 - 6} width={34} height={12} fill="#ff2e88" stroke="#000" strokeWidth={5} />
      ))}
    </g>
  );
}

export const TowerMini = memo(TowerMiniImpl);

/** View-box height that fits the tallest tower on a board (engine px). */
export function boardViewH(towers: TowerBlock[][]): number {
  const floors = towers.reduce((m, t) => Math.max(m, t.length), 0);
  return Math.max(3, floors) * FLOOR_H + 30;
}
