/**
 * BossActiveBattleUI Component (Simplified)
 *
 * Renders the active battle UI during boss fights:
 * - Boss avatar with phase-based reactions
 * - Simple colored HP bar (green→yellow→red by phase)
 * - Taunt bubble below avatar
 */

'use client';

import { memo, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Swords } from 'lucide-react';
import BossDialogue from '../BossDialogue';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BossConfig, BossVisualState } from '@/types/boss';
import type { BossPhaseNew } from '@/hooks/useAdventureBossNew';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

// ==============================================
// TYPES
// ==============================================

export interface BossActiveBattleUIProps {
  /** Boss configuration */
  boss: BossConfig;
  /** Current HP */
  currentHP: number;
  /** Maximum HP */
  maxHP: number;
  /** Current phase */
  phase: BossPhaseNew;
  /** Current taunt translation key */
  currentTaunt: string | null;
  /** Current visual state for image switching */
  visualState?: BossVisualState;
}

// ==============================================
// CONSTANTS
// ==============================================

/** HP bar colors per phase */
const PHASE_COLORS: Record<BossPhaseNew, string> = {
  normal: 'bg-neo-green',
  angry: 'bg-neo-yellow',
  desperate: 'bg-neo-red',
};

const PHASE_GLOW: Record<BossPhaseNew, string> = {
  normal: '',
  angry: 'shadow-hard-sm',
  desperate: 'shadow-hard-sm',
};

// ==============================================
// COMPONENT
// ==============================================

const BossActiveBattleUI = memo<BossActiveBattleUIProps>(({
  boss,
  currentHP,
  maxHP,
  phase,
  currentTaunt,
  visualState,
}) => {
  const { t } = useLanguage();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Boss avatar reaction: detect HP drops
  const [bossReaction, setBossReaction] = useState<'idle' | 'hit'>('idle');
  const prevHPRef = useRef(currentHP);
  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentHP < prevHPRef.current) {
      setBossReaction('hit');
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
      reactionTimeoutRef.current = setTimeout(() => setBossReaction('idle'), 400);
    }
    prevHPRef.current = currentHP;
  }, [currentHP]);

  useEffect(() => {
    return () => {
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    };
  }, []);

  const hpPct = maxHP > 0 ? Math.max(0, Math.min(100, (currentHP / maxHP) * 100)) : 0;

  // Derive the correct image for the current visual state
  const bossImageSrc = (() => {
    if (!boss.images) return boss.imagePath;
    if (visualState) return boss.images[visualState];
    if (bossReaction === 'hit') return boss.images.hurt;
    if (phase === 'desperate') return boss.images.enraged;
    return boss.images.idle;
  })();

  return (
    <>
      {/* Boss HP Bar + Avatar Row */}
      <div className="fixed top-12 sm:top-14 left-0 right-0 z-30 pointer-events-none">
        <div className="w-full max-w-2xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-3 mb-2">
            {/* Boss Avatar */}
            <AdaptiveMotion.div
              className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-neo border-3 border-neo-black shadow-hard-sm overflow-hidden bg-neo-navy-light shrink-0"
              animate={
                bossReaction === 'hit'
                  ? { x: [0, -3, 3, -2, 2, 0], scale: [1, 0.95, 1] }
                  : { scale: 1, x: 0 }
              }
              transition={{ duration: 0.3 }}
              data-testid="boss-avatar"
            >
              {bossImageSrc ? (
                <Image
                  src={bossImageSrc}
                  alt={t(boss.displayName)}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  <Swords className="w-6 h-6 text-neo-yellow" />
                </div>
              )}

              {/* Desperate glow — static border when reduced motion preferred */}
              {phase === 'desperate' && (
                <AdaptiveMotion.div
                  className="absolute inset-0 border-2 border-neo-red rounded-neo"
                  animate={prefersReducedMotion ? { opacity: 0.7 } : { opacity: [0.4, 0.8, 0.4] }}
                  transition={prefersReducedMotion ? { duration: 0 } : { repeat: Infinity, duration: 0.6 }}
                  data-testid="boss-avatar-desperate-glow"
                />
              )}
            </AdaptiveMotion.div>

            {/* Simple HP Bar */}
            <div className="flex-1 min-w-0" data-testid="boss-hp-bar-container">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-neo-body font-bold text-neo-white truncate">
                  {t(boss.displayName)}
                </span>
                <span className="text-sm font-neo-body text-neo-white ms-2 tabular-nums">
                  {currentHP}/{maxHP}
                </span>
              </div>
              <div className="h-5 sm:h-6 bg-neo-navy-dark rounded-neo border-2 border-neo-black overflow-hidden">
                <AdaptiveMotion.div
                  className={`h-full rounded-sm ${PHASE_COLORS[phase]} ${PHASE_GLOW[phase]}`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${hpPct}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  data-testid="boss-hp-bar-fill"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Boss Dialogue/Taunts */}
      <AdaptiveAnimatePresence>
        {currentTaunt && (
          <BossDialogue
            boss={boss}
            currentTaunt={currentTaunt}
            isVisible={true}
            position="top"
          />
        )}
      </AdaptiveAnimatePresence>
    </>
  );
});

BossActiveBattleUI.displayName = 'BossActiveBattleUI';

export default BossActiveBattleUI;
