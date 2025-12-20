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
 * Process achievements from a socket event
 * Validates, queues, and returns valid achievements
 */
export function processAchievements(
  data: any,
  queueAchievement: (achievement: AchievementPayload) => void,
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

  // Queue valid achievements
  data.achievements.forEach((achievement: any) => {
    if (isValidAchievement(achievement)) {
      queueAchievement(achievement as AchievementPayload);
    } else {
      logger.warn(`${logPrefix} Skipping invalid achievement:`, achievement);
    }
  });

  // Filter and return valid achievements
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
