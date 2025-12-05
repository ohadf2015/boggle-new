/**
 * Backend Logger
 * Structured logging with levels, timestamps, and color support
 */

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

const LOG_LEVELS: Record<LogLevel, number> = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

interface LogColors {
  ERROR: string;
  WARN: string;
  INFO: string;
  DEBUG: string;
  RESET: string;
}

interface SerializedError {
  name: string;
  message: string;
  stack?: string;
}

export class Logger {
  private level: number;
  private enableTimestamp: boolean;
  private enableColors: boolean;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() as LogLevel | undefined;
    this.level = envLevel && LOG_LEVELS[envLevel] !== undefined
      ? LOG_LEVELS[envLevel]
      : LOG_LEVELS.INFO;
    this.enableTimestamp = process.env.LOG_TIMESTAMP !== 'false';
    this.enableColors = process.env.LOG_COLORS !== 'false' && Boolean(process.stdout.isTTY);
  }

  private getTimestamp(): string {
    return this.enableTimestamp ? `[${new Date().toISOString()}] ` : '';
  }

  private serializeData(data: unknown): string {
    if (data === undefined || data === null) return '';

    // Handle Error objects specially
    if (data instanceof Error) {
      const serialized: SerializedError = {
        name: data.name,
        message: data.message,
        stack: data.stack?.split('\n').slice(0, 5).join('\n')
      };
      return JSON.stringify(serialized);
    }

    // Handle objects that might contain Error instances
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, (_key, value) => {
          if (value instanceof Error) {
            return { name: value.name, message: value.message };
          }
          return value;
        });
      } catch (e) {
        return `[Serialization Error: ${e instanceof Error ? e.message : 'unknown'}]`;
      }
    }

    return JSON.stringify(data);
  }

  private formatMessage(level: LogLevel, category: string, message: string, data?: unknown): string {
    const timestamp = this.getTimestamp();
    const categoryStr = category ? `[${category}] ` : '';
    const dataStr = data !== undefined ? ` ${this.serializeData(data)}` : '';

    if (this.enableColors) {
      const colors: LogColors = {
        ERROR: '\x1b[31m',   // Red
        WARN: '\x1b[33m',    // Yellow
        INFO: '\x1b[36m',    // Cyan
        DEBUG: '\x1b[90m',   // Gray
        RESET: '\x1b[0m'
      };
      const color = colors[level];
      return `${color}${timestamp}${categoryStr}${message}${dataStr}${colors.RESET}`;
    }

    return `${timestamp}${categoryStr}${message}${dataStr}`;
  }

  /**
   * Log an error message
   */
  error(category: string, message: string, data?: unknown): void {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error(this.formatMessage('ERROR', category, message, data));
    }
  }

  /**
   * Log a warning message
   */
  warn(category: string, message: string, data?: unknown): void {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage('WARN', category, message, data));
    }
  }

  /**
   * Log an info message
   */
  info(category: string, message: string, data?: unknown): void {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log(this.formatMessage('INFO', category, message, data));
    }
  }

  /**
   * Log a debug message
   */
  debug(category: string, message: string, data?: unknown): void {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage('DEBUG', category, message, data));
    }
  }

  /**
   * Generic log method
   */
  log(level: LogLevel, category: string, message: string, data?: unknown): void {
    switch (level) {
      case 'ERROR':
        this.error(category, message, data);
        break;
      case 'WARN':
        this.warn(category, message, data);
        break;
      case 'INFO':
        this.info(category, message, data);
        break;
      case 'DEBUG':
        this.debug(category, message, data);
        break;
    }
  }

  /**
   * Set log level dynamically
   */
  setLevel(level: LogLevel): void {
    this.level = LOG_LEVELS[level];
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    const levels = Object.entries(LOG_LEVELS) as [LogLevel, number][];
    const found = levels.find(([_, val]) => val === this.level);
    return found ? found[0] : 'INFO';
  }
}

// Create singleton logger instance
const logger = new Logger();

export default logger;

// Also export as named export for CommonJS compatibility
module.exports = logger;
module.exports.Logger = Logger;
module.exports.default = logger;
