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
          return (
            <g key={`${i}-${b.word}`}>
              <rect x={x} y={y} width={w} height={FLOOR_H} rx={10} fill={hex(b.color, i)} stroke="#000" strokeWidth={9} />
              <rect x={x + 26} y={y + 30} width={26} height={30} fill="#0f1b3d" opacity={0.55} />
              <rect x={x + w - 52} y={y + 30} width={26} height={30} fill="#0f1b3d" opacity={0.55} />
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
              const r = 46;
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
                  <rect x={b.x - Math.max(40, b.w) / 2} y={b.y - FLOOR_H / 2} width={Math.max(40, b.w)} height={FLOOR_H} fill="transparent" />
                  <circle cx={b.x} cy={b.y} r={r} fill="none" stroke="#000" strokeWidth={14} opacity={on ? 0.9 : 0.5} />
                  <circle cx={b.x} cy={b.y} r={r} fill="none" stroke={on ? '#ff2e88' : '#fffef0'} strokeWidth={7} opacity={on ? 1 : 0.7} />
                  {[-1, 1].map((sx) => (
                    <rect key={`h${sx}`} x={b.x + sx * (r + 26) - 13} y={b.y - 4} width={26} height={8} fill={on ? '#ff2e88' : '#fffef0'} opacity={on ? 1 : 0.7} />
                  ))}
                  {[-1, 1].map((sy) => (
                    <rect key={`v${sy}`} x={b.x - 4} y={b.y + sy * (r + 26) - 13} width={8} height={26} fill={on ? '#ff2e88' : '#fffef0'} opacity={on ? 1 : 0.7} />
                  ))}
                  {on ? <circle cx={b.x} cy={b.y} r={13} fill="#ff2e88" stroke="#000" strokeWidth={6} /> : null}
                </g>
              );
            })
          : null}
      </g>
    </svg>
  );
}

export const TowerMini = memo(TowerMiniImpl);

/** View-box height that fits the tallest tower on a board (engine px). */
export function boardViewH(towers: TowerBlock[][]): number {
  const floors = towers.reduce((m, t) => Math.max(m, t.length), 0);
  return Math.max(3, floors) * FLOOR_H + 30;
}
