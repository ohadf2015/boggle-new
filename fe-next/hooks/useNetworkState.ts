'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export type NetworkType = 'wifi' | 'cellular' | 'none' | 'unknown';

export interface NetworkState {
  online: boolean;
  slow: boolean;
  type: NetworkType;
  rttMs: number | null;
}

interface NavigatorConnection {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  rtt?: number;
  type?: string;
}

function getNavigatorConnection(): NavigatorConnection | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const n = navigator as Navigator & { connection?: NavigatorConnection };
  return n.connection;
}

function isSlowEffectiveType(effectiveType: string | undefined): boolean {
  return effectiveType === '2g' || effectiveType === 'slow-2g';
}

function snapshotWeb(): NetworkState {
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;
  const conn = getNavigatorConnection();
  const effectiveType = conn?.effectiveType;
  const rttMs = conn?.rtt ?? null;

  let type: NetworkType;
  if (!online) type = 'none';
  else if (conn?.type === 'wifi' || effectiveType === '4g') type = 'wifi';
  else if (effectiveType) type = 'cellular';
  else type = 'unknown';

  const slow = online && (isSlowEffectiveType(effectiveType) || (rttMs !== null && rttMs > 2000));
  return { online, slow, type, rttMs };
}

export function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>(() => snapshotWeb());

  useEffect(() => {
    const refresh = () => setState(snapshotWeb());

    if (typeof window !== 'undefined') {
      window.addEventListener('online', refresh);
      window.addEventListener('offline', refresh);
      const conn = getNavigatorConnection() as (NavigatorConnection & EventTarget) | undefined;
      conn?.addEventListener?.('change', refresh);

      let nativeRemove: (() => void) | undefined;
      if (Capacitor.isNativePlatform()) {
        void (async () => {
          const { Network } = await import('@capacitor/network');
          const status = await Network.getStatus();
          setState((prev) => ({
            ...prev,
            online: status.connected,
            type: (status.connectionType as NetworkType) ?? prev.type,
          }));
          const listener = await Network.addListener('networkStatusChange', (s) => {
            setState((prev) => ({
              ...prev,
              online: s.connected,
              type: (s.connectionType as NetworkType) ?? prev.type,
            }));
          });
          nativeRemove = () => listener.remove();
        })();
      }

      return () => {
        window.removeEventListener('online', refresh);
        window.removeEventListener('offline', refresh);
        conn?.removeEventListener?.('change', refresh);
        nativeRemove?.();
      };
    }
    return undefined;
  }, []);

  return state;
}
