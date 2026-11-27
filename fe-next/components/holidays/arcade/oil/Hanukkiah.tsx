import type { CSSProperties, Ref } from 'react';
import { cn } from '@/lib/utils';
import styles from './hanukkiah.module.css';

const W = 400;
const H = 250;
const CUP_Y = 120;
const SHAMASH_Y = 58;
const MID = W / 2;
const GAP = 40;

type Slot = number | 'shamash';

const ORDER: Slot[] = [7, 6, 5, 4, 'shamash', 3, 2, 1, 0];
const xOf = (col: number) => MID + (col - 4) * GAP;
const BASE = `M ${MID - 56} 222 H ${MID + 56} L ${MID + 80} 244 H ${MID - 80} Z`;
const ARMS = [1, 2, 3, 4].map((k) => `M ${MID - GAP * k} ${CUP_Y} A ${GAP * k} ${24 + 20 * k} 0 0 0 ${MID + GAP * k} ${CUP_Y}`);

interface Props {
  lit: number;
  label: string;
  ref?: Ref<HTMLDivElement>;
}

export default function Hanukkiah({ lit, label, ref }: Props) {
  return (
    <div ref={ref} role="img" aria-label={label} dir="ltr" className={styles.root}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.metal} aria-hidden="true">
        <g transform="translate(5 5)" className={styles.shadow}>
          {ARMS.map((d) => <path key={d} d={d} />)}
          <rect x={MID - 9} y={SHAMASH_Y} width={18} height={168} />
          <path d={BASE} />
        </g>
        <g className={styles.ink}>{ARMS.map((d) => <path key={d} d={d} />)}</g>
        <g className={styles.gold}>{ARMS.map((d) => <path key={d} d={d} />)}</g>
        <g className={styles.shine}>{ARMS.map((d) => <path key={d} d={d} />)}</g>
        <rect x={MID - 9} y={SHAMASH_Y} width={18} height={168} rx={3} className={styles.solid} />
        <path d={BASE} className={styles.solid} />
        <path d={`M ${MID - 56} 226 H ${MID + 56}`} className={styles.rim} />
        {ORDER.map((s, col) => {
          const y = s === 'shamash' ? SHAMASH_Y : CUP_Y;
          return <rect key={col} x={xOf(col) - 15} y={y - 12} width={30} height={13} rx={3} className={styles.solid} />;
        })}
      </svg>
      {ORDER.map((s, col) => {
        const on = s === 'shamash' || s < lit;
        const y = (s === 'shamash' ? SHAMASH_Y : CUP_Y) - 12;
        const style = { left: `${(xOf(col) / W) * 100}%`, bottom: `${((H - y) / H) * 100}%`, '--d': `${(col * 0.23) % 1}s` } as CSSProperties;
        return (
          <span key={col} data-slot={s} data-lit={on} className={cn(styles.candle, s === 'shamash' && styles.shamash)} style={style}>
            {on && (
              <span data-flame className={styles.flame}>
                <span className={styles.halo} />
                <span className={styles.spark} />
                <span className={styles.core} />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
