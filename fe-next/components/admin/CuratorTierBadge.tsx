'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { MAX_CURATOR_TIER } from '@/lib/curator/curatorScope';

/**
 * Neo-brutalist capability-tier badge for Language Curators.
 *
 * Visualises the SAME tier the server enforces (lib/curator/curatorScope
 * → CURATOR_TIER_CAPABILITIES): N filled pips of MAX_CURATOR_TIER plus the
 * tier's short label. Colour escalates with power so a tier-3 lead reads as
 * "stronger" at a glance. Reused by the players-page control, the curators
 * list, and the access-levels explainer so the visual never drifts.
 */

const TIER_STYLES: Record<number, { box: string; pip: string }> = {
  1: { box: 'bg-neo-cyan text-black', pip: 'bg-black' },
  2: { box: 'bg-neo-purple text-white', pip: 'bg-white' },
  3: { box: 'bg-neo-lime text-black', pip: 'bg-black' },
};

interface CuratorTierBadgeProps {
  tier: number;
  /** Show the tier's word label (Moderator/Editor/Lead) next to the pips. */
  showLabel?: boolean;
  className?: string;
}

export function CuratorTierBadge({ tier, showLabel = true, className = '' }: CuratorTierBadgeProps) {
  const { t } = useLanguage();
  const clamped = Math.min(Math.max(tier, 1), MAX_CURATOR_TIER);
  const style = TIER_STYLES[clamped] ?? TIER_STYLES[1];
  const label = t(`curator.tier.${clamped}.label`);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-neo border-neo border-black px-2 py-0.5 text-xs font-neo-display shadow-hard-sm ${style.box} ${className}`}
      title={t(`curator.tier.${clamped}.desc`)}
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: MAX_CURATOR_TIER }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${i < clamped ? style.pip : 'bg-black/25'}`}
          />
        ))}
      </span>
      <span>{showLabel ? label : `T${clamped}`}</span>
    </span>
  );
}
