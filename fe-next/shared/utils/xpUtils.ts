/**
 * XP and Level Up Utilities
 * Shared logic for XP gained and level up event handling
 */
import { fireConfetti } from '../../utils/confettiUtils';
import { neoSuccessToast } from '../../components/NeoToast';
import logger from '@/utils/logger';
import type { XpGainedPayload, LevelUpPayload } from '@/shared/types/socket';

// ==================== Constants ====================

/**
 * Confetti configuration for level up celebrations
 */
export const LEVEL_UP_CONFETTI_CONFIG = {
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 },
  colors: ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1'],
};

// ==================== Handlers ====================

/**
 * Create a handler for XP gained events
 */
export function createXpGainedHandler(
  t: (key: string) => string,
  setXpGainedData: React.Dispatch<React.SetStateAction<XpGainedPayload | null>>,
  context: 'HOST' | 'PLAYER'
): (data: XpGainedPayload) => void {
  return (data: XpGainedPayload) => {
    logger.log(`[${context}] XP gained:`, data);
    setXpGainedData(data);
    neoSuccessToast(`+${data.xpEarned} ${t('common.xpGained')}`, {
      icon: '⭐',
      duration: 3000,
    });
  };
}

/**
 * Create a handler for level up events
 */
export function createLevelUpHandler(
  t: (key: string) => string,
  setLevelUpData: React.Dispatch<React.SetStateAction<LevelUpPayload | null>>,
  context: 'HOST' | 'PLAYER'
): (data: LevelUpPayload) => void {
  return (data: LevelUpPayload) => {
    logger.log(`[${context}] Level up!`, data);
    setLevelUpData(data);

    // Celebratory confetti
    fireConfetti(LEVEL_UP_CONFETTI_CONFIG);

    neoSuccessToast(
      `${t('results.levelUp') || 'Level Up!'} ${data.oldLevel} → ${data.newLevel}`,
      {
        icon: '🎉',
        duration: 5000,
      }
    );
  };
}

/**
 * Trigger level up celebration with confetti
 */
export function triggerLevelUpCelebration(): void {
  fireConfetti(LEVEL_UP_CONFETTI_CONFIG);
}
