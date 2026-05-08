import { useLanguage } from '@/contexts/LanguageContext';

interface LuckyBoostChipProps {
  active: boolean;
}

export function LuckyBoostChip({ active }: LuckyBoostChipProps) {
  const { t } = useLanguage();
  if (!active) return null;
  return (
    <span
      data-testid="lucky-boost-chip"
      data-active="true"
      className="inline-flex items-center gap-1 px-2 py-1 text-xs border-2 border-neo-yellow bg-neo-yellow/10 text-neo-yellow rounded font-bold uppercase tracking-wide animate-combo-pulse"
    >
      <span aria-hidden>🍀</span>
      <span>{t('mp.insights.luckyBoost')}</span>
    </span>
  );
}
