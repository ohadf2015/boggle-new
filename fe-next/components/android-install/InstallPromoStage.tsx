import type { CSSProperties } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { installPromoBoard } from './installPromoBoard';
import styles from './InstallPromoStage.module.css';

const TRACE_SECONDS = 1.36;
const TRACE_START = 0.9;
const BURST = [
  [-5.5, -4.5, 'bg-neo-lime'],
  [5, -5.5, 'bg-neo-cyan'],
  [7, -1, 'bg-neo-pink'],
  [-7, 0.5, 'bg-neo-yellow'],
  [-3, -7, 'bg-neo-orange'],
  [2, -7.5, 'bg-neo-white'],
] as const;

const center = (cell: number) => `${(cell % 4) * 100 + 50},${Math.floor(cell / 4) * 100 + 50}`;

export default function InstallPromoStage({ locale, wide }: { locale: string; wide: boolean }) {
  const { word, letters, path } = installPromoBoard(locale);
  const wordLetters = [...word];
  const step = TRACE_SECONDS / (wordLetters.length - 1);
  const done = TRACE_START + TRACE_SECONDS + 0.05;
  const timing = { '--done': `${done}s` } as CSSProperties;
  const at = (index: number) => ({ '--at': `${TRACE_START + index * step}s` }) as CSSProperties;

  return (
    <div aria-hidden="true" dir="ltr" data-wide={wide} className={styles.stage} style={timing}>
      <div className={styles.rays} />
      <span className={cn(styles.sticker, styles.stickerA)}>{letters[0]}</span>
      <span className={cn(styles.sticker, styles.stickerB)}>{letters[11]}</span>
      <span className={cn(styles.sticker, styles.stickerC)}>{letters[15]}</span>

      <div className={styles.phone}>
        <div className={styles.speaker} />
        <div className={styles.hud}>
          <div className={styles.slots}>
            {wordLetters.map((letter, index) => (
              <span key={index} className={styles.slot} style={at(index)}>
                {letter}
              </span>
            ))}
          </div>
          <span className={styles.score}>+{wordLetters.length * 8}</span>
        </div>

        <div className={styles.board}>
          {letters.map((letter, cell) => {
            const index = path.indexOf(cell);
            return (
              <span
                key={cell}
                className={cn(styles.tile, index >= 0 && styles.tileHit)}
                style={index >= 0 ? at(index) : undefined}
              >
                {letter}
              </span>
            );
          })}
          <svg className={styles.trace} viewBox="0 0 400 400">
            <polyline points={path.map(center).join(' ')} pathLength={1} />
          </svg>
          <div className={styles.burst}>
            {BURST.map(([x, y, color]) => (
              <i key={color} className={color} style={{ '--x': `${x}em`, '--y': `${y}em` } as CSSProperties} />
            ))}
          </div>
        </div>

        <div className={styles.timer}>
          <span />
        </div>
      </div>

      <div className={styles.mascot}>
        <Image src="/mascot/hello-nobg.webp" alt="" fill sizes="120px" className="object-contain" loading="eager" />
      </div>
    </div>
  );
}
