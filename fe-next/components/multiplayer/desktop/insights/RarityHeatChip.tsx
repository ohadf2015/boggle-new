import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export type RarityTier = 'common' | 'uncommon' | 'rare' | 'legendary';

interface RarityHeatChipProps {
  rarity: RarityTier;
}

const TIER_CLASS: Record<RarityTier, string> = {
  common: 'border-foreground/40 bg-foreground/5 text-foreground/70',
  uncommon: 'border-neo-cyan bg-neo-cyan/10 text-neo-cyan',
  rare: 'border-neo-purple bg-neo-purple/10 text-neo-purple',
  legendary: 'border-neo-yellow bg-neo-yellow/10 text-neo-yellow shadow-hard-lg',
};

const TIER_GLYPH: Record<RarityTier, string> = {
  common: '·',
  uncommon: '◆',
  rare: '✦',
  legendary: '★',
};

export function RarityHeatChip({ rarity }: RarityHeatChipProps) {
  const { t } = useLanguage();
  return (
    <span
      data-testid="rarity-heat-chip"
      data-rarity={rarity}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold rounded border-2 uppercase tracking-wide',
        TIER_CLASS[rarity],
      )}
      aria-label={t(`mp.insights.rarity.${rarity}`)}
    >
      <span aria-hidden>{TIER_GLYPH[rarity]}</span>
      <span>{t(`mp.insights.rarity.${rarity}`)}</span>
    </span>
  );
}
