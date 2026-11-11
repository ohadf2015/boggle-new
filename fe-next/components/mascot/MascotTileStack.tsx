'use client';

const MAX_TILES = 5;
const COLORS = ['bg-neo-yellow', 'bg-neo-lime', 'bg-neo-pink', 'bg-neo-cyan', 'bg-neo-yellow'];

/** Combo stack on the mascot's head: one tile per combo step, wobbling more as it grows. */
export function MascotTileStack({ count }: { count: number }) {
  const tiles = Math.min(Math.max(count, 0), MAX_TILES);
  if (tiles === 0) return null;
  return (
    <div
      data-testid="mascot-tile-stack"
      data-tiles={tiles}
      aria-hidden="true"
      className="pointer-events-none absolute bottom-full start-1/2 flex -translate-x-1/2 rtl:translate-x-1/2 flex-col-reverse items-center"
    >
      {Array.from({ length: tiles }, (_, i) => (
        <div
          key={i}
          style={{ transform: `translateX(${(i % 2 ? 1 : -1) * i}px) rotate(${(i % 2 ? 1 : -1) * i * 3}deg)` }}
          className={`size-3 sm:size-4 rounded-[2px] border-2 border-neo-navy ${COLORS[i]}`}
        />
      ))}
    </div>
  );
}
