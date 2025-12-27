/**
 * Backend Configuration Validation
 * Validates and exports all environment variables with type safety and defaults
 *
 * Usage:
 *   import config from './utils/config';
 *   console.log(config.redis.host);
 */

import logger from './logger';

// ==========================================
// Type Definitions
// ==========================================

type ConfigType = 'string' | 'number' | 'boolean' | 'json';

interface ConfigEntry {
  env: string;
  default: string | number | boolean | null;
  type: ConfigType;
  required?: boolean;
  validate?: (value: unknown) => boolean;
}

interface ConfigGroup {
  [key: string]: ConfigEntry | ConfigGroup;
}

interface ServerConfig {
  port: number;
  host: string;
  corsOrigin: string;
  nodeEnv: string;
}

interface RedisConfig {
  url: string | null;
  host: string;
  port: number;
  password: string | null;
  prefix: string;
  gameTtl: number;
  tournamentTtl: number;
  leaderboardTtl: number;
}

interface SupabaseConfig {
  url: string | null;
  anonKey: string | null;
  serviceRoleKey: string | null;
}

interface AiConfig {
  googleCredentialsJson: string | null;
  vertexLocation: string;
  vertexModel: string;
}

interface LoggingConfig {
  level: string;
  format: string;
  timestamp: boolean;
  colors: boolean;
  serviceName: string;
}

interface RateLimitConfig {
  maxMessages: number;
  windowMs: number;
}

interface InstanceConfig {
  railwayReplicaId: string | null;
  hostname: string;
}

interface MonitoringConfig {
  eventLoopIntervalMs: number;
}

interface AppConfig {
  server: ServerConfig;
  redis: RedisConfig;
  supabase: SupabaseConfig;
  ai: AiConfig;
  logging: LoggingConfig;
  rateLimit: RateLimitConfig;
  instance: InstanceConfig;
  monitoring: MonitoringConfig;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  instanceId: string;
  isRedisConfigured: boolean;
  isSupabaseConfigured: boolean;
  isAiConfigured: boolean;
}

// ==========================================
// Configuration Schema Definition
// ==========================================

const configSchema: ConfigGroup = {
  // Server Configuration
  server: {
    port: {
      env: 'PORT',
      default: 3001,
      type: 'number',
      validate: (v) => typeof v === 'number' && v > 0 && v < 65536,
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
      validate: (v) => typeof v === 'string' && ['development', 'production', 'test'].includes(v),
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
      validate: (v) => typeof v === 'number' && v > 0,
    },
    tournamentTtl: {
      env: 'REDIS_TOURNAMENT_TTL',
      default: 10800,
      type: 'number',
      validate: (v) => typeof v === 'number' && v > 0,
    },
    leaderboardTtl: {
      env: 'REDIS_LEADERBOARD_TTL',
      default: 900,
      type: 'number',
      validate: (v) => typeof v === 'number' && v > 0,
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
      validate: (v) => typeof v === 'string' && ['ERROR', 'WARN', 'INFO', 'DEBUG'].includes(v.toUpperCase()),
    },
    format: {
      env: 'LOG_FORMAT',
      default: 'text',
      type: 'string',
      validate: (v) => typeof v === 'string' && ['text', 'json'].includes(v),
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
      validate: (v) => typeof v === 'number' && v > 0,
    },
    windowMs: {
      env: 'RATE_WINDOW_MS',
      default: 10000,
      type: 'number',
      validate: (v) => typeof v === 'number' && v > 0,
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
      validate: (v) => typeof v === 'number' && v >= 100,
    },
  },
};

// ==========================================
// Type Coercion Functions
// ==========================================

function coerceValue(value: string | undefined | null, type: ConfigType): string | number | boolean | object | null {
  if (value === null || value === undefined) {
    return null;
  }

  switch (type) {
    case 'number': {
      const num = parseInt(value, 10);
      return isNaN(num) ? null : num;
    }
    case 'boolean':
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

function isConfigEntry(value: ConfigEntry | ConfigGroup): value is ConfigEntry {
  return 'env' in value;
}

function loadConfig(schema: ConfigGroup, path: string = ''): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const [key, value] of Object.entries(schema)) {
    const fullPath = path ? `${path}.${key}` : key;

    // Check if this is a nested config group or a config entry
    if (!isConfigEntry(value)) {
      // Nested group
      config[key] = loadConfig(value as ConfigGroup, fullPath);
    } else {
      // Config entry
      const entry = value as ConfigEntry;
      const rawValue = process.env[entry.env];
      let finalValue: unknown;

      if (rawValue !== undefined && rawValue !== '') {
        finalValue = coerceValue(rawValue, entry.type);

        if (finalValue === null && entry.type !== 'string') {
          errors.push(`${fullPath}: Invalid ${entry.type} value for ${entry.env}="${rawValue}"`);
          finalValue = entry.default;
        }
      } else {
        finalValue = entry.default;
      }

      // Run validation if provided
      if (entry.validate && finalValue !== null) {
        if (!entry.validate(finalValue)) {
          errors.push(`${fullPath}: Validation failed for ${entry.env}="${finalValue}"`);
        }
      }

      // Check required
      if (entry.required && finalValue === null) {
        errors.push(`${fullPath}: Required environment variable ${entry.env} is not set`);
      }

      config[key] = finalValue;
    }
  }

  // Only log at the top level
  if (!path) {
    if (errors.length > 0) {
      logger.error('CONFIG', 'Configuration validation errors:', errors);
    }
  }

  return config;
}

// ==========================================
// Load and Export Configuration
// ==========================================

const loadedConfig = loadConfig(configSchema) as unknown as Omit<AppConfig, 'isDevelopment' | 'isProduction' | 'isTest' | 'instanceId' | 'isRedisConfigured' | 'isSupabaseConfigured' | 'isAiConfigured'>;

// Add computed properties
const config: AppConfig = {
  ...loadedConfig,
  isDevelopment: loadedConfig.server.nodeEnv === 'development',
  isProduction: loadedConfig.server.nodeEnv === 'production',
  isTest: loadedConfig.server.nodeEnv === 'test',
  instanceId: loadedConfig.instance.railwayReplicaId || loadedConfig.instance.hostname || 'local',
  isRedisConfigured: !!(loadedConfig.redis.url || loadedConfig.redis.host),
  isSupabaseConfigured: !!(loadedConfig.supabase.url && loadedConfig.supabase.anonKey),
  isAiConfigured: !!(loadedConfig.ai.googleCredentialsJson),
} as AppConfig;

/**
 * Validate configuration at startup
 * Call this in server.js to ensure all required config is present
 */
export function validateStartupConfig(): boolean {
  const criticalErrors: string[] = [];

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

interface ConfigSummary {
  server: {
    port: number;
    host: string;
    nodeEnv: string;
    corsOrigin: string;
  };
  redis: {
    configured: boolean;
    host: string;
    prefix: string;
  };
  supabase: {
    configured: boolean;
  };
  ai: {
    configured: boolean;
    location: string;
    model: string;
  };
  logging: {
    level: string;
    format: string;
  };
  rateLimit: RateLimitConfig;
  instanceId: string;
}

/**
 * Get a summary of the current configuration (safe for logging)
 */
export function getConfigSummary(): ConfigSummary {
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

export default config;
export { config };
