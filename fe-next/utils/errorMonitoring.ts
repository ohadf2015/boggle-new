/**
 * Error Monitoring Utility
 *
 * Provides centralized error tracking and monitoring using LogRocket.
 * Captures errors, user sessions, and performance metrics.
 *
 * Features:
 * - LogRocket integration for session replay
 * - Structured error logging with context
 * - User identification for authenticated users
 * - Performance timing utilities
 * - Network error detection
 */

import LogRocket from 'logrocket';

// ==========================================
// Configuration
// ==========================================

const LOGROCKET_APP_ID = process.env.NEXT_PUBLIC_LOGROCKET_APP_ID;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_BROWSER = typeof window !== 'undefined';

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Error categories for grouping
export type ErrorCategory =
  | 'socket'
  | 'api'
  | 'render'
  | 'validation'
  | 'auth'
  | 'game'
  | 'unknown';

// Error context interface
export interface ErrorContext {
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  component?: string;
  action?: string;
  userId?: string;
  gameCode?: string;
  extra?: Record<string, unknown>;
}

// User identification for tracking
export interface UserIdentity {
  id: string;
  name?: string;
  email?: string;
  isGuest?: boolean;
  traits?: Record<string, string | number | boolean>;
}

// ==========================================
// Initialization
// ==========================================

let isInitialized = false;

/**
 * Initialize error monitoring
 * Should be called once at app startup
 */
export function initErrorMonitoring(): void {
  if (!IS_BROWSER) return;
  if (isInitialized) return;

  if (LOGROCKET_APP_ID && IS_PRODUCTION) {
    try {
      LogRocket.init(LOGROCKET_APP_ID, {
        release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
        console: {
          isEnabled: true,
          shouldAggregateConsoleErrors: true,
        },
        network: {
          isEnabled: true,
          requestSanitizer: (request) => {
            // Sanitize sensitive headers
            if (request.headers) {
              delete request.headers['Authorization'];
              delete request.headers['Cookie'];
            }
            return request;
          },
          responseSanitizer: (response) => {
            // Sanitize sensitive response data
            return response;
          },
        },
        dom: {
          isEnabled: true,
          inputSanitizer: true, // Sanitize input values
        },
      });

      isInitialized = true;
      console.log('[ErrorMonitoring] LogRocket initialized');
    } catch (error) {
      console.error('[ErrorMonitoring] Failed to initialize LogRocket:', error);
    }
  } else if (!IS_PRODUCTION) {
    // Development mode - just log to console
    console.log('[ErrorMonitoring] Running in development mode (LogRocket disabled)');
    isInitialized = true;
  }
}

// ==========================================
// User Identification
// ==========================================

/**
 * Identify a user for session tracking
 * @param user - User identity information
 */
export function identifyUser(user: UserIdentity): void {
  if (!IS_BROWSER) return;

  if (IS_PRODUCTION && isInitialized && LOGROCKET_APP_ID) {
    try {
      LogRocket.identify(user.id, {
        name: user.name || 'Anonymous',
        email: user.email,
        isGuest: user.isGuest || false,
        ...user.traits,
      });
    } catch (error) {
      console.error('[ErrorMonitoring] Failed to identify user:', error);
    }
  }

  // Always log in development
  if (!IS_PRODUCTION) {
    console.log('[ErrorMonitoring] User identified:', user.id, user.name);
  }
}

/**
 * Clear user identity (on logout)
 */
export function clearUserIdentity(): void {
  // LogRocket doesn't have a built-in clear method
  // A new session will start on next page load
  if (!IS_PRODUCTION) {
    console.log('[ErrorMonitoring] User identity cleared');
  }
}

// ==========================================
// Error Tracking
// ==========================================

/**
 * Track an error with context
 * @param error - The error to track
 * @param context - Additional context
 */
export function trackError(
  error: Error | string,
  context: ErrorContext = {}
): void {
  if (!IS_BROWSER) return;

  const errorObj = typeof error === 'string' ? new Error(error) : error;
  const {
    category = 'unknown',
    severity = 'medium',
    component,
    action,
    userId,
    gameCode,
    extra = {},
  } = context;

  // Create structured log data
  const logData = {
    message: errorObj.message,
    category,
    severity,
    component,
    action,
    userId,
    gameCode,
    stack: errorObj.stack,
    timestamp: new Date().toISOString(),
    ...extra,
  };

  // Log to LogRocket in production
  if (IS_PRODUCTION && isInitialized && LOGROCKET_APP_ID) {
    try {
      LogRocket.captureException(errorObj, {
        tags: {
          category,
          severity,
          component: component || 'unknown',
        },
        extra: logData,
      });
    } catch (e) {
      console.error('[ErrorMonitoring] Failed to capture exception:', e);
    }
  }

  // Always log to console
  const consoleMethod = severity === 'critical' || severity === 'high'
    ? console.error
    : console.warn;

  consoleMethod(`[${category.toUpperCase()}]`, errorObj.message, logData);
}

/**
 * Track a socket error
 */
export function trackSocketError(
  error: Error | string,
  event?: string,
  gameCode?: string
): void {
  trackError(error, {
    category: 'socket',
    severity: 'high',
    action: event,
    gameCode,
    extra: { event },
  });
}

/**
 * Track an API error
 */
export function trackApiError(
  error: Error | string,
  endpoint?: string,
  statusCode?: number
): void {
  trackError(error, {
    category: 'api',
    severity: statusCode && statusCode >= 500 ? 'high' : 'medium',
    action: endpoint,
    extra: { endpoint, statusCode },
  });
}

/**
 * Track a render/component error
 */
export function trackRenderError(
  error: Error,
  componentName: string,
  errorInfo?: React.ErrorInfo
): void {
  trackError(error, {
    category: 'render',
    severity: 'high',
    component: componentName,
    extra: {
      componentStack: errorInfo?.componentStack,
    },
  });
}

/**
 * Track a validation error
 */
export function trackValidationError(
  message: string,
  field?: string,
  value?: unknown
): void {
  trackError(message, {
    category: 'validation',
    severity: 'low',
    extra: { field, value: typeof value },
  });
}

// ==========================================
// Custom Events
// ==========================================

/**
 * Track a custom event
 * @param eventName - Name of the event
 * @param data - Event data
 */
export function trackEvent(
  eventName: string,
  data: Record<string, unknown> = {}
): void {
  if (!IS_BROWSER) return;

  if (IS_PRODUCTION && isInitialized && LOGROCKET_APP_ID) {
    try {
      // Cast to LogRocket's expected type - values should be primitives or arrays of primitives
      const trackData = data as { [key: string]: string | number | boolean | string[] | number[] | boolean[] | undefined | null };
      LogRocket.track(eventName, trackData);
    } catch (error) {
      console.error('[ErrorMonitoring] Failed to track event:', error);
    }
  }

  if (!IS_PRODUCTION) {
    console.log('[Event]', eventName, data);
  }
}

/**
 * Track game-specific events
 */
export function trackGameEvent(
  action: string,
  gameCode: string,
  data: Record<string, unknown> = {}
): void {
  trackEvent(`game_${action}`, {
    gameCode,
    ...data,
  });
}

// ==========================================
// Performance Tracking
// ==========================================

const performanceMarks: Map<string, number> = new Map();

/**
 * Start a performance measurement
 * @param markName - Name for this measurement
 */
export function startPerformanceMark(markName: string): void {
  if (!IS_BROWSER) return;
  performanceMarks.set(markName, performance.now());
}

/**
 * End a performance measurement and log it
 * @param markName - Name of the measurement to end
 * @returns Duration in milliseconds
 */
export function endPerformanceMark(markName: string): number | null {
  if (!IS_BROWSER) return null;

  const startTime = performanceMarks.get(markName);
  if (!startTime) {
    console.warn(`[Performance] No start mark found for: ${markName}`);
    return null;
  }

  const duration = performance.now() - startTime;
  performanceMarks.delete(markName);

  trackEvent('performance_measure', {
    name: markName,
    duration: Math.round(duration),
  });

  return duration;
}

/**
 * Measure async operation performance
 * @param name - Operation name
 * @param operation - Async operation to measure
 * @returns Operation result
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  startPerformanceMark(name);
  try {
    const result = await operation();
    endPerformanceMark(name);
    return result;
  } catch (error) {
    endPerformanceMark(name);
    throw error;
  }
}

// ==========================================
// Network Status
// ==========================================

let isOnline = IS_BROWSER ? navigator.onLine : true;

/**
 * Check if the browser is online
 */
export function getNetworkStatus(): boolean {
  return isOnline;
}

/**
 * Initialize network status listeners
 */
export function initNetworkMonitoring(): void {
  if (!IS_BROWSER) return;

  const handleOnline = () => {
    isOnline = true;
    trackEvent('network_online');
    console.log('[Network] Back online');
  };

  const handleOffline = () => {
    isOnline = false;
    trackEvent('network_offline');
    console.warn('[Network] Gone offline');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

// ==========================================
// Session URL
// ==========================================

/**
 * Get LogRocket session URL for support
 * @returns Session URL or null if not available
 */
export function getSessionURL(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!IS_PRODUCTION || !isInitialized || !LOGROCKET_APP_ID) {
      resolve(null);
      return;
    }

    try {
      LogRocket.getSessionURL((url) => {
        resolve(url);
      });
    } catch {
      resolve(null);
    }
  });
}

// ==========================================
// React Integration Helpers
// ==========================================

/**
 * Create an error boundary handler
 * @param componentName - Name of the component with the boundary
 */
export function createErrorBoundaryHandler(componentName: string) {
  return (error: Error, errorInfo: React.ErrorInfo) => {
    trackRenderError(error, componentName, errorInfo);
  };
}

// ==========================================
// Exports
// ==========================================

export default {
  init: initErrorMonitoring,
  identify: identifyUser,
  clearIdentity: clearUserIdentity,
  trackError,
  trackSocketError,
  trackApiError,
  trackRenderError,
  trackValidationError,
  trackEvent,
  trackGameEvent,
  startPerformanceMark,
  endPerformanceMark,
  measureAsync,
  getNetworkStatus,
  initNetworkMonitoring,
  getSessionURL,
  createErrorBoundaryHandler,
};
