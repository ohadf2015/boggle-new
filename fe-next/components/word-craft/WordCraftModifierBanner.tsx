'use client';

import { Zap } from 'lucide-react';
import { modifierLabelKey, type WordCraftModifier } from '@/lib/word-craft/modifiers';

interface Props {
  modifier: WordCraftModifier;
  t: (path: string, fallback?: string) => string;
}

/**
 * Compact "today's twist" chip. Always-visible (not a fleeting toast) so the
 * player can recall the active scoring rule, with a pop on mount. Hidden for
 * the no-op `none` baseline. Purposely on-brand purple = "special rule".
 */
export function WordCraftModifierBanner({ modifier, t }: Props) {
  if (modifier === 'none') return null;
  return (
    <div
      role="status"
      className="self-center inline-flex items-center gap-2 px-3 py-1 rounded-neo border-neo-thick border-black bg-neo-purple text-white shadow-hard-sm animate-neo-pop"
    >
      <Zap className="w-4 h-4 shrink-0" strokeWidth={3} aria-hidden />
      <span className="font-neo-display font-black uppercase tracking-wide text-xs">
        {t(modifierLabelKey(modifier))}
      </span>
      <span className="font-neo-body text-[11px] opacity-90">
        {t(`wordcraft.modifier.desc.${modifier}`)}
      </span>
    </div>
  );
}
