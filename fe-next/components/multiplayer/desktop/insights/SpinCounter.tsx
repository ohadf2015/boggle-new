import { useLanguage } from '@/contexts/LanguageContext';

interface SpinCounterProps {
  current: number;
  total: number;
}

export function SpinCounter({ current, total }: SpinCounterProps) {
  const { t } = useLanguage();
  const safeCurrent = Math.max(0, Math.min(total, current));
  return (
    <span
      data-testid="spin-counter"
      data-current={safeCurrent}
      data-total={total}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-neo-pink border border-neo-pink rounded"
      aria-label={t('mp.insights.spinCounterAria', { current: String(safeCurrent), total: String(total) })}
    >
      <span aria-hidden>↻</span>
      <span className="tabular-nums">{safeCurrent}/{total}</span>
    </span>
  );
}
