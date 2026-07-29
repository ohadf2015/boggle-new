'use client';

import { cn } from '@/lib/utils';

interface BoardPreviewGridProps {
  grid: string[][];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
} as const;

/**
 * BoardPreviewGrid — read-only grid renderer for custom boards.
 * Neo-brutalist tile styling: bg-neo-navy, border-neo, font-neo-display.
 */
export function BoardPreviewGrid({ grid, size = 'md', className }: BoardPreviewGridProps) {
  const tileClass = SIZE_CLASSES[size];

  return (
    <div
      data-testid="board-preview-grid"
      className={cn('inline-flex flex-col gap-1', className)}
      aria-label="Board preview"
    >
      {grid.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-1">
          {row.map((letter, colIdx) => (
            <div
              key={`${rowIdx}-${colIdx}`}
              className={cn(
                tileClass,
                'flex items-center justify-center',
                'bg-neo-navy border-neo border-black rounded-neo',
                'font-neo-display font-bold uppercase text-neo-white',
                'select-none'
              )}
            >
              {letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
