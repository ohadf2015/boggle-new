/**
 * Attack Telegraph Component
 *
 * Simplified edge-glow warning for incoming boss attacks.
 * The countdown ring is now integrated directly into the BossOverlay HUD strip.
 *
 * Features:
 * - Intensifying red edge glow as attack approaches
 * - Pulse frequency increases with progress
 * - Respects prefers-reduced-motion
 */

'use client';

import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '../../../contexts/LanguageContext';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';

export interface AttackTelegraphProps {
  /** Whether telegraph is active */
  isActive: boolean;
  /** Progress (0-1) */
  progress: number;
  /** Target tile indices */
  targetTiles: number[];
  /** Ability ID for theming */
  abilityId: string | null;
  /** Time remaining in ms */
  timeRemaining: number;
  /** Ability display name (translation key) */
  abilityName?: string;
}

export function AttackTelegraph({
  isActive,
  progress,
  targetTiles: _targetTiles,
  abilityId: _abilityId,
  timeRemaining: _timeRemaining,
  abilityName: _abilityName,
}: AttackTelegraphProps) {
  const { t } = useLanguage();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Intensifying edge flash — spread and opacity grow with progress
  const edgeSpread = 50 + progress * 80;
  const edgeOpacity = (0.1 + progress * 0.35).toFixed(2);
  const edgeBoxShadow = `inset 0 0 ${edgeSpread}px rgba(239, 68, 68, ${edgeOpacity})`;
  // Pulse frequency speeds up as progress -> 1
  const pulseDuration = Math.max(0.22, 0.5 - progress * 0.3);

  return (
    <AdaptiveAnimatePresence>
      {isActive && (
        <AdaptiveMotion.div
          className="fixed inset-0 pointer-events-none z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          data-testid="attack-telegraph"
          role="alert"
          aria-live="assertive"
          aria-label={t('adventure.bosses.telegraph.incoming')}
        >
          {/* Screen Edge Glow — countdown is inline in BossOverlay HUD */}
          {!prefersReducedMotion && (
            <AdaptiveMotion.div
              className="absolute inset-0 pointer-events-none"
              style={{ boxShadow: edgeBoxShadow }}
              animate={{ opacity: [0.5, 0.85, 0.5] }}
              transition={{ repeat: Infinity, duration: pulseDuration }}
              aria-hidden="true"
            />
          )}

          {/* Reduced motion fallback — subtle static border */}
          {prefersReducedMotion && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ boxShadow: 'inset 0 0 60px rgba(239, 68, 68, 0.25)' }}
              aria-hidden="true"
            />
          )}
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}
