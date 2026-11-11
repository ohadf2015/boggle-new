'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { RARITY_TOKENS, type VisualTier } from '@/lib/avatar/rarity';
import { cn } from '@/lib/utils';

export interface RarityChipProps {
  rarity: VisualTier;
  size?: 'xs' | 'sm';
  className?: string;
}

export function RarityChip({ rarity, size = 'sm', className }: RarityChipProps) {
  const { t } = useLanguage();
  const tok = RARITY_TOKENS[rarity];
  return (
    <span
      data-testid="rarity-chip"
      data-rarity={rarity}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border-2 font-black uppercase tracking-wide',
        size === 'xs' ? 'px-1.5 py-0 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        tok.bg,
        tok.border,
        tok.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', tok.dot)} aria-hidden="true" />
      {t(tok.labelKey)}
    </span>
  );
}

export default RarityChip;
