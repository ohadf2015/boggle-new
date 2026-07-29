import { cn } from '@/lib/utils';

interface Props {
  t: (key: string) => string;
  className?: string;
}

// Tints mirror WordCraftBoard's PREMIUM_TINT: word bonuses are pink, letter
// bonuses are cyan, triple is the bolder tier. The legend previously used
// lime/purple, which disagreed with the actual board and confused players.
const SWATCHES = [
  { kind: 'TW', tint: 'bg-neo-pink/65 border-neo-pink', i18n: 'wordcraft.legend.tw' },
  { kind: 'DW', tint: 'bg-neo-pink/45 border-neo-pink/70', i18n: 'wordcraft.legend.dw' },
  { kind: 'TL', tint: 'bg-neo-cyan/60 border-neo-cyan', i18n: 'wordcraft.legend.tl' },
  { kind: 'DL', tint: 'bg-neo-cyan/40 border-neo-cyan/70', i18n: 'wordcraft.legend.dl' },
] as const;

export function WordCraftLegendChip({ t, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1.5 px-3 py-2 rounded-neo border-neo bg-neo-navy-light',
        className,
      )}
      aria-label={t('wordcraft.legend.title')}
    >
      {SWATCHES.map((s) => (
        <span
          key={s.kind}
          data-premium={s.kind}
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-neo-body border-neo',
            s.tint,
          )}
        >
          <span className="w-2 h-2 rounded-sm" aria-hidden="true" />
          {t(s.i18n)}
        </span>
      ))}
    </div>
  );
}
