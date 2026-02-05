'use client';

import React, { useState, useCallback, useRef, useEffect, createContext, useContext, ReactNode } from 'react';
import { UnifiedAchievementModal } from './UnifiedAchievementModal';
import { toast } from '@/components/ui/EnhancedToast';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AchievementPayload } from '@/shared/types/socket';

interface AchievementQueueProps {
  children: ReactNode | ((props: { queueAchievement: (achievement: AchievementPayload) => void }) => ReactNode);
}

interface AchievementQueueContextValue {
  queueAchievement: (achievement: AchievementPayload) => void;
}

const AchievementQueue = ({ children }: AchievementQueueProps): React.ReactElement => {
  const [queue, setQueue] = useState<AchievementPayload[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<AchievementPayload | null>(null);
  const isDisplayingRef = useRef<boolean>(false);
  const queueRef = useRef<AchievementPayload[]>([]);

  // Keep queueRef in sync
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Process next achievement from queue
  const processNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      isDisplayingRef.current = false;
      setCurrentAchievement(null);
      return;
    }

    isDisplayingRef.current = true;
    const [next, ...rest] = queueRef.current;
    setQueue(rest);
    setCurrentAchievement(next ?? null);
  }, []);

  // Handle popup complete
  const handlePopupComplete = useCallback(() => {
    // Small delay between achievements
    setTimeout(() => {
      processNext();
    }, 500);
  }, [processNext]);

  // Queue a new achievement
  const queueAchievement = useCallback((achievement: AchievementPayload) => {
    if (!achievement) return;

    // Add to queue (max 5)
    setQueue(prev => {
      const newQueue = [...prev, achievement].slice(-5);
      return newQueue;
    });

    // If not currently displaying, start immediately
    if (!isDisplayingRef.current) {
      setTimeout(() => {
        if (!isDisplayingRef.current && queueRef.current.length > 0) {
          processNext();
        }
      }, 100);
    }
  }, [processNext]);

  // Expose queueAchievement through children render prop or context
  return (
    <>
      {typeof children === 'function' ? children({ queueAchievement }) : children}
      {currentAchievement && (
        <UnifiedAchievementModal
          type="socket"
          achievement={currentAchievement}
          onClose={handlePopupComplete}
        />
      )}
    </>
  );
};

export default AchievementQueue;

// Also export a hook-friendly context version
const AchievementQueueContext = createContext<AchievementQueueContextValue | null>(null);

interface AchievementQueueProviderProps {
  children: ReactNode;
}

/**
 * AchievementQueueProvider - Global provider for socket-based achievements
 *
 * Used for multiplayer achievements where showing a full-screen modal
 * would disrupt gameplay. Only shows toast notifications.
 *
 * For contexts where modals ARE appropriate (education mode, adventure mode,
 * single-player results), use UnifiedAchievementModal directly.
 */
export const AchievementQueueProvider = ({ children }: AchievementQueueProviderProps): React.ReactElement => {
  const { t } = useLanguage();

  // Queue achievement with toast notification only (no modal)
  // Modals disrupt multiplayer gameplay - use toast for non-intrusive notifications
  const queueAchievement = useCallback((achievement: AchievementPayload) => {
    if (!achievement) return;

    // Show toast notification for achievement (non-intrusive)
    const achievementName = t(`achievements.${achievement.key}.name`) || achievement.key;
    toast.success(
      t('achievements.unlocked') || '🏆 Achievement Unlocked!',
      achievementName,
      {
        label: t('common.share') || 'Share',
        onClick: () => {
          // Share functionality - toast has built-in share action
        },
      }
    );
  }, [t]);

  return (
    <AchievementQueueContext.Provider value={{ queueAchievement }}>
      {children}
    </AchievementQueueContext.Provider>
  );
};

export const useAchievementQueue = (): AchievementQueueContextValue => {
  const context = useContext(AchievementQueueContext);
  if (!context) {
    throw new Error('useAchievementQueue must be used within AchievementQueueProvider');
  }
  return context;
};
