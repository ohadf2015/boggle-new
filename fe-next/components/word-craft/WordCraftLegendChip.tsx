import { cn } from '@/lib/utils';

interface Props {
  t: (key: string) => string;
  className?: string;
}

const SWATCHES = [
  { kind: 'TW', tint: 'bg-neo-pink/30 border-neo-pink', i18n: 'wordcraft.legend.tw' },
  { kind: 'DW', tint: 'bg-neo-lime/30 border-neo-lime', i18n: 'wordcraft.legend.dw' },
  { kind: 'TL', tint: 'bg-neo-cyan/30 border-neo-cyan', i18n: 'wordcraft.legend.tl' },
  { kind: 'DL', tint: 'bg-neo-purple/30 border-neo-purple', i18n: 'wordcraft.legend.dl' },
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
