'use client';

/**
 * A few sparks thrown off a score chip on a correct answer.
 *
 * BoundedConfettiBurst refuses mobile web (full-screen confetti flashes on the
 * Chromium mobile renderer), so the phone gets its own bounded burst: six 6px
 * dots inside the chip's own box, transform-only, through AdaptiveMotion so
 * reduced-motion and low-end devices skip it.
 */
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';

const SPARK_VECTORS: ReadonlyArray<[number, number]> = [
  [-22, -14], [0, -20], [22, -14], [-22, 12], [0, 18], [22, 12],
];

export function ScoreSparkBurst({ id, testId = 'live-board-spark' }: { id: number | string; testId?: string }) {
  return (
    <span aria-hidden="true" data-testid={testId} className="pointer-events-none absolute inset-0 z-0">
      {SPARK_VECTORS.map(([x, y], i) => (
        <AdaptiveMotion.span
          key={`${id}-${i}`}
          initial={{ x: 0, y: 0, scale: 1 }}
          animate={{ x, y, scale: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn(
            'absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full',
            i % 2 === 0 ? 'bg-neo-lime' : 'bg-neo-yellow'
          )}
        />
      ))}
    </span>
  );
}

export default ScoreSparkBurst;
