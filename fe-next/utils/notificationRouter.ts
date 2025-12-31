import toast from 'react-hot-toast';
import type { ErrorType } from '@/components/ErrorBanner';

/**
 * Notification Router - Intelligent routing between toast and ErrorBanner
 *
 * Routes notifications to the appropriate display method:
 * - Critical errors → ErrorBanner (persistent)
 * - Info/Success → Toast (auto-dismiss)
 */

export type NotificationSeverity = 'success' | 'info' | 'warning' | 'error' | 'critical';

export interface NotificationOptions {
  /** Severity determines display method */
  severity: NotificationSeverity;
  /** Toast duration in ms (ignored for critical) */
  duration?: number;
  /** Error type (for ErrorBanner) */
  errorType?: ErrorType;
  /** Details for error banner */
  details?: string;
  /** Icon for toast */
  icon?: string;
}

/**
 * Smart notification that routes to toast or banner based on severity
 */
export function notify(message: string, options: NotificationOptions) {
  const { severity, duration = 2000, icon } = options;

  // Critical errors should use ErrorBanner (handled by component state)
  // Return metadata for component to handle
  if (severity === 'critical') {
    return {
      shouldShowBanner: true,
      bannerProps: {
        type: options.errorType || 'generic',
        message,
        details: options.details,
      },
    };
  }

  // All other severities use toast
  switch (severity) {
    case 'success':
      toast.success(message, {
        duration,
        icon: icon || '✓',
        style: {
          background: 'var(--neo-lime)',
          color: 'var(--neo-black)',
          border: '3px solid var(--neo-black)',
          borderRadius: '12px',
          fontWeight: 'bold',
        },
      });
      break;

    case 'error':
      toast.error(message, {
        duration: duration * 1.5, // Errors stay longer
        icon: icon || '✗',
        style: {
          background: 'var(--neo-red)',
          color: 'white',
          border: '3px solid var(--neo-black)',
          borderRadius: '12px',
          fontWeight: 'bold',
        },
      });
      break;

    case 'warning':
      toast(message, {
        duration,
        icon: icon || '⚠',
        style: {
          background: 'var(--neo-orange)',
          color: 'var(--neo-black)',
          border: '3px solid var(--neo-black)',
          borderRadius: '12px',
          fontWeight: 'bold',
        },
      });
      break;

    case 'info':
    default:
      toast(message, {
        duration,
        icon: icon || 'ℹ️',
        style: {
          background: 'var(--neo-cyan)',
          color: 'var(--neo-black)',
          border: '3px solid var(--neo-black)',
          borderRadius: '12px',
          fontWeight: 'bold',
        },
      });
      break;
  }

  return { shouldShowBanner: false };
}

/**
 * Quick notification helpers
 */
export const notifications = {
  success: (message: string, duration?: number) =>
    notify(message, { severity: 'success', duration }),

  info: (message: string, duration?: number) =>
    notify(message, { severity: 'info', duration }),

  warning: (message: string, duration?: number) =>
    notify(message, { severity: 'warning', duration }),

  error: (message: string, duration?: number) =>
    notify(message, { severity: 'error', duration }),

  /**
   * Critical error - returns metadata for ErrorBanner
   */
  critical: (message: string, errorType: ErrorType = 'generic', details?: string) =>
    notify(message, { severity: 'critical', errorType, details }),

  /**
   * Connection error with auto-retry guidance
   */
  connectionError: (message: string = 'Connection error', details?: string) =>
    notify(message, {
      severity: 'critical',
      errorType: 'network',
      details: details || 'Check your internet connection and try again',
    }),

  /**
   * Server busy error
   */
  serverBusy: (message: string = 'Server is busy', details?: string) =>
    notify(message, {
      severity: 'critical',
      errorType: 'serverBusy',
      details: details || 'Please wait a moment and try again',
    }),

  /**
   * Timeout error
   */
  timeout: (message: string = 'Request timeout', details?: string) =>
    notify(message, {
      severity: 'critical',
      errorType: 'timeout',
      details: details || 'The request took too long. Check your connection.',
    }),

  /**
   * Session expired
   */
  sessionExpired: (message: string = 'Session expired') =>
    notify(message, {
      severity: 'critical',
      errorType: 'sessionExpired',
      details: 'Please rejoin the room',
    }),
};

/**
 * Toast consolidation - prevents multiple identical toasts
 */
const recentToasts = new Map<string, number>();
const TOAST_COOLDOWN = 3000; // 3 seconds

export function notifyOnce(message: string, options: NotificationOptions) {
  const now = Date.now();
  const lastShown = recentToasts.get(message);

  if (lastShown && now - lastShown < TOAST_COOLDOWN) {
    return; // Skip duplicate
  }

  recentToasts.set(message, now);
  notify(message, options);

  // Cleanup old entries
  setTimeout(() => {
    if (recentToasts.get(message) === now) {
      recentToasts.delete(message);
    }
  }, TOAST_COOLDOWN);
}
