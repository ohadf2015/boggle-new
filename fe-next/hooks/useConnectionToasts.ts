'use client';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useSocketOptional } from '@/utils/SocketContext';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Hook that shows toast notifications for connection status changes
 * Shows toasts for disconnect, reconnecting, and reconnected events
 * Safely handles cases where SocketContext is not available
 */
export function useConnectionToasts() {
  const socketContext = useSocketOptional();
  const { t } = useLanguage();

  // Default to not connected if no context available
  const isConnected = socketContext?.isConnected ?? false;
  const isReconnecting = socketContext?.isReconnecting ?? false;
  const connectionError = socketContext?.connectionError ?? null;
  const previousConnectedRef = useRef<boolean | null>(null);
  const disconnectToastIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip initial mount
    if (previousConnectedRef.current === null) {
      previousConnectedRef.current = isConnected;
      return;
    }

    const wasConnected = previousConnectedRef.current;
    previousConnectedRef.current = isConnected;

    // Connection lost
    if (wasConnected && !isConnected && !isReconnecting) {
      // Dismiss any existing disconnect toast
      if (disconnectToastIdRef.current) {
        toast.dismiss(disconnectToastIdRef.current);
      }

      disconnectToastIdRef.current = toast.error(
        t('common.connectionLost') || 'Connection lost',
        {
          id: 'connection-lost',
          duration: 10000,
          icon: '📡',
        }
      );
    }

    // Reconnecting
    if (!isConnected && isReconnecting) {
      // Dismiss previous toast
      if (disconnectToastIdRef.current) {
        toast.dismiss(disconnectToastIdRef.current);
      }

      disconnectToastIdRef.current = toast.loading(
        t('common.reconnecting') || 'Reconnecting...',
        {
          id: 'connection-reconnecting',
          duration: Infinity,
        }
      );
    }

    // Reconnect failed / gave up — the "Reconnecting..." toast above has
    // duration: Infinity and is otherwise dismissed ONLY on a successful
    // reconnect. When reconnection stops while still disconnected (isReconnecting
    // flips false, isConnected still false) that toast would stick on screen
    // forever and block the UI. Dismiss it and surface a terminal error instead.
    // wasConnected is false here (we were already disconnected/reconnecting), so
    // this never collides with the "Connection lost" branch above.
    if (!wasConnected && !isConnected && !isReconnecting && disconnectToastIdRef.current) {
      toast.dismiss(disconnectToastIdRef.current);
      disconnectToastIdRef.current = null;

      toast.error(
        t('common.reconnectFailed') || 'Connection lost. Please refresh.',
        {
          id: 'connection-failed',
          duration: 6000,
          icon: '⚠️',
        }
      );
    }

    // Reconnected
    if (!wasConnected && isConnected) {
      // Dismiss any existing toast
      if (disconnectToastIdRef.current) {
        toast.dismiss(disconnectToastIdRef.current);
        disconnectToastIdRef.current = null;
      }

      toast.success(
        t('common.reconnected') || 'Connected!',
        {
          id: 'connection-reconnected',
          duration: 3000,
          icon: '✅',
        }
      );
    }
  }, [isConnected, isReconnecting, connectionError, t]);

  // Dismiss any lingering connection toast when the hook unmounts. These toasts
  // live on the global <Toaster>, which outlives this hook, and the
  // "Reconnecting..." toast has duration: Infinity. If the user navigates away
  // mid-reconnect (e.g. multiplayer → single-player), the dismiss branches above
  // never run again, so the spinner would be stranded forever over an unrelated
  // screen. Empty deps → this runs only on unmount, never on dep changes (which
  // would otherwise dismiss-and-recreate the toast on every t/connectionError tick).
  useEffect(() => {
    return () => {
      if (disconnectToastIdRef.current) {
        toast.dismiss(disconnectToastIdRef.current);
        disconnectToastIdRef.current = null;
      }
    };
  }, []);
}

export default useConnectionToasts;
