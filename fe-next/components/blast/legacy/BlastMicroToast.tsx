'use client';

import { memo } from 'react';
import {
  Flame, Link as LinkIcon, Zap, BookOpen, Crown, Bomb, Gem, Sparkles, Waves,
  type LucideIcon,
} from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { getMicroDef, type BlastMicroId, type BlastMicroTier } from './utils/blastMicroAchievements';

/**
 * BlastMicroToast — mid-run achievement popup. Mirrors the polish of
 * `BlastChainText` / `ComboMilestoneAnnouncement`: tier-driven gradient,
 * hard shadow, spring entrance, lucide icon (no emoji). Stateless — caller
 * controls show/hide via the `id` prop.
 */

const ICON_MAP: Record<string, LucideIcon> = {
  Flame, Link: LinkIcon, Zap, BookOpen, Crown, Bomb, Gem, Sparkles, Waves,
};

const TIER_STYLES: Record<BlastMicroTier, { bg: string; text: string; glow: string }> = {
  bronze: {
    bg: 'bg-linear-to-r from-orange-400 via-amber-300 to-orange-400',
    text: 'text-neo-black',
    glow: 'rgba(251,146,60,0.55)',
  },
  silver: {
    bg: 'bg-linear-to-r from-neo-cyan via-neo-cream to-neo-cyan',
    text: 'text-neo-black',
    glow: 'rgba(0,255,255,0.55)',
  },
  gold: {
    bg: 'bg-linear-to-r from-neo-lime-light via-neo-cream to-neo-lime-light',
    text: 'text-neo-black',
    glow: 'rgba(191,255,0,0.6)',
  },
  legendary: {
    bg: 'bg-linear-to-r from-neo-purple via-neo-pink to-neo-purple',
    text: 'text-neo-white',
    glow: 'rgba(255,20,147,0.65)',
  },
};

interface BlastMicroToastProps {
  id: BlastMicroId | null;
  t: (key: string) => string | undefined;
}

export const BlastMicroToast = memo(function BlastMicroToast({ id, t }: BlastMicroToastProps) {
  const def = id ? getMicroDef(id) : undefined;
  const tier = def?.tier ?? 'bronze';
  const style = TIER_STYLES[tier];
  const Icon = def ? (ICON_MAP[def.icon] ?? Sparkles) : Sparkles;
  const label = def ? (t(def.labelKey) ?? def.id) : '';

  return (
    <AdaptiveAnimatePresence>
      {def && (
        <AdaptiveMotion.div
          key={def.id}
          initial={{ opacity: 0, scale: 0.5, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.4, y: -20 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          role="status"
          aria-live="polite"
          data-testid="blast-micro-toast"
        >
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard',
              'font-neo-display font-black uppercase tracking-wider text-base',
              style.bg,
              style.text,
            )}
            style={{
              textShadow: tier === 'legendary' ? `0 0 12px ${style.glow}` : undefined,
              boxShadow: `0 0 24px ${style.glow}, 3px 3px 0 #000`,
            }}
          >
            <Icon className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span>{label}</span>
          </div>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
});

export default BlastMicroToast;
