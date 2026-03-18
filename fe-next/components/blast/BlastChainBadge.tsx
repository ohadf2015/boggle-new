'use client';

import { useReducedMotion } from 'framer-motion';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';

interface BlastChainBadgeProps {
  chainLevel: number; // 0 = hidden
}

const TIER_CONFIG = {
  cyan:    { bg: 'bg-neo-cyan', text: 'text-neo-black' },
  yellow:  { bg: 'bg-neo-yellow', text: 'text-neo-black' },
  orange:  { bg: 'bg-neo-orange', text: 'text-white' },
  rainbow: { bg: '', text: 'text-white' },
} as const;

function getTier(level: number): keyof typeof TIER_CONFIG {
  if (level >= 4) return 'rainbow';
  if (level === 3) return 'orange';
  if (level === 2) return 'yellow';
  return 'cyan';
}

/**
 * BlastChainBadge — Floating badge showing current cascade chain level.
 * Positioned top-right of the blast grid. Escalates visually per tier.
 */
export function BlastChainBadge({ chainLevel }: BlastChainBadgeProps) {
  const shouldReduceMotion = useReducedMotion();
  const { t } = useLanguage();

  if (chainLevel < 1) return null;

  const tier = getTier(chainLevel);
  const config = TIER_CONFIG[tier];

  const rainbowStyle = tier === 'rainbow'
    ? { background: 'linear-gradient(135deg, #FF1493, #FF6B35, #FFE135, #00FFFF, #A855F7)' }
    : undefined;

  return (
    <AdaptiveAnimatePresence mode="wait">
      <AdaptiveMotion.div
        key={chainLevel}
        data-testid="blast-chain-badge"
        data-tier={tier}
        className={`absolute top-2 right-2 z-30 px-3 py-1.5 border-neo rounded-neo font-neo-display font-black text-sm ${config.bg} ${config.text} border-neo-black`}
        style={rainbowStyle}
        initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
        animate={shouldReduceMotion
          ? { opacity: 1 }
          : { scale: [0, 1.4, 1.0], opacity: 1 }
        }
        exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <span>{t('blast.chain.badge', { level: chainLevel })}</span>
      </AdaptiveMotion.div>
    </AdaptiveAnimatePresence>
  );
}
