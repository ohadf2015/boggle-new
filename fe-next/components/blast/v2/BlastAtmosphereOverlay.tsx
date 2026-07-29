'use client';
import { useReducedMotion } from 'framer-motion';
import styles from './BlastAtmosphereOverlay.module.css';

type Props = { modeColor: string };

// Pure-CSS replacement for the previous Pixi atmosphere. Reflows to the
// container automatically — no canvas, no resize listener, no tick loop.
// `modeColor` is forwarded as a CSS custom property so the radial gradient
// and ambient particles tint to match the level's theme.
export function BlastAtmosphereOverlay({ modeColor }: Props) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <div
      data-testid="blast-atmosphere"
      className={`${styles.atmosphere} absolute inset-0 pointer-events-none`}
      data-reduced-motion={prefersReducedMotion ? '' : undefined}
      style={{ ['--mode-color' as string]: modeColor, zIndex: 1 }}
    >
      <div className={styles.spotlight} />
      <div className={styles.vignette} />
      {!prefersReducedMotion && (
        <>
          <span className={styles.particle} style={{ left: '18%', top: '22%', animationDelay: '0s' }} />
          <span className={styles.particle} style={{ left: '72%', top: '14%', animationDelay: '1.4s' }} />
          <span className={styles.particle} style={{ left: '42%', top: '68%', animationDelay: '2.8s' }} />
          <span className={styles.particle} style={{ left: '88%', top: '54%', animationDelay: '4.1s' }} />
          <span className={styles.particle} style={{ left: '8%', top: '46%', animationDelay: '5.5s' }} />
        </>
      )}
    </div>
  );
}
