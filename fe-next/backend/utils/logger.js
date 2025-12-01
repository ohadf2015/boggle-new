const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL
      ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()]
      : LOG_LEVELS.INFO;
    this.enableTimestamp = process.env.LOG_TIMESTAMP !== 'false';
    this.enableColors = process.env.LOG_COLORS !== 'false' && process.stdout.isTTY;
  }

  getTimestamp() {
    return this.enableTimestamp ? `[${new Date().toISOString()}] ` : '';
  }

  serializeData(data) {
    if (data === undefined || data === null) return '';

    // Handle Error objects specially since they don't serialize properly
    if (data instanceof Error) {
      return JSON.stringify({
        name: data.name,
        message: data.message,
        stack: data.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
      });
    }

    // Handle objects that might contain Error instances
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, (key, value) => {
          if (value instanceof Error) {
            return { name: value.name, message: value.message };
          }
          return value;
        });
      } catch (e) {
        return `[Serialization Error: ${e.message}]`;
      }
    }

    return JSON.stringify(data);
  }

  formatMessage(level, category, message, data) {
    const timestamp = this.getTimestamp();
    const categoryStr = category ? `[${category}] ` : '';
    const dataStr = data ? ` ${this.serializeData(data)}` : '';

    if (this.enableColors) {
      const colors = {
        ERROR: '\x1b[31m',   // Red
        WARN: '\x1b[33m',    // Yellow
        INFO: '\x1b[36m',    // Cyan
        DEBUG: '\x1b[90m',   // Gray
        RESET: '\x1b[0m'
      };
      const color = colors[level] || colors.RESET;
      return `${color}${timestamp}${categoryStr}${message}${dataStr}${colors.RESET}`;
    }

    return `${timestamp}${categoryStr}${message}${dataStr}`;
  }

  error(category, message, data) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error(this.formatMessage('ERROR', category, message, data));
    }
  }

  warn(category, message, data) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage('WARN', category, message, data));
    }
  }

  info(category, message, data) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log(this.formatMessage('INFO', category, message, data));
    }
  }

  debug(category, message, data) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage('DEBUG', category, message, data));
    }
  }
}

// Create singleton logger instance
const logger = new Logger();

module.exports = logger;
