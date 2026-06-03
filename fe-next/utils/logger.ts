/**
 * Frontend logger utility
 * Only logs in development mode to keep production console clean
 * In production, errors and warnings are sent to Sentry but not shown in console
 */

import * as Sentry from "@sentry/nextjs";

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

class FrontendLogger {
  /**
   * Log informational messages
   */
  log(...args: unknown[]): void {
    if (isDevelopment) {
      console.log(...args);
    }
  }

  /**
   * Log debug messages
   */
  debug(...args: unknown[]): void {
    if (isDevelopment) {
      console.debug(...args);
    }
  }

  /**
   * Log warning messages
   * In production: sent to Sentry, hidden from console
   * In development: shown in console
   */
  warn(...args: unknown[]): void {
    if (isProduction) {
      // Send to Sentry but don't show in console.
      // Like error(), a common pattern is `logger.warn('msg:', err)`. Capture
      // the Error so its stack survives instead of becoming "{}".
      const errorArg = args.find((arg): arg is Error => arg instanceof Error);

      if (errorArg) {
        Sentry.captureException(errorArg, {
          level: 'warning',
          contexts: {
            warning_details: {
              additional_args: args
                .filter(arg => arg !== errorArg)
                .map(arg => String(arg))
            }
          }
        });
        return;
      }

      const message = args.map(arg =>
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');

      Sentry.captureMessage(message, {
        level: 'warning',
        contexts: {
          warning_details: {
            args: args.map(arg => String(arg))
          }
        }
      });
    } else {
      console.warn(...args);
    }
  }

  /**
   * Log error messages
   * In production: sent to Sentry, hidden from console
   * In development: shown in console
   */
  error(...args: unknown[]): void {
    if (isProduction) {
      // Send to Sentry but don't show in console.
      // Scan ALL args for an Error — the dominant call pattern is
      // `logger.error('some message:', err)`, where the Error is NOT the
      // first argument. JSON.stringify-ing an Error yields "{}" (its fields
      // are non-enumerable), so funnelling these through captureMessage
      // silently drops the stack and real message. captureException keeps
      // both and groups correctly.
      const errorArg = args.find((arg): arg is Error => arg instanceof Error);

      if (errorArg) {
        Sentry.captureException(errorArg, {
          contexts: {
            error_details: {
              additional_args: args
                .filter(arg => arg !== errorArg)
                .map(arg => String(arg))
            }
          }
        });
      } else {
        // Otherwise, capture as a message
        const message = args.map(arg =>
          typeof arg === 'string' ? arg : JSON.stringify(arg)
        ).join(' ');

        Sentry.captureMessage(message, {
          level: 'error',
          contexts: {
            error_details: {
              args: args.map(arg => String(arg))
            }
          }
        });
      }
    } else {
      console.error(...args);
    }
  }

  /**
   * Log informational messages (alias for log)
   */
  info(...args: unknown[]): void {
    this.log(...args);
  }

  /**
   * Group logs together
   */
  group(label: string): void {
    if (isDevelopment && console.group) {
      console.group(label);
    }
  }

  /**
   * End log group
   */
  groupEnd(): void {
    if (isDevelopment && console.groupEnd) {
      console.groupEnd();
    }
  }

  /**
   * Log table data
   */
  table(data: unknown): void {
    if (isDevelopment && console.table) {
      console.table(data);
    }
  }

  /**
   * Time measurement start
   */
  time(label: string): void {
    if (isDevelopment && console.time) {
      console.time(label);
    }
  }

  /**
   * Time measurement end
   */
  timeEnd(label: string): void {
    if (isDevelopment && console.timeEnd) {
      console.timeEnd(label);
    }
  }
}

// Create singleton instance
const logger = new FrontendLogger();

export default logger;
