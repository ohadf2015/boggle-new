import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  createContext,
  useContext,
} from 'react';
import AchievementPopup from './AchievementPopup';

/**
 * Achievement Queue for React Native
 * Ported from fe-next/components/achievements/AchievementQueue.jsx
 * Manages sequential display of achievement popups
 */

export interface Achievement {
  name: string;
  description: string;
  icon: string;
}

interface AchievementQueueContextValue {
  queueAchievement: (achievement: Achievement) => void;
}

const AchievementQueueContext = createContext<AchievementQueueContextValue | null>(
  null
);

interface AchievementQueueProviderProps {
  children: React.ReactNode;
  playSound?: () => void; // Optional sound playback function
}

export const AchievementQueueProvider: React.FC<
  AchievementQueueProviderProps
> = ({ children, playSound }) => {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [currentAchievement, setCurrentAchievement] =
    useState<Achievement | null>(null);
  const isDisplayingRef = useRef(false);
  const queueRef = useRef<Achievement[]>([]);

  // Keep queueRef in sync with queue state
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
    setCurrentAchievement(next);
  }, []);

  // Handle popup complete
  const handlePopupComplete = useCallback(() => {
    // Small delay between achievements for better UX
    setTimeout(() => {
      processNext();
    }, 500);
  }, [processNext]);

  // Queue a new achievement
  const queueAchievement = useCallback(
    (achievement: Achievement) => {
      if (!achievement) return;

      // Add to queue (max 5 achievements)
      setQueue((prev) => [...prev, achievement].slice(-5));

      // If not currently displaying, start immediately
      if (!isDisplayingRef.current) {
        setTimeout(() => {
          if (!isDisplayingRef.current && queueRef.current.length > 0) {
            processNext();
          }
        }, 100);
      }
    },
    [processNext]
  );

  return (
    <AchievementQueueContext.Provider value={{ queueAchievement }}>
      {children}
      {currentAchievement && (
        <AchievementPopup
          achievement={currentAchievement}
          onComplete={handlePopupComplete}
          playSound={playSound}
        />
      )}
    </AchievementQueueContext.Provider>
  );
};

/**
 * Hook to access achievement queue functionality
 * Must be used within AchievementQueueProvider
 */
export const useAchievementQueue = (): AchievementQueueContextValue => {
  const context = useContext(AchievementQueueContext);
  if (!context) {
    throw new Error(
      'useAchievementQueue must be used within AchievementQueueProvider'
    );
  }
  return context;
};

// Legacy render prop version for compatibility
interface AchievementQueueProps {
  children:
    | React.ReactNode
    | ((props: { queueAchievement: (achievement: Achievement) => void }) => React.ReactNode);
  playSound?: () => void;
}

const AchievementQueue: React.FC<AchievementQueueProps> = ({
  children,
  playSound,
}) => {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [currentAchievement, setCurrentAchievement] =
    useState<Achievement | null>(null);
  const isDisplayingRef = useRef(false);
  const queueRef = useRef<Achievement[]>([]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const processNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      isDisplayingRef.current = false;
      setCurrentAchievement(null);
      return;
    }

    isDisplayingRef.current = true;
    const [next, ...rest] = queueRef.current;
    setQueue(rest);
    setCurrentAchievement(next);
  }, []);

  const handlePopupComplete = useCallback(() => {
    setTimeout(() => {
      processNext();
    }, 500);
  }, [processNext]);

  const queueAchievement = useCallback(
    (achievement: Achievement) => {
      if (!achievement) return;

      setQueue((prev) => [...prev, achievement].slice(-5));

      if (!isDisplayingRef.current) {
        setTimeout(() => {
          if (!isDisplayingRef.current && queueRef.current.length > 0) {
            processNext();
          }
        }, 100);
      }
    },
    [processNext]
  );

  return (
    <>
      {typeof children === 'function' ? children({ queueAchievement }) : children}
      {currentAchievement && (
        <AchievementPopup
          achievement={currentAchievement}
          onComplete={handlePopupComplete}
          playSound={playSound}
        />
      )}
    </>
  );
};

export default AchievementQueue;
