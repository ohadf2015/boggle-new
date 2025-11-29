/**
 * Frontend logger utility
 * Only logs in development mode to keep production console clean
 */

const isDevelopment = process.env.NODE_ENV === 'development';

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
   * Log warning messages (always shown, even in production)
   */
  warn(...args: unknown[]): void {
    console.warn(...args);
  }

  /**
   * Log error messages (always shown, even in production)
   */
  error(...args: unknown[]): void {
    console.error(...args);
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
