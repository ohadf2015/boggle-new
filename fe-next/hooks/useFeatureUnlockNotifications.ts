/**
 * useFeatureUnlockNotifications Hook
 *
 * Detects when users unlock new features and shows congratulatory notifications
 * Uses localStorage to track which notifications have been shown
 */

import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserStats } from './useUserStats';
import { getFeatureGates, getUnlockThreshold, type FeatureKey } from '@/utils/featureGates';

const STORAGE_PREFIX = 'feature_unlock_';

/**
 * Hook to show notifications when users unlock new features
 * Tracks shown notifications in localStorage to prevent duplicates
 */
export function useFeatureUnlockNotifications() {
  const { t } = useLanguage();
  const { userStats, isLoading } = useUserStats();
  const hasChecked = useRef(false);

  useEffect(() => {
    // Don't check if already checked, loading, or no user stats
    if (hasChecked.current || isLoading || !userStats) {
      return;
    }

    hasChecked.current = true;

    const gates = getFeatureGates(userStats);
    const gamesPlayed = userStats.totalGamesPlayed;

    // Check each feature to see if it's newly unlocked
    const features: FeatureKey[] = [
      'modeRoster',
      'advancedSettings',
      'customBotCount',
      'challengeMode',
      'practiceMode',
    ];

    // Find all newly unlocked features, but only show the most recent one
    // (prevents toast spam when a returning user crosses multiple thresholds at once)
    let latestUnlock: { feature: FeatureKey; threshold: number } | null = null;

    features.forEach(feature => {
      const isUnlocked = gates[feature];
      const threshold = getUnlockThreshold(feature);
      const storageKey = `${STORAGE_PREFIX}${feature}`;
      const hasSeenNotification = localStorage.getItem(storageKey) === 'true';

      if (isUnlocked && threshold !== null && gamesPlayed >= threshold && !hasSeenNotification) {
        // Mark all as shown to prevent future spam
        localStorage.setItem(storageKey, 'true');

        // Track the highest-threshold unlock to show
        if (!latestUnlock || threshold > latestUnlock.threshold) {
          latestUnlock = { feature, threshold };
        }
      }
    });

    if (latestUnlock) {
      const { feature } = latestUnlock;
      toast.success(
        `${t(`singlePlayer.features.unlocked.${feature}`)} ${t(`singlePlayer.features.unlocked.${feature}Desc`)}`,
        {
          duration: 5000,
          icon: '🎉',
          className: 'bg-neo-yellow text-neo-navy border-3 border-black shadow-hard font-bold',
        }
      );
    }
  }, [userStats, isLoading, t]);
}
