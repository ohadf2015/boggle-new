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
      'advancedSettings',
      'customBotCount',
      'challengeMode',
      'practiceMode',
    ];

    features.forEach(feature => {
      const isUnlocked = gates[feature];
      const threshold = getUnlockThreshold(feature);
      const storageKey = `${STORAGE_PREFIX}${feature}`;
      const hasSeenNotification = localStorage.getItem(storageKey) === 'true';

      // Show notification if:
      // 1. Feature is now unlocked
      // 2. User has enough games to unlock it
      // 3. Notification hasn't been shown before
      if (isUnlocked && gamesPlayed >= threshold && !hasSeenNotification) {
        // Mark as shown immediately to prevent duplicates
        localStorage.setItem(storageKey, 'true');

        // Show success toast with feature info
        toast.success(
          `${t(`features.unlocked.${feature}`)} ${t(`features.unlocked.${feature}Desc`)}`,
          {
            duration: 5000,
            icon: '🎉',
            style: {
              background: '#FFE135', // neo-yellow
              color: '#1a1a2e', // neo-navy
              border: '3px solid #000',
              fontWeight: 'bold',
              boxShadow: '4px 4px 0px #000',
            },
          }
        );
      }
    });
  }, [userStats, isLoading, t]);
}
