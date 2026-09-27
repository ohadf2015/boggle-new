/**
 * useConnectionQuality - RTT measurement + Network Information API + quality level
 *
 * Measures round-trip time via Socket.IO acknowledgment callbacks every 5 seconds.
 * Keeps a rolling window of 10 samples, computes average RTT and jitter (std dev).
 * Exposes connection quality level: excellent | good | poor | critical | disconnected.
 * Also reads navigator.connection.effectiveType when available.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Socket } from 'socket.io-client';

// Quality thresholds (ms)
const EXCELLENT_THRESHOLD = 100;
const GOOD_THRESHOLD = 300;
const POOR_THRESHOLD = 1000;

const LATENCY_CHECK_INTERVAL = 5000; // 5 seconds
const MAX_SAMPLES = 10;

export type QualityLevel = 'excellent' | 'good' | 'poor' | 'critical' | 'disconnected';

export interface ConnectionQuality {
  averageRtt: number;
  jitter: number;
  quality: QualityLevel;
  networkType: string | null;
  samples: number[];
}

// Navigator connection type (Network Information API)
interface NetworkInformation {
  effectiveType?: string;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

function getNetworkType(): string | null {
  if (typeof navigator === 'undefined') return null;
  const conn = (navigator as unknown as { connection?: NetworkInformation }).connection;
  return conn?.effectiveType ?? null;
}

function computeAverage(samples: number[]): number {
  if (samples.length === 0) return 0;
  const sum = samples.reduce((a, b) => a + b, 0);
  return Math.round(sum / samples.length);
}

function computeJitter(samples: number[]): number {
  if (samples.length <= 1) return 0;
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((sum, s) => sum + (s - avg) ** 2, 0) / samples.length;
  return Math.round(Math.sqrt(variance));
}

function getQualityLevel(avgRtt: number): QualityLevel {
  if (avgRtt < EXCELLENT_THRESHOLD) return 'excellent';
  if (avgRtt < GOOD_THRESHOLD) return 'good';
  if (avgRtt < POOR_THRESHOLD) return 'poor';
  return 'critical';
}

const DISCONNECTED_STATE: ConnectionQuality = {
  averageRtt: 0,
  jitter: 0,
  quality: 'disconnected',
  networkType: null,
  samples: [],
};

export function useConnectionQuality(
  socket: Socket | null,
  isConnected: boolean
): ConnectionQuality {
  const [samples, setSamples] = useState<number[]>([]);
  const [networkType, setNetworkType] = useState<string | null>(getNetworkType);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Measure RTT via latencyCheck acknowledgment
  const measureRtt = useCallback(() => {
    if (!socket || !isConnected) return;
    const sendTime = Date.now();
    socket.emit('latencyCheck', { t: sendTime }, () => {
      const rtt = Date.now() - sendTime;
      setSamples(prev => {
        const next = [...prev, rtt];
        return next.length > MAX_SAMPLES ? next.slice(next.length - MAX_SAMPLES) : next;
      });
    });
  }, [socket, isConnected]);

  // Set up interval for RTT checks
  useEffect(() => {
    if (!socket || !isConnected) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(measureRtt, LATENCY_CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [socket, isConnected, measureRtt]);

  // Listen for Network Information API changes
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const conn = (navigator as unknown as { connection?: NetworkInformation }).connection;
    if (!conn?.addEventListener) return;

    const handleChange = () => setNetworkType(conn.effectiveType ?? null);
    conn.addEventListener('change', handleChange);
    return () => conn.removeEventListener?.('change', handleChange);
  }, []);

  // Update networkType on mount/reconnect
  useEffect(() => {
    setNetworkType(getNetworkType());
  }, [isConnected]);

  // Compute derived values
  return useMemo<ConnectionQuality>(() => {
    if (!socket || !isConnected) return DISCONNECTED_STATE;

    const averageRtt = computeAverage(samples);
    const jitter = computeJitter(samples);
    const quality = samples.length === 0 ? 'excellent' : getQualityLevel(averageRtt);

    return { averageRtt, jitter, quality, networkType, samples };
  }, [socket, isConnected, samples, networkType]);
}
