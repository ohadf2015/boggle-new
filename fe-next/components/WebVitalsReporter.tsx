'use client';

import { useEffect, useRef } from 'react';
import { useReportWebVitals } from 'next/web-vitals';
import { trackEvent } from './GoogleAnalytics';
import { getPerfVariant } from '@/utils/perfVariant';

/**
 * Web Vitals Reporter Component
 *
 * Tracks Core Web Vitals (CWV) and sends them to Google Analytics and Supabase.
 * Metrics tracked:
 * - LCP (Largest Contentful Paint): Loading performance
 * - FID (First Input Delay): Interactivity
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FCP (First Contentful Paint): Initial render
 * - TTFB (Time to First Byte): Server response time
 * - INP (Interaction to Next Paint): Responsiveness (new Core Web Vital)
 */

// Get device type from user agent
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

// Get connection type if available
function getConnectionType(): string | null {
  if (typeof window === 'undefined') return null;
  if ('connection' in navigator) {
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    return conn?.effectiveType || null;
  }
  return null;
}

function getNavigationTiming(): Record<string, number> | null {
  if (typeof performance === 'undefined') return null;
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (!nav) return null;

  return {
    redirect: nav.redirectEnd - nav.redirectStart,
    dns: nav.domainLookupEnd - nav.domainLookupStart,
    connect: nav.connectEnd - nav.connectStart,
    tls: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
    request: nav.responseStart - nav.requestStart,
    response: nav.responseEnd - nav.responseStart,
    domInteractive: nav.domInteractive,
    domContentLoaded: nav.domContentLoadedEventEnd,
    loadEventEnd: nav.loadEventEnd,
  };
}

// Get or create session ID (persists for 30 minutes)
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  const SESSION_KEY = 'web_vitals_session';
  const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) {
    try {
      const { id, timestamp } = JSON.parse(stored);
      if (Date.now() - timestamp < SESSION_DURATION) {
        return id;
      }
    } catch (e) {
      // Invalid stored session, create new one
    }
  }

  const newSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    id: newSessionId,
    timestamp: Date.now()
  }));
  return newSessionId;
}

export function WebVitalsReporter() {
  const reported = useRef<Set<string>>(new Set());

  useReportWebVitals((metric) => {
    const perfVariant = getPerfVariant();
    // Send to Google Analytics
    trackEvent('web_vitals', {
      metric_name: metric.name,
      metric_value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_rating: metric.rating,
      metric_delta: Math.round(metric.delta),
      metric_id: metric.id,
      perf_variant: perfVariant || 'control',
    });

    // Log to console in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals]', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        device: getDeviceType(),
        connection: getConnectionType(),
      });
    }

    // Send to Supabase for persistent storage and admin dashboard (only once per metric)
    const metricKey = `${metric.name}-${metric.id}`;
    if (!reported.current.has(metricKey)) {
      reported.current.add(metricKey);

      const data = {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_rating: metric.rating || 'poor',
        page_url: window.location.href,
        page_path: window.location.pathname,
        device_type: getDeviceType(),
        connection_type: getConnectionType(),
        navigation_type: metric.navigationType,
        session_id: getSessionId(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        metadata: {
          id: metric.id,
          navigationType: metric.navigationType,
          delta: metric.delta,
          perfVariant,
          navigationTiming: getNavigationTiming(),
        }
      };

      // Fire and forget - don't block user experience
      fetch('/api/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true
      }).catch(() => {
        // Silently fail - tracking should never break the app
      });
    }

    // Send to custom endpoint if configured (for advanced analytics)
    if (process.env.NEXT_PUBLIC_WEB_VITALS_ENDPOINT) {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        url: window.location.href,
        timestamp: Date.now(),
      });

      // Use sendBeacon if available, otherwise fetch
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(process.env.NEXT_PUBLIC_WEB_VITALS_ENDPOINT, body);
      } else {
        fetch(process.env.NEXT_PUBLIC_WEB_VITALS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(console.error);
      }
    }
  });

  return null;
}

/**
 * Web Vitals thresholds for rating metrics
 * Based on Chrome User Experience Report (CrUX) percentiles
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: {
    good: 2500, // 2.5s
    needsImprovement: 4000, // 4s
  },
  FID: {
    good: 100, // 100ms
    needsImprovement: 300, // 300ms
  },
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
  },
  FCP: {
    good: 1800, // 1.8s
    needsImprovement: 3000, // 3s
  },
  TTFB: {
    good: 800, // 800ms
    needsImprovement: 1800, // 1.8s
  },
  INP: {
    good: 200, // 200ms
    needsImprovement: 500, // 500ms
  },
};

/**
 * Hook to manually track performance metrics
 */
export function usePerformanceMetrics() {
  useEffect(() => {
    // Track long tasks (tasks that block main thread > 50ms)
    if (!('PerformanceObserver' in window)) {
      return;
    }

    let longTaskObserver: PerformanceObserver | null = null;
    try {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            trackEvent('long_task', {
              duration: Math.round(entry.duration),
              name: entry.name,
            });
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch {
      // longtask not supported in this browser
    }

    return () => {
      longTaskObserver?.disconnect();
    };
  }, []);
}

export default WebVitalsReporter;
