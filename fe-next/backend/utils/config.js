/**
 * Backend Configuration Validation
 * Validates and exports all environment variables with type safety and defaults
 *
 * Usage:
 *   const config = require('./utils/config');
 *   console.log(config.redis.host);
 */

const logger = require('./logger');

// ==========================================
// Configuration Schema Definition
// ==========================================

/**
 * Define configuration with validation rules
 * @typedef {Object} ConfigSchema
 * @property {string} env - Environment variable name
 * @property {*} default - Default value if not set
 * @property {string} type - Expected type: 'string' | 'number' | 'boolean' | 'json'
 * @property {boolean} required - Whether the variable is required
 * @property {Function} validate - Optional validation function
 */

const configSchema = {
  // Server Configuration
  server: {
    port: {
      env: 'PORT',
      default: 3001,
      type: 'number',
      validate: (v) => v > 0 && v < 65536,
    },
    host: {
      env: 'HOST',
      default: '0.0.0.0',
      type: 'string',
    },
    corsOrigin: {
      env: 'CORS_ORIGIN',
      default: '*',
      type: 'string',
    },
    nodeEnv: {
      env: 'NODE_ENV',
      default: 'development',
      type: 'string',
      validate: (v) => ['development', 'production', 'test'].includes(v),
    },
  },

  // Redis Configuration
  redis: {
    url: {
      env: 'REDIS_URL',
      default: null,
      type: 'string',
    },
    host: {
      env: 'REDIS_HOST',
      default: '127.0.0.1',
      type: 'string',
    },
    port: {
      env: 'REDIS_PORT',
      default: 6379,
      type: 'number',
    },
    password: {
      env: 'REDIS_PASSWORD',
      default: null,
      type: 'string',
    },
    prefix: {
      env: 'REDIS_PREFIX',
      default: 'lexiclash',
      type: 'string',
    },
    gameTtl: {
      env: 'REDIS_GAME_TTL',
      default: 3600,
      type: 'number',
      validate: (v) => v > 0,
    },
    tournamentTtl: {
      env: 'REDIS_TOURNAMENT_TTL',
      default: 10800,
      type: 'number',
      validate: (v) => v > 0,
    },
    leaderboardTtl: {
      env: 'REDIS_LEADERBOARD_TTL',
      default: 900,
      type: 'number',
      validate: (v) => v > 0,
    },
  },

  // Supabase Configuration
  supabase: {
    url: {
      env: 'NEXT_PUBLIC_SUPABASE_URL',
      default: null,
      type: 'string',
    },
    anonKey: {
      env: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      default: null,
      type: 'string',
    },
    serviceRoleKey: {
      env: 'SUPABASE_SERVICE_ROLE_KEY',
      default: null,
      type: 'string',
    },
  },

  // AI/Vertex Configuration
  ai: {
    googleCredentialsJson: {
      env: 'GOOGLE_CREDENTIALS_JSON',
      default: null,
      type: 'string',
    },
    vertexLocation: {
      env: 'VERTEX_AI_LOCATION',
      default: 'us-central1',
      type: 'string',
    },
    vertexModel: {
      env: 'VERTEX_AI_MODEL',
      default: 'gemini-1.5-flash-002',
      type: 'string',
    },
  },

  // Logging Configuration
  logging: {
    level: {
      env: 'LOG_LEVEL',
      default: 'INFO',
      type: 'string',
      validate: (v) => ['ERROR', 'WARN', 'INFO', 'DEBUG'].includes(v.toUpperCase()),
    },
    format: {
      env: 'LOG_FORMAT',
      default: 'text',
      type: 'string',
      validate: (v) => ['text', 'json'].includes(v),
    },
    timestamp: {
      env: 'LOG_TIMESTAMP',
      default: true,
      type: 'boolean',
    },
    colors: {
      env: 'LOG_COLORS',
      default: true,
      type: 'boolean',
    },
    serviceName: {
      env: 'SERVICE_NAME',
      default: 'boggle-server',
      type: 'string',
    },
  },

  // Rate Limiting Configuration
  rateLimit: {
    maxMessages: {
      env: 'RATE_MAX_MESSAGES',
      default: 150,
      type: 'number',
      validate: (v) => v > 0,
    },
    windowMs: {
      env: 'RATE_WINDOW_MS',
      default: 10000,
      type: 'number',
      validate: (v) => v > 0,
    },
  },

  // Instance Identification (for horizontal scaling)
  instance: {
    railwayReplicaId: {
      env: 'RAILWAY_REPLICA_ID',
      default: null,
      type: 'string',
    },
    hostname: {
      env: 'HOSTNAME',
      default: 'local',
      type: 'string',
    },
  },

  // Event Loop Monitoring
  monitoring: {
    eventLoopIntervalMs: {
      env: 'EVENT_LOOP_MONITOR_INTERVAL_MS',
      default: 1000,
      type: 'number',
      validate: (v) => v >= 100,
    },
  },
};

// ==========================================
// Type Coercion Functions
// ==========================================

function coerceValue(value, type) {
  if (value === null || value === undefined) {
    return null;
  }

  switch (type) {
    case 'number':
      const num = parseInt(value, 10);
      return isNaN(num) ? null : num;
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === '1') return true;
      if (value === 'false' || value === '0') return false;
      return null;
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    case 'string':
    default:
      return String(value);
  }
}

// ==========================================
// Configuration Loader
// ==========================================

function loadConfig(schema, path = '') {
  const config = {};
  const errors = [];
  const warnings = [];

  for (const [key, value] of Object.entries(schema)) {
    const fullPath = path ? `${path}.${key}` : key;

    // Check if this is a nested config group or a config entry
    if (value.env === undefined) {
      // Nested group
      config[key] = loadConfig(value, fullPath);
    } else {
      // Config entry
      const rawValue = process.env[value.env];
      let finalValue;

      if (rawValue !== undefined && rawValue !== '') {
        finalValue = coerceValue(rawValue, value.type);

        if (finalValue === null && value.type !== 'string') {
          errors.push(`${fullPath}: Invalid ${value.type} value for ${value.env}="${rawValue}"`);
          finalValue = value.default;
        }
      } else {
        finalValue = value.default;
      }

      // Run validation if provided
      if (value.validate && finalValue !== null) {
        if (!value.validate(finalValue)) {
          errors.push(`${fullPath}: Validation failed for ${value.env}="${finalValue}"`);
        }
      }

      // Check required
      if (value.required && finalValue === null) {
        errors.push(`${fullPath}: Required environment variable ${value.env} is not set`);
      }

      config[key] = finalValue;
    }
  }

  // Only log at the top level
  if (!path) {
    if (errors.length > 0) {
      logger.error('CONFIG', 'Configuration validation errors:', errors);
    }
    if (warnings.length > 0) {
      logger.warn('CONFIG', 'Configuration warnings:', warnings);
    }
  }

  return config;
}

// ==========================================
// Load and Export Configuration
// ==========================================

const config = loadConfig(configSchema);

// Add computed properties
config.isDevelopment = config.server.nodeEnv === 'development';
config.isProduction = config.server.nodeEnv === 'production';
config.isTest = config.server.nodeEnv === 'test';

// Get instance ID (prefer Railway replica ID, fall back to hostname)
config.instanceId = config.instance.railwayReplicaId || config.instance.hostname || 'local';

// Check if Redis is configured
config.isRedisConfigured = !!(config.redis.url || config.redis.host);

// Check if Supabase is configured
config.isSupabaseConfigured = !!(config.supabase.url && config.supabase.anonKey);

// Check if AI is configured
config.isAiConfigured = !!(config.ai.googleCredentialsJson);

/**
 * Validate configuration at startup
 * Call this in server.js to ensure all required config is present
 */
function validateStartupConfig() {
  const criticalErrors = [];

  // In production, certain configs are required
  if (config.isProduction) {
    if (config.server.corsOrigin === '*') {
      criticalErrors.push('CORS_ORIGIN=* is not allowed in production');
    }
  }

  if (criticalErrors.length > 0) {
    logger.error('CONFIG', 'Critical configuration errors - server cannot start:', criticalErrors);
    return false;
  }

  logger.info('CONFIG', 'Configuration validated successfully', {
    environment: config.server.nodeEnv,
    redis: config.isRedisConfigured ? 'configured' : 'not configured',
    supabase: config.isSupabaseConfigured ? 'configured' : 'not configured',
    ai: config.isAiConfigured ? 'configured' : 'not configured',
  });

  return true;
}

/**
 * Get a summary of the current configuration (safe for logging)
 */
function getConfigSummary() {
  return {
    server: {
      port: config.server.port,
      host: config.server.host,
      nodeEnv: config.server.nodeEnv,
      corsOrigin: config.server.corsOrigin === '*' ? '*' : '[configured]',
    },
    redis: {
      configured: config.isRedisConfigured,
      host: config.redis.url ? '[url]' : config.redis.host,
      prefix: config.redis.prefix,
    },
    supabase: {
      configured: config.isSupabaseConfigured,
    },
    ai: {
      configured: config.isAiConfigured,
      location: config.ai.vertexLocation,
      model: config.ai.vertexModel,
    },
    logging: {
      level: config.logging.level,
      format: config.logging.format,
    },
    rateLimit: config.rateLimit,
    instanceId: config.instanceId,
  };
}

module.exports = {
  ...config,
  validateStartupConfig,
  getConfigSummary,
};
