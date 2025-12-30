import { useState, useEffect, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import type { TvNotificationData, TvNotificationType, NotificationTier } from '../components/tv-broadcast/TvNotification';

interface PlayerFoundWordPayload {
  username: string;
  wordCount: number;
  score?: number;
  comboLevel?: number;
  word?: string;
}

interface LeaderboardEntry {
  username: string;
  score: number;
  wordCount?: number;
}

interface AchievementPayload {
  username: string;
  achievement: {
    id: string;
    name: string;
  };
}

interface LevelUpPayload {
  username: string;
  level: number;
}

interface UseTvNotificationsOptions {
  socket: Socket | null;
  enabled?: boolean;
  onNotification?: (notification: TvNotificationData) => void;
  t?: (path: string, params?: Record<string, string | number>) => string;
}

interface UseTvNotificationsResult {
  notifications: TvNotificationData[];
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

// Notification configurations
const NOTIFICATION_DURATION: Record<NotificationTier, number> = {
  subtle: 3000,
  medium: 4000,
  mega: 5000,
};

/**
 * useTvNotifications - Detects game events and creates TV broadcast notifications
 */
export function useTvNotifications({
  socket,
  enabled = true,
  onNotification,
  t = (path) => path, // Default fallback returns the path itself
}: UseTvNotificationsOptions): UseTvNotificationsResult {
  const [notifications, setNotifications] = useState<TvNotificationData[]>([]);
  const previousRankingsRef = useRef<Record<string, number>>({});
  const gameStartedRef = useRef(false);
  const firstWordFoundRef = useRef(false);
  const lastWordPerPlayerRef = useRef<Record<string, { word: string; time: number }>>({});
  const previousCombosRef = useRef<Record<string, number>>({});
  const notificationIdRef = useRef(0);

  // Generate unique notification ID
  const generateId = useCallback(() => {
    notificationIdRef.current += 1;
    return `tv-notif-${Date.now()}-${notificationIdRef.current}`;
  }, []);

  // Add a notification to the queue
  const addNotification = useCallback((
    type: TvNotificationType,
    tier: NotificationTier,
    headline: string,
    subtext?: string,
    player?: string,
  ) => {
    const notification: TvNotificationData = {
      id: generateId(),
      type,
      tier,
      headline,
      subtext,
      player,
      duration: NOTIFICATION_DURATION[tier],
      timestamp: Date.now(),
    };

    // Priority queue: mega notifications can bump lower priority
    setNotifications(prev => {
      if (tier === 'mega') {
        // Mega notifications go to the front
        return [notification, ...prev];
      }
      return [...prev, notification];
    });

    onNotification?.(notification);
  }, [generateId, onNotification]);

  // Dismiss a notification
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Reset state on game reset
  useEffect(() => {
    if (!socket || !enabled) return;

    const handleResetGame = () => {
      gameStartedRef.current = false;
      firstWordFoundRef.current = false;
      previousRankingsRef.current = {};
      lastWordPerPlayerRef.current = {};
      previousCombosRef.current = {};
      setNotifications([]);
    };

    const handleStartGame = () => {
      gameStartedRef.current = true;
      firstWordFoundRef.current = false;
      previousRankingsRef.current = {};
      lastWordPerPlayerRef.current = {};
      previousCombosRef.current = {};
    };

    socket.on('resetGame', handleResetGame);
    socket.on('startGame', handleStartGame);

    return () => {
      socket.off('resetGame', handleResetGame);
      socket.off('startGame', handleStartGame);
    };
  }, [socket, enabled]);

  // Listen for player word events
  useEffect(() => {
    if (!socket || !enabled) return;

    const handlePlayerFoundWord = (data: PlayerFoundWordPayload) => {
      const { username, word, comboLevel } = data;

      // First blood detection
      if (!firstWordFoundRef.current && gameStartedRef.current) {
        firstWordFoundRef.current = true;
        addNotification('first_blood', 'medium', t('tvBroadcast.notifications.firstBlood'), `${username} ${t('tvBroadcast.notifications.drawsFirst')}`, username);
      }

      // Long word detection
      if (word) {
        const wordLength = word.length;
        if (wordLength >= 8) {
          addNotification('rare_word', 'mega', t('tvBroadcast.notifications.rareWord'), `"${word.toUpperCase()}"`, username);
        } else if (wordLength >= 7) {
          addNotification('epic_word', 'medium', t('tvBroadcast.notifications.epicWord'), `"${word.toUpperCase()}"`, username);
        } else if (wordLength >= 5) {
          addNotification('long_word', 'subtle', t('tvBroadcast.notifications.longWord'), `"${word.toUpperCase()}"`, username);
        }

        // Word snipe detection (same word within 2 seconds)
        const now = Date.now();
        for (const [player, wordData] of Object.entries(lastWordPerPlayerRef.current)) {
          if (player !== username && wordData.word.toLowerCase() === word.toLowerCase() && now - wordData.time < 2000) {
            addNotification('word_snipe', 'medium', t('tvBroadcast.notifications.wordSnipe'), `${t('tvBroadcast.notifications.bothFound')} "${word.toUpperCase()}"`, `${username} & ${player}`);
          }
        }
        lastWordPerPlayerRef.current[username] = { word, time: now };
      }

      // Combo milestone detection
      if (comboLevel !== undefined) {
        const previousCombo = previousCombosRef.current[username] || 0;

        // Detect combo milestones (only announce once per milestone)
        if (comboLevel >= 20 && previousCombo < 20) {
          addNotification('combo_20x', 'mega', t('tvBroadcast.notifications.combo20x'), `${comboLevel}x ${t('tvBroadcast.notifications.streak')}`, username);
        } else if (comboLevel >= 15 && previousCombo < 15) {
          addNotification('combo_15x', 'mega', t('tvBroadcast.notifications.combo15x'), `${comboLevel}x ${t('tvBroadcast.notifications.combo')}`, username);
        } else if (comboLevel >= 10 && previousCombo < 10) {
          addNotification('combo_10x', 'medium', t('tvBroadcast.notifications.combo10x'), `${comboLevel}x ${t('tvBroadcast.notifications.combo')}`, username);
        } else if (comboLevel >= 5 && previousCombo < 5) {
          addNotification('combo_5x', 'subtle', t('tvBroadcast.notifications.combo5x'), `${comboLevel}x ${t('tvBroadcast.notifications.combo')}`, username);
        }

        // Combo broken detection (high combo lost)
        if (comboLevel === 0 && previousCombo >= 5) {
          addNotification('combo_broken', 'medium', t('tvBroadcast.notifications.comboBroken'), `${previousCombo}x ${t('tvBroadcast.notifications.comboDown')}`, username);
        }

        previousCombosRef.current[username] = comboLevel;
      }
    };

    socket.on('playerFoundWord', handlePlayerFoundWord);

    return () => {
      socket.off('playerFoundWord', handlePlayerFoundWord);
    };
  }, [socket, enabled, addNotification, t]);

  // Listen for leaderboard updates (overtakes, comebacks, photo finish)
  useEffect(() => {
    if (!socket || !enabled) return;

    const handleLeaderboardUpdate = (data: { leaderboard: LeaderboardEntry[] }) => {
      const { leaderboard } = data;
      if (!leaderboard || leaderboard.length === 0) return;

      const previousRankings = previousRankingsRef.current;
      const totalPlayers = leaderboard.length;
      const halfwayPoint = Math.floor(totalPlayers / 2);

      leaderboard.forEach((entry, newRank) => {
        const oldRank = previousRankings[entry.username];

        if (oldRank !== undefined) {
          // Overtake detection
          if (newRank < oldRank && oldRank <= 5) {
            // Only announce overtakes in top 5
            addNotification('overtake', 'subtle', t('tvBroadcast.notifications.overtake'), `${t('tvBroadcast.notifications.nowRank')}${newRank + 1}`, entry.username);
          }

          // Comeback detection (bottom half to top 3)
          if (oldRank >= halfwayPoint && newRank < 3 && totalPlayers >= 4) {
            addNotification('comeback', 'mega', t('tvBroadcast.notifications.comeback'), `#${oldRank + 1} ${t('tvBroadcast.notifications.toRank')}${newRank + 1}`, entry.username);
          }
        }
      });

      // Photo finish detection (top 2 within 5 points)
      if (leaderboard.length >= 2) {
        const [first, second] = leaderboard;
        if (first && second && Math.abs(first.score - second.score) <= 5 && first.score > 0) {
          // Only show if we haven't shown recently (throttle)
          addNotification('photo_finish', 'mega', t('tvBroadcast.notifications.photoFinish'), `${Math.abs(first.score - second.score)} ${t('tvBroadcast.notifications.ptsApart')}`, `${first.username} vs ${second.username}`);
        }
      }

      // Update previous rankings
      previousRankingsRef.current = Object.fromEntries(
        leaderboard.map((entry, index) => [entry.username, index])
      );
    };

    socket.on('updateLeaderboard', handleLeaderboardUpdate);

    return () => {
      socket.off('updateLeaderboard', handleLeaderboardUpdate);
    };
  }, [socket, enabled, addNotification, t]);

  // Listen for achievements
  useEffect(() => {
    if (!socket || !enabled) return;

    const handleAchievement = (data: { achievements: AchievementPayload[] }) => {
      data.achievements?.forEach(({ username, achievement }) => {
        addNotification('achievement', 'medium', t('tvBroadcast.notifications.achievement'), achievement.name, username);
      });
    };

    socket.on('liveAchievementUnlocked', handleAchievement);

    return () => {
      socket.off('liveAchievementUnlocked', handleAchievement);
    };
  }, [socket, enabled, addNotification, t]);

  // Listen for level ups
  useEffect(() => {
    if (!socket || !enabled) return;

    const handleLevelUp = (data: LevelUpPayload) => {
      addNotification('level_up', 'subtle', t('tvBroadcast.notifications.levelUp'), `Level ${data.level}`, data.username);
    };

    socket.on('levelUp', handleLevelUp);

    return () => {
      socket.off('levelUp', handleLevelUp);
    };
  }, [socket, enabled, addNotification, t]);

  // Listen for fire round events
  useEffect(() => {
    if (!socket || !enabled) return;

    const handleFireRoundStart = () => {
      addNotification('fire_round_start', 'mega', t('tvBroadcast.notifications.fireRoundStart'), t('tvBroadcast.notifications.everythingDouble'));
    };

    const handleFireRoundEnd = () => {
      addNotification('fire_round_end', 'subtle', t('tvBroadcast.notifications.fireRoundEnd'), t('tvBroadcast.notifications.backToNormal'));
    };

    socket.on('fireRoundStart', handleFireRoundStart);
    socket.on('fireRoundEnd', handleFireRoundEnd);

    return () => {
      socket.off('fireRoundStart', handleFireRoundStart);
      socket.off('fireRoundEnd', handleFireRoundEnd);
    };
  }, [socket, enabled, addNotification, t]);

  // Listen for earthquake events
  useEffect(() => {
    if (!socket || !enabled) return;

    const handleEarthquake = () => {
      addNotification('earthquake', 'mega', t('tvBroadcast.notifications.earthquake'), t('tvBroadcast.notifications.gridShuffle'));
    };

    socket.on('earthquakeWarning', handleEarthquake);

    return () => {
      socket.off('earthquakeWarning', handleEarthquake);
    };
  }, [socket, enabled, addNotification, t]);

  // Listen for time warnings
  useEffect(() => {
    if (!socket || !enabled) return;

    const handleTimeUpdate = (data: { remainingTime: number }) => {
      if (data.remainingTime === 30) {
        addNotification('final_warning', 'mega', t('tvBroadcast.notifications.finalWarning'), `30 ${t('tvBroadcast.notifications.secondsLeft')}`);
      }
    };

    socket.on('timeUpdate', handleTimeUpdate);

    return () => {
      socket.off('timeUpdate', handleTimeUpdate);
    };
  }, [socket, enabled, addNotification, t]);

  return {
    notifications,
    dismissNotification,
    clearAll,
  };
}

export default useTvNotifications;
