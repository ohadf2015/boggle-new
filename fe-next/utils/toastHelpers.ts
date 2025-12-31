import toast from 'react-hot-toast';

/**
 * Toast Hierarchy System
 *
 * Categorizes notifications by severity and provides appropriate
 * visual feedback and duration
 */

export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'critical';

interface ToastOptions {
  /** Custom duration in milliseconds */
  duration?: number;
  /** Icon to display */
  icon?: string;
  /** Whether toast is dismissible */
  dismissible?: boolean;
}

/**
 * Default durations by toast type (in milliseconds)
 */
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 2000,   // Quick confirmation
  info: 3000,      // Informational
  warning: 4000,   // Needs attention
  error: 5000,     // Needs more attention
  critical: Infinity, // Must be manually dismissed
};

/**
 * Default icons by toast type
 */
const DEFAULT_ICONS: Record<ToastType, string> = {
  success: '✓',
  info: 'ℹ️',
  warning: '⚠️',
  error: '✗',
  critical: '🚨',
};

/**
 * Toast style configurations
 */
const TOAST_STYLES: Record<ToastType, any> = {
  success: {
    style: {
      background: 'rgb(var(--neo-lime))',
      color: 'rgb(var(--neo-black))',
      border: '3px solid rgb(var(--neo-black))',
      borderRadius: '12px',
      fontWeight: 'bold',
      boxShadow: '4px 4px 0px rgb(var(--neo-black))',
    },
  },
  info: {
    style: {
      background: 'rgb(var(--neo-cyan))',
      color: 'rgb(var(--neo-black))',
      border: '3px solid rgb(var(--neo-black))',
      borderRadius: '12px',
      fontWeight: 'bold',
      boxShadow: '4px 4px 0px rgb(var(--neo-black))',
    },
  },
  warning: {
    style: {
      background: 'rgb(var(--neo-yellow))',
      color: 'rgb(var(--neo-black))',
      border: '3px solid rgb(var(--neo-black))',
      borderRadius: '12px',
      fontWeight: 'bold',
      boxShadow: '4px 4px 0px rgb(var(--neo-black))',
    },
  },
  error: {
    style: {
      background: 'rgb(var(--neo-orange))',
      color: 'rgb(var(--neo-black))',
      border: '3px solid rgb(var(--neo-black))',
      borderRadius: '12px',
      fontWeight: 'bold',
      boxShadow: '4px 4px 0px rgb(var(--neo-black))',
    },
  },
  critical: {
    style: {
      background: 'rgb(var(--neo-red))',
      color: 'white',
      border: '3px solid rgb(var(--neo-black))',
      borderRadius: '12px',
      fontWeight: 'bold',
      boxShadow: '4px 4px 0px rgb(var(--neo-black))',
    },
  },
};

/**
 * Show a success toast (brief, positive feedback)
 * Use for: Word accepted, action completed, etc.
 */
export function showSuccessToast(message: string, options: ToastOptions = {}) {
  return toast(message, {
    duration: options.duration ?? DEFAULT_DURATIONS.success,
    icon: options.icon ?? DEFAULT_ICONS.success,
    ...TOAST_STYLES.success,
  });
}

/**
 * Show an info toast (neutral information)
 * Use for: Connection status, game events, etc.
 */
export function showInfoToast(message: string, options: ToastOptions = {}) {
  return toast(message, {
    duration: options.duration ?? DEFAULT_DURATIONS.info,
    icon: options.icon ?? DEFAULT_ICONS.info,
    ...TOAST_STYLES.info,
  });
}

/**
 * Show a warning toast (needs attention)
 * Use for: Room full, rate limit, etc.
 */
export function showWarningToast(message: string, options: ToastOptions = {}) {
  return toast(message, {
    duration: options.duration ?? DEFAULT_DURATIONS.warning,
    icon: options.icon ?? DEFAULT_ICONS.warning,
    ...TOAST_STYLES.warning,
  });
}

/**
 * Show an error toast (action failed)
 * Use for: Word rejected, validation errors, etc.
 */
export function showErrorToast(message: string, options: ToastOptions = {}) {
  return toast(message, {
    duration: options.duration ?? DEFAULT_DURATIONS.error,
    icon: options.icon ?? DEFAULT_ICONS.error,
    ...TOAST_STYLES.error,
  });
}

/**
 * Show a critical toast (requires immediate attention)
 * IMPORTANT: This should be used sparingly - consider using ErrorBanner instead
 * Use for: Critical failures that block functionality
 */
export function showCriticalToast(message: string, options: ToastOptions = {}) {
  return toast(message, {
    duration: options.duration ?? DEFAULT_DURATIONS.critical,
    icon: options.icon ?? DEFAULT_ICONS.critical,
    ...TOAST_STYLES.critical,
  });
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts() {
  toast.dismiss();
}

/**
 * Dismiss a specific toast by ID
 */
export function dismissToast(toastId: string) {
  toast.dismiss(toastId);
}

/**
 * Helper to replace critical errors with ErrorBanner
 * Returns error details for ErrorBanner component
 */
export function getErrorBannerConfig(error: string | Error): {
  type: 'network' | 'serverBusy' | 'timeout' | 'sessionExpired' | 'generic';
  message: string;
  details?: string;
  actions: Array<{ label: string; onClick: () => void }>;
} {
  const errorMsg = typeof error === 'string' ? error : error.message;
  const lowerMsg = errorMsg.toLowerCase();

  // Network errors
  if (lowerMsg.includes('network') || lowerMsg.includes('connection') || lowerMsg.includes('offline')) {
    return {
      type: 'network',
      message: 'Connection Error',
      details: 'Cannot reach game server. Check your internet connection.',
      actions: [
        { label: 'Retry Now', onClick: () => window.location.reload() },
      ],
    };
  }

  // Server busy
  if (lowerMsg.includes('busy') || lowerMsg.includes('503') || lowerMsg.includes('unavailable')) {
    return {
      type: 'serverBusy',
      message: 'Server is Busy',
      details: 'Too many players right now. Try again in a minute.',
      actions: [
        { label: 'Retry', onClick: () => window.location.reload() },
      ],
    };
  }

  // Timeout
  if (lowerMsg.includes('timeout') || lowerMsg.includes('timed out')) {
    return {
      type: 'timeout',
      message: 'Connection Timeout',
      details: 'Request took too long. Check your firewall or VPN settings.',
      actions: [
        { label: 'Retry', onClick: () => window.location.reload() },
      ],
    };
  }

  // Session expired
  if (lowerMsg.includes('session') || lowerMsg.includes('expired') || lowerMsg.includes('unauthorized')) {
    return {
      type: 'sessionExpired',
      message: 'Session Expired',
      details: 'Your session has ended. Please refresh to continue.',
      actions: [
        { label: 'Refresh', onClick: () => window.location.reload() },
      ],
    };
  }

  // Generic error
  return {
    type: 'generic',
    message: 'Something Went Wrong',
    details: errorMsg,
    actions: [
      { label: 'Retry', onClick: () => window.location.reload() },
    ],
  };
}
