'use client';

import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../utils/SocketContext';
import logger from '@/utils/logger';

type PresenceStatus = 'active' | 'idle' | 'afk';

interface PresenceOptions {
  enabled?: boolean;
}

interface UsePresenceReturn {
  isWindowFocused: boolean;
  isActive: boolean;
  presenceStatus: PresenceStatus;
  markActivity: () => void;
}

/**
 * Configuration for presence tracking
 * Tuned for better handling of poor network conditions
 */
const PRESENCE_CONFIG = {
  HEARTBEAT_INTERVAL: 8000,   // Send heartbeat every 8 seconds (more frequent for poor connections)
  ACTIVITY_DEBOUNCE: 1000,    // Debounce activity events by 1 second
  IDLE_CHECK_INTERVAL: 5000,  // Check idle status every 5 seconds
  IDLE_THRESHOLD: 30000,      // 30 seconds = idle
  RETRY_HEARTBEAT_INTERVAL: 3000, // Retry heartbeat faster when reconnecting
};

/**
 * Hook for tracking and reporting user presence/activity status
 * Detects when user:
 * - Switches away from the browser tab (visibility change)
 * - Leaves the browser window (blur/focus)
 * - Becomes idle (no mouse/keyboard activity)
 *
 * @param options - Configuration options
 * @returns { isWindowFocused, isActive, presenceStatus, markActivity }
 */
export function usePresence({ enabled = true }: PresenceOptions = {}): UsePresenceReturn {
  const { socket, isConnected } = useSocket();
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>('active');

  // Use refs to avoid stale closures and dependency issues
  const socketRef = useRef(socket);
  const isConnectedRef = useRef(isConnected);
  const enabledRef = useRef(enabled);
  // Initialize with 0, will be set to Date.now() in useEffect
  const lastActivityRef = useRef(0);
  const isActiveRef = useRef(true);
  const isWindowFocusedRef = useRef(true);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const idleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync with props/state
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    isWindowFocusedRef.current = isWindowFocused;
  }, [isWindowFocused]);

  // Calculate and update presence status
  useEffect(() => {
    if (!isWindowFocused) {
      setPresenceStatus(isActive ? 'idle' : 'afk');
    } else {
      setPresenceStatus(isActive ? 'active' : 'idle');
    }
  }, [isWindowFocused, isActive]);

  // Main effect for all presence tracking
  useEffect(() => {
    if (!enabled) return;

    // Initialize lastActivityRef on mount
    lastActivityRef.current = Date.now();

    // Helper to emit presence update using refs
    const emitPresenceUpdate = (focused: boolean, active: boolean, forceIdle = false) => {
      if (socketRef.current && isConnectedRef.current && enabledRef.current) {
        logger.debug('[PRESENCE] Sending update:', { isWindowFocused: focused, isActive: active, isIdle: forceIdle || !focused });
        socketRef.current.emit('presenceUpdate', {
          isWindowFocused: focused,
          isActive: active,
          isIdle: forceIdle || !focused,
        });
      }
    };

    // Helper to emit heartbeat
    const emitHeartbeat = () => {
      if (socketRef.current && isConnectedRef.current && enabledRef.current) {
        socketRef.current.emit('presenceHeartbeat');
      }
    };

    // Handle visibility change (tab switch)
    const handleVisibilityChange = () => {
      const focused = document.visibilityState === 'visible';
      setIsWindowFocused(focused);
      isWindowFocusedRef.current = focused;

      if (focused) {
        // User came back - mark as active
        lastActivityRef.current = Date.now();
        setIsActive(true);
        isActiveRef.current = true;
        emitPresenceUpdate(true, true, false);
      } else {
        // User left the tab - force idle
        emitPresenceUpdate(false, false, true);
      }
    };

    // Handle window focus/blur
    const handleFocus = () => {
      setIsWindowFocused(true);
      isWindowFocusedRef.current = true;
      lastActivityRef.current = Date.now();
      setIsActive(true);
      isActiveRef.current = true;
      emitPresenceUpdate(true, true, false);
    };

    const handleBlur = () => {
      setIsWindowFocused(false);
      isWindowFocusedRef.current = false;
      emitPresenceUpdate(false, false, true);
    };

    // Handle user activity
    const handleActivity = () => {
      lastActivityRef.current = Date.now();

      if (!isActiveRef.current) {
        setIsActive(true);
        isActiveRef.current = true;
        emitPresenceUpdate(isWindowFocusedRef.current, true, false);
      }

      // Debounce
      if (activityDebounceRef.current) {
        clearTimeout(activityDebounceRef.current);
      }
      activityDebounceRef.current = setTimeout(() => {
        activityDebounceRef.current = null;
      }, PRESENCE_CONFIG.ACTIVITY_DEBOUNCE);
    };

    // Check for idle status and send periodic updates when not active
    // This allows the server to transition from idle -> afk after 2 minutes
    const checkIdle = () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;

      if (timeSinceActivity >= PRESENCE_CONFIG.IDLE_THRESHOLD) {
        if (isActiveRef.current) {
          // First time becoming idle
          logger.debug('[PRESENCE] Idle timeout reached, marking as idle');
          setIsActive(false);
          isActiveRef.current = false;
        }
        // Always send update when idle/afk so server can track time and transition to afk
        emitPresenceUpdate(isWindowFocusedRef.current, false, true);
      }
    };

    // Register event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'click'] as const;
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start intervals
    heartbeatIntervalRef.current = setInterval(emitHeartbeat, PRESENCE_CONFIG.HEARTBEAT_INTERVAL);
    idleCheckIntervalRef.current = setInterval(checkIdle, PRESENCE_CONFIG.IDLE_CHECK_INTERVAL);

    // Send initial heartbeat
    emitHeartbeat();

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);

      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
        idleCheckIntervalRef.current = null;
      }
      if (activityDebounceRef.current) {
        clearTimeout(activityDebounceRef.current);
        activityDebounceRef.current = null;
      }
    };
  }, [enabled]); // Only depends on enabled - uses refs for everything else

  // Mark activity function for external use
  const markActivity = () => {
    lastActivityRef.current = Date.now();
    if (!isActiveRef.current) {
      setIsActive(true);
      isActiveRef.current = true;
      if (socketRef.current && isConnectedRef.current && enabledRef.current) {
        socketRef.current.emit('presenceUpdate', {
          isWindowFocused: isWindowFocusedRef.current,
          isActive: true,
          isIdle: false,
        });
      }
    }
  };

  return {
    isWindowFocused,
    isActive,
    presenceStatus,
    markActivity,
  };
}

export default usePresence;
