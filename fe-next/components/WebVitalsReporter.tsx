'use client';

import { useEffect } from 'react';
import { useReportWebVitals } from 'next/web-vitals';
import { trackEvent } from './GoogleAnalytics';

/**
 * Web Vitals Reporter Component
 *
 * Tracks Core Web Vitals (CWV) and sends them to Google Analytics.
 * Metrics tracked:
 * - LCP (Largest Contentful Paint): Loading performance
 * - FID (First Input Delay): Interactivity
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FCP (First Contentful Paint): Initial render
 * - TTFB (Time to First Byte): Server response time
 * - INP (Interaction to Next Paint): Responsiveness (new Core Web Vital)
 */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // Send to Google Analytics
    trackEvent('web_vitals', {
      metric_name: metric.name,
      metric_value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_rating: metric.rating,
      metric_delta: Math.round(metric.delta),
      metric_id: metric.id,
    });

    // Log to console in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals]', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
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
      if (navigator.sendBeacon) {
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
