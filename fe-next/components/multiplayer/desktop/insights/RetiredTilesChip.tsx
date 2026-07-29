import { useLanguage } from '@/contexts/LanguageContext';

interface RetiredTilesChipProps {
  count: number;
}

export function RetiredTilesChip({ count }: RetiredTilesChipProps) {
  const { t } = useLanguage();
  if (count <= 0) return null;
  return (
    <span
      data-testid="retired-tiles-chip"
      data-count={count}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs border-2 border-foreground/40 bg-foreground/5 rounded font-bold uppercase tracking-wide"
    >
      <span aria-hidden>🔥</span>
      <span className="tabular-nums">{count}</span>
      <span className="opacity-70">{t('mp.insights.retiredTiles')}</span>
    </span>
  );
}
