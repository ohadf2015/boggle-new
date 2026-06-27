'use client';

/**
 * CosmeticUnlockToast — the celebratory capsule shown when a player unlocks a
 * new cosmetic (via a rank-up or streak milestone).
 *
 * Replaces the old bare `toast.success(...)` green-check popover, which rendered
 * as a flat, off-brand dark pill that stacked ugly duplicates. This is a proper
 * neo-styled capsule: rarity-tinted border + glow, a sparkle icon, the cosmetic
 * name, a rarity badge, and a clear "tap to equip" CTA. The whole capsule is a
 * deep-link to the collection so the unlock turns into an equip instead of a
 * dead-end announcement.
 *
 * Dedup: each toast is keyed `cosmetic-unlock-<id>` so a re-fire for the same
 * cosmetic replaces (never stacks) the existing capsule.
 */

import { m } from 'framer-motion';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Cosmetic, CosmeticRarity } from '@/lib/cosmetics';

type Translate = (key: string, params?: Record<string, string | number>) => string;

// Rarity → neo accent palette. `accent` drives border + glow; `chip` is the
// rarity-badge fill. Kept inline (not CSS vars) so the glow boxShadow can use it.
const RARITY_ACCENT: Record<CosmeticRarity, { accent: string; glow: string }> = {
  common: { accent: '#9aa0b4', glow: 'rgba(154,160,180,0.55)' },
  rare: { accent: '#00FFFF', glow: 'rgba(0,255,255,0.55)' },
  epic: { accent: '#9370DB', glow: 'rgba(147,112,219,0.6)' },
  legendary: { accent: '#BFFF00', glow: 'rgba(191,255,0,0.6)' },
};

interface CosmeticUnlockToastContentProps {
  cosmetic: Cosmetic;
  href: string;
  isVisible: boolean;
  isRtl: boolean;
  t: Translate;
  onDismiss: () => void;
}

function CosmeticUnlockToastContent({
  cosmetic,
  href,
  isVisible,
  isRtl,
  t,
  onDismiss,
}: CosmeticUnlockToastContentProps) {
  const { accent, glow } = RARITY_ACCENT[cosmetic.rarity];
  const name = t(cosmetic.name);
  const rarityLabel = t(`cosmetics.rarity.${cosmetic.rarity}`);

  return (
    <m.a
      href={href}
      onClick={onDismiss}
      initial={{ y: -24, opacity: 0, scale: 0.94 }}
      animate={isVisible ? { y: 0, opacity: 1, scale: 1 } : { y: -16, opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 440, damping: 24, mass: 0.6 }}
      className={cn(
        'group relative flex items-center gap-3 overflow-hidden no-underline',
        'rounded-neo-lg border-3 border-neo-black bg-neo-navy/95',
        'ps-3 pe-4 py-2.5',
      )}
      style={{
        boxShadow: `${isRtl ? '-4px 4px' : '4px 4px'} 0 0 rgb(var(--neo-black)), 0 0 18px ${glow}`,
        minWidth: '248px',
        maxWidth: '340px',
        pointerEvents: 'auto',
      }}
      role="status"
      aria-live="polite"
      data-testid="cosmetic-unlock-toast"
    >
      {/* Shine sweep across the capsule on entrance */}
      <m.span
        aria-hidden
        initial={{ x: isRtl ? 280 : -280, opacity: 0 }}
        animate={{ x: isRtl ? -280 : 280, opacity: [0, 0.7, 0] }}
        transition={{ delay: 0.14, duration: 0.95, ease: 'easeOut' }}
        className="pointer-events-none absolute inset-y-0 w-20"
        style={{
          background: `linear-gradient(${isRtl ? '-75deg' : '75deg'}, transparent, ${glow}, transparent)`,
          mixBlendMode: 'screen',
        }}
      />

      {/* Sparkle icon in a rarity-tinted ring */}
      <div className="relative flex-shrink-0">
        <m.span
          aria-hidden
          animate={{ boxShadow: [`0 0 0 0 ${glow}`, `0 0 0 7px transparent`, `0 0 0 0 ${glow}`] }}
          transition={{ duration: 1.7, repeat: Infinity, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full"
        />
        <m.div
          initial={{ scale: 0, rotate: -160 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.05, type: 'spring', stiffness: 340, damping: 13 }}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-neo-black"
          style={{ backgroundColor: accent }}
        >
          <Sparkles className="h-5 w-5 text-neo-black" aria-hidden />
        </m.div>
      </div>

      {/* Text column */}
      <div className="relative flex min-w-0 flex-1 flex-col leading-tight">
        <span className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-neo-white/70">
            {t('cosmetics.unlockedLabel')}
          </span>
          <span
            className="rounded-sm px-1.5 py-px text-[9px] font-black uppercase tracking-wider text-neo-black"
            style={{ backgroundColor: accent, boxShadow: `0 0 6px ${glow}` }}
          >
            {rarityLabel}
          </span>
        </span>
        <span
          className="truncate font-neo-display text-sm font-black"
          style={{ color: accent }}
        >
          {name}
        </span>
        <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-neo-white/80 underline-offset-2 group-hover:underline">
          {t('cosmetics.equipCta')}
          <span aria-hidden>{isRtl ? '←' : '→'}</span>
        </span>
      </div>
    </m.a>
  );
}

interface ShowCosmeticUnlockToastArgs {
  cosmetic: Cosmetic;
  language: string;
  isRtl: boolean;
  t: Translate;
}

/**
 * Fire the cosmetic-unlock capsule. Stable per-cosmetic id means a repeat call
 * for the same cosmetic replaces the existing toast rather than stacking a
 * duplicate.
 */
export function showCosmeticUnlockToast({
  cosmetic,
  language,
  isRtl,
  t,
}: ShowCosmeticUnlockToastArgs): string {
  const href = `/${language}/profile?tab=collection`;
  const id = `cosmetic-unlock-${cosmetic.id}`;
  return toast.custom(
    (instance) => (
      <CosmeticUnlockToastContent
        cosmetic={cosmetic}
        href={href}
        isVisible={instance.visible}
        isRtl={isRtl}
        t={t}
        onDismiss={() => toast.dismiss(instance.id)}
      />
    ),
    { id, duration: 6000, position: 'top-center' },
  );
}

export default CosmeticUnlockToastContent;
