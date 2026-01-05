/**
 * Bug Report Utilities
 * Handles bug report submission with LogRocket and Sentry integration
 */

import * as Sentry from '@sentry/nextjs';
import logger from '@/utils/logger';

/**
 * Context data captured for bug reports
 */
export interface BugReportContext {
  logRocketSessionUrl: string | null;
  currentPage: string;
  currentUrl: string;
  browser: string;
  platform: string;
  screenSize: string;
  userId: string | null;
  timestamp: number;
}

/**
 * Parse browser info from user agent
 */
function getBrowserInfo(): { browser: string; platform: string } {
  if (typeof window === 'undefined' || !navigator.userAgent) {
    return { browser: 'Unknown', platform: 'Unknown' };
  }

  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let platform = 'Unknown';

  // Detect browser
  if (ua.includes('Firefox/')) {
    browser = 'Firefox';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
  } else if (ua.includes('Chrome/')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browser = 'Safari';
  } else if (ua.includes('Opera') || ua.includes('OPR/')) {
    browser = 'Opera';
  }

  // Detect platform
  if (ua.includes('iPhone') || ua.includes('iPad')) {
    platform = 'iOS';
  } else if (ua.includes('Android')) {
    platform = 'Android';
  } else if (ua.includes('Mac OS')) {
    platform = 'macOS';
  } else if (ua.includes('Windows')) {
    platform = 'Windows';
  } else if (ua.includes('Linux')) {
    platform = 'Linux';
  }

  return { browser, platform };
}

/**
 * Get LogRocket session URL if available
 */
function getLogRocketSessionUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const LogRocket = (window as unknown as {
      LogRocket?: {
        getSessionURL?: (cb: (url: string) => void) => void;
        sessionURL?: string;
      };
    }).LogRocket;

    if (!LogRocket) {
      resolve(null);
      return;
    }

    // Try getSessionURL callback first
    if (LogRocket.getSessionURL) {
      LogRocket.getSessionURL((url) => {
        resolve(url || null);
      });
    } else if (LogRocket.sessionURL) {
      // Fall back to sessionURL property
      resolve(LogRocket.sessionURL);
    } else {
      resolve(null);
    }

    // Timeout after 2 seconds if callback doesn't fire
    setTimeout(() => resolve(null), 2000);
  });
}

/**
 * Collect all context for bug report
 */
export async function getBugReportContext(userId?: string | null): Promise<BugReportContext> {
  const logRocketSessionUrl = await getLogRocketSessionUrl();
  const { browser, platform } = getBrowserInfo();

  const screenSize = typeof window !== 'undefined'
    ? `${window.innerWidth}x${window.innerHeight}`
    : 'Unknown';

  const currentPage = typeof window !== 'undefined'
    ? window.location.pathname
    : 'Unknown';

  const currentUrl = typeof window !== 'undefined'
    ? window.location.href
    : 'Unknown';

  return {
    logRocketSessionUrl,
    currentPage,
    currentUrl,
    browser,
    platform,
    screenSize,
    userId: userId || null,
    timestamp: Date.now(),
  };
}

/**
 * Submit a bug report to LogRocket and Sentry
 */
export async function submitBugReport(
  description: string,
  context: BugReportContext
): Promise<boolean> {
  try {
    const reportData = {
      description,
      ...context,
      reportedAt: new Date().toISOString(),
    };

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      logger.info('[BUG_REPORT] Submitting bug report:', reportData);
    }

    // Track to LogRocket
    if (typeof window !== 'undefined') {
      const LogRocket = (window as unknown as {
        LogRocket?: { track: (event: string, data: object) => void };
      }).LogRocket;

      if (LogRocket?.track) {
        LogRocket.track('bug_report', reportData);
      }
    }

    // Capture to Sentry with all context
    Sentry.withScope((scope) => {
      scope.setLevel('info');
      scope.setTag('type', 'user_bug_report');
      scope.setContext('bug_report', reportData);

      if (context.userId) {
        scope.setUser({ id: context.userId });
      }

      if (context.logRocketSessionUrl) {
        scope.setTag('logrocket_session', context.logRocketSessionUrl);
        scope.setContext('logrocket', { sessionURL: context.logRocketSessionUrl });
      }

      Sentry.captureMessage(`User Bug Report: ${description.substring(0, 100)}...`, 'info');
    });

    return true;
  } catch (error) {
    logger.error('[BUG_REPORT] Failed to submit bug report:', error);
    return false;
  }
}
