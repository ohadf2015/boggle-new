'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { classifySlowFromRtt, probeReachability } from '@/lib/offline/networkProbe';

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
    let cancelled = false;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', refresh);
      window.addEventListener('offline', refresh);
      const conn = getNavigatorConnection() as (NavigatorConnection & EventTarget) | undefined;
      conn?.addEventListener?.('change', refresh);

      const applyProbe = (probe: { reachable: boolean; rttMs: number | null }) => {
        // Probe is async: Node/vitest may tear down jsdom (window gone) before it
        // resolves. React 19 setState then throws ReferenceError: window is not defined.
        if (cancelled || typeof window === 'undefined') return;
        if (!probe.reachable) {
          setState((prev) => ({ ...prev, online: false, type: 'none' }));
          return;
        }
        setState((prev) => ({
          ...prev,
          online: true,
          rttMs: probe.rttMs,
          slow: classifySlowFromRtt(probe.rttMs) || prev.slow,
        }));
      };

      const runProbe = () => {
        if (typeof window === 'undefined') return;
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        void probeReachability().then(applyProbe);
      };
      runProbe();
      window.addEventListener('online', runProbe);
      window.addEventListener('focus', runProbe);

      let nativeRemove: (() => void) | undefined;
      if (Capacitor.isNativePlatform()) {
        void (async () => {
          try {
            const { Network } = await import('@capacitor/network');
            const status = await Network.getStatus();
            if (cancelled || typeof window === 'undefined') return;
            setState((prev) => ({
              ...prev,
              online: status.connected,
              type: (status.connectionType as NetworkType) ?? prev.type,
            }));
            const listener = await Network.addListener('networkStatusChange', (s) => {
              if (cancelled || typeof window === 'undefined') return;
              setState((prev) => ({
                ...prev,
                online: s.connected,
                type: (s.connectionType as NetworkType) ?? prev.type,
              }));
            });
            nativeRemove = () => listener.remove();
          } catch {
            // Plugin not registered in native shell (sync skipped / iOS missing / boot race).
            // Web detection via navigator.onLine + probeReachability is sufficient.
          }
        })();
      }

      return () => {
        cancelled = true;
        if (typeof window !== 'undefined') {
          window.removeEventListener('online', refresh);
          window.removeEventListener('offline', refresh);
          window.removeEventListener('online', runProbe);
          window.removeEventListener('focus', runProbe);
        }
        conn?.removeEventListener?.('change', refresh);
        nativeRemove?.();
      };
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
