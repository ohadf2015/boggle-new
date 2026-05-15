'use client';
import clsx from 'clsx';

export interface FireRowOverlayProps {
  fireRow: number;
  totalRows: number;
}

/**
 * Compact ember meter rendered above the board: shows how many rows of fire
 * are lit out of total. Shakes + glows red once half or more is lit.
 */
export function FireRowOverlay({ fireRow, totalRows }: FireRowOverlayProps) {
  const danger = fireRow * 2 >= totalRows;
  const cells = Array.from({ length: totalRows }, (_, i) => i < fireRow);
  return (
    <div
      data-testid="fire-row-overlay"
      data-danger={String(danger)}
      className={clsx(
        'flex items-center gap-1.5 rounded-neo border-neo border-black bg-neo-navy-light px-3 py-2 shadow-hard-sm',
        danger && 'animate-neo-shake',
      )}
      role="status"
      aria-label={`Fire ${fireRow} of ${totalRows}`}
    >
      <span className="font-neo-display text-xs uppercase text-neo-cream">Fire</span>
      <div className="flex gap-1">
        {cells.map((lit, i) => (
          <span
            key={i}
            className={clsx(
              'h-3 w-3 rounded-sm border border-black',
              lit
                ? danger
                  ? 'bg-neo-red shadow-hard-sm'
                  : 'bg-neo-orange'
                : 'bg-neo-navy',
            )}
          />
        ))}
      </div>
    </div>
  );
}
