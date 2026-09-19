/** Three sample tiles rendered with a world skin — reuses the real tile CSS hook (.letter-tile-gradient). */
import { cn } from '@/lib/utils';

export default function SkinSwatch({ world, letters = 'ABC', className }: { world: number; letters?: string; className?: string }) {
  return (
    <div data-tile-skin={`world-${world}`} className={cn('flex gap-1.5', className)} aria-hidden>
      {letters.split('').map((l, i) => (
        <span
          key={i}
          className="letter-tile-gradient grid place-items-center w-10 h-10 rounded-lg border-[3px] font-neo-display font-bold text-xl"
        >
          {l}
        </span>
      ))}
    </div>
  );
}
