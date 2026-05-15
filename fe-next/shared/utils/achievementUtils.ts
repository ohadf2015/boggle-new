/**
 * Achievement Utilities
 * Shared logic for achievement validation and processing
 */
import logger from '@/utils/logger';
import type { AchievementPayload } from '@/shared/types/socket';

// ==================== Types ====================

export interface Achievement {
  key?: string;
  name?: string;
  icon?: string;
}

// ==================== Validation ====================

/**
 * Check if an achievement object is valid
 */
export function isValidAchievement(achievement: any): achievement is Achievement {
  return achievement && (achievement.key || achievement.name);
}

/**
 * Validate achievement data from socket event
 */
export function validateAchievementData(data: any): data is { achievements: any[] } {
  return data && Array.isArray(data.achievements);
}

// ==================== Processing ====================

/**
 * Process achievements from a socket event.
 * Validates and returns valid achievements for local-state storage only.
 *
 * Toast queuing is owned by `useAchievementSocketBridge` (single global
 * listener). The `queueAchievement` param is kept for API compatibility
 * but is intentionally not called — duplicate enqueues from host/player
 * session events caused stuck toasts via AnimatePresence same-key reuse.
 */
export function processAchievements(
  data: any,
  _queueAchievement: (achievement: AchievementPayload) => void,
  context: 'HOST' | 'PLAYER'
): AchievementPayload[] {
  if (!validateAchievementData(data)) {
    logger.warn(`[${context}] Received invalid achievement data:`, data);
    return [];
  }

  const logPrefix = `[${context}]`;

  logger.log(
    `${logPrefix} Received ${data.achievements.length} live achievements:`,
    data.achievements.map((a: any) => a?.key || a?.name || 'unknown').join(', ')
  );

  data.achievements.forEach((achievement: any) => {
    if (!isValidAchievement(achievement)) {
      logger.warn(`${logPrefix} Skipping invalid achievement:`, achievement);
    }
  });

  const validAchievements = data.achievements.filter(isValidAchievement) as AchievementPayload[];

  if (validAchievements.length > 0) {
    logger.log(`${logPrefix} Processed ${validAchievements.length} valid achievements`);
  }

  return validAchievements;
}

/**
 * Create a handler for live achievement unlocked events
 */
export function createLiveAchievementHandler(
  queueAchievement: (achievement: AchievementPayload) => void,
  setAchievements: React.Dispatch<React.SetStateAction<any[]>>,
  context: 'HOST' | 'PLAYER',
  shouldAddToState: boolean = true
): (data: any) => void {
  return (data: any) => {
    const validAchievements = processAchievements(data, queueAchievement, context);

    if (shouldAddToState && validAchievements.length > 0) {
      setAchievements(prev => [...prev, ...validAchievements]);
    }
  };
}
