import { cn } from '@/lib/utils';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const SIZES = {
  sm: { tile: 'size-2 border-[1.5px]', gap: 'gap-1.5', text: 'text-xs' },
  md: { tile: 'size-2.5 border-2', gap: 'gap-2', text: 'text-sm' },
  lg: { tile: 'size-3.5 border-2', gap: 'gap-2', text: 'text-base' },
} as const;

const TILE_COLORS = ['bg-neo-lime', 'bg-neo-pink', 'bg-neo-cyan'] as const;

/** Inline loader: the page loader's three bouncing tiles without the mascot. */
export function Loader({ size = 'md', text, className }: LoaderProps) {
  const s = SIZES[size];

  return (
    <div
      role={text ? 'status' : undefined}
      aria-busy={text ? true : undefined}
      className={cn('flex flex-col items-center justify-center', className)}
    >
      <div aria-hidden className={cn('flex items-end pt-1.5', s.gap)}>
        {TILE_COLORS.map((color) => (
          <span
            key={color}
            data-testid="loader-tile"
            className={cn('lc-loader-tile rounded-[2px] border-neo-black', s.tile, color)}
          />
        ))}
      </div>
      {text && <p className={cn('font-neo-body mt-2', s.text)}>{text}</p>}
    </div>
  );
}
