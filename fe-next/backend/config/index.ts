/**
 * Centralized Configuration Module
 *
 * Single source of truth for all environment variables and configuration.
 * Provides type coercion, defaults, and validation.
 *
 * Usage:
 *   const config = require('./config');
 *   console.log(config.server.port);
 *   console.log(config.rateLimit.maxMessages);
 */

// ==========================================
// Type Definitions
// ==========================================

interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: string;
  isDev: boolean;
  isProd: boolean;
  isTest: boolean;
}

interface CorsConfig {
  origin: string;
  origins: string[];
}

interface RateLimitConfig {
  maxMessages: number;
  windowMs: number;
  ipMaxMessages: number;
  blockDurationMs: number;
  weightSubmitWord: number;
}

interface RedisConfig {
  url: string | null;
  prefix: string;
  version: string;
  gameTtl: number;
  tournamentTtl: number;
  leaderboardTtl: number;
  enabled: boolean;
}

interface SupabaseConfig {
  url: string | null;
  anonKey: string | null;
  serviceKey: string | null;
  enabled: boolean;
}

interface GameConfig {
  timeUpdateIntervalMs: number;
  leaderboardThrottleMs: number;
  defaultTimerSeconds: number;
  minTimerSeconds: number;
  maxTimerSeconds: number;
  defaultMinWordLength: number;
  maxWordLength: number;
  maxPlayersPerRoom: number;
  hostReconnectionGraceMs: number;
  staleGameTimeoutMs: number;
}

interface AiConfig {
  enabled: boolean;
  maxWordsPerGame: number;
  confidenceThreshold: number;
}

interface PresenceConfig {
  heartbeatIntervalMs: number;
  idleTimeoutMs: number;
  afkTimeoutMs: number;
  disconnectTimeoutMs: number;
}

interface LoggingConfig {
  level: string;
  enabled: boolean;
  colorized: boolean;
}

interface FeaturesConfig {
  tournaments: boolean;
  bots: boolean;
  rankedMode: boolean;
  peerValidation: boolean;
  communityWords: boolean;
}

interface Config {
  server: ServerConfig;
  cors: CorsConfig;
  rateLimit: RateLimitConfig;
  redis: RedisConfig;
  supabase: SupabaseConfig;
  game: GameConfig;
  ai: AiConfig;
  presence: PresenceConfig;
  logging: LoggingConfig;
  features: FeaturesConfig;
}

interface ConfigSummary {
  server: {
    port: number;
    host: string;
    nodeEnv: string;
  };
  redis: {
    enabled: boolean;
    prefix: string;
  };
  supabase: {
    enabled: boolean;
  };
  rateLimit: {
    maxMessages: number;
    windowMs: number;
  };
  features: FeaturesConfig;
}

interface ConfigHelpers {
  getInt: (key: string, defaultValue: number) => number;
  getBool: (key: string, defaultValue: boolean) => boolean;
  getString: (key: string, defaultValue: string) => string;
  getRequiredString: (key: string) => string;
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Parse an integer from environment variable with default
 * @param key - Environment variable name
 * @param defaultValue - Default value if not set or invalid
 * @returns The parsed integer or default value
 */
function getInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse a boolean from environment variable with default
 * @param key - Environment variable name
 * @param defaultValue - Default value if not set
 * @returns The parsed boolean or default value
 */
function getBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get a string from environment variable with default
 * @param key - Environment variable name
 * @param defaultValue - Default value if not set
 * @returns The environment variable value or default value
 */
function getString(key: string, defaultValue: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  return value;
}

/**
 * Get a required string (throws if not set)
 * @param key - Environment variable name
 * @returns The environment variable value
 * @throws Error if the environment variable is not set
 */
function getRequiredString(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

// ==========================================
// Configuration Object
// ==========================================

const config: Config = {
  // Server Configuration
  server: {
    port: getInt('PORT', 3001),
    host: getString('HOST', '0.0.0.0'),
    nodeEnv: getString('NODE_ENV', 'development'),
    isDev: getString('NODE_ENV', 'development') !== 'production',
    isProd: getString('NODE_ENV', 'development') === 'production',
    isTest: getString('NODE_ENV', 'development') === 'test',
  },

  // CORS Configuration
  cors: {
    origin: getString('CORS_ORIGIN', '*'),
    // Parse comma-separated origins for production
    origins: getString('CORS_ORIGIN', '*').split(',').map(o => o.trim()),
  },

  // Rate Limiting
  rateLimit: {
    maxMessages: getInt('RATE_MAX_MESSAGES', 150),
    windowMs: getInt('RATE_WINDOW_MS', 10000),
    ipMaxMessages: getInt('RATE_IP_MAX_MESSAGES', 500),
    blockDurationMs: getInt('RATE_BLOCK_DURATION_MS', 60000),
    weightSubmitWord: getInt('RATE_WEIGHT_SUBMITWORD', 1),
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || null,
    prefix: getString('REDIS_PREFIX', 'lexiclash'),
    version: 'v1',
    gameTtl: getInt('REDIS_GAME_TTL', 3600),
    tournamentTtl: getInt('REDIS_TOURNAMENT_TTL', 10800),
    leaderboardTtl: getInt('REDIS_LEADERBOARD_TTL', 900),
    enabled: !!process.env.REDIS_URL,
  },

  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
    enabled: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  },

  // Game Configuration
  game: {
    timeUpdateIntervalMs: getInt('TIME_UPDATE_INTERVAL_MS', 1000),
    leaderboardThrottleMs: getInt('LEADERBOARD_THROTTLE_MS', 500),
    defaultTimerSeconds: getInt('DEFAULT_TIMER_SECONDS', 180),
    minTimerSeconds: 30,
    maxTimerSeconds: 600,
    defaultMinWordLength: 2,
    maxWordLength: 50,
    maxPlayersPerRoom: getInt('MAX_PLAYERS_PER_ROOM', 20),
    hostReconnectionGraceMs: getInt('HOST_RECONNECTION_GRACE_MS', 30000),
    staleGameTimeoutMs: getInt('STALE_GAME_TIMEOUT_MS', 30 * 60 * 1000),
  },

  // AI Validation Configuration
  ai: {
    enabled: getBool('AI_SERVICE_ENABLED', true),
    maxWordsPerGame: getInt('AI_MAX_WORDS_PER_GAME', 50),
    confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.7'),
  },

  // Presence Configuration
  presence: {
    heartbeatIntervalMs: getInt('HEARTBEAT_INTERVAL_MS', 5000),
    idleTimeoutMs: getInt('IDLE_TIMEOUT_MS', 30000),
    afkTimeoutMs: getInt('AFK_TIMEOUT_MS', 120000),
    disconnectTimeoutMs: getInt('DISCONNECT_TIMEOUT_MS', 60000),
  },

  // Logging Configuration
  logging: {
    level: getString('LOG_LEVEL', 'info'),
    enabled: getBool('LOGGING_ENABLED', true),
    colorized: getBool('LOG_COLORIZED', true),
  },

  // Feature Flags
  features: {
    tournaments: getBool('FEATURE_TOURNAMENTS', true),
    bots: getBool('FEATURE_BOTS', true),
    rankedMode: getBool('FEATURE_RANKED_MODE', true),
    peerValidation: getBool('FEATURE_PEER_VALIDATION', true),
    communityWords: getBool('FEATURE_COMMUNITY_WORDS', true),
  },
};

// ==========================================
// Validation
// ==========================================

/**
 * Validate critical configuration on startup
 * @throws Error if critical configuration is invalid
 */
function validateConfig(): void {
  const errors: string[] = [];

  // In production, CORS_ORIGIN=* is not allowed
  if (config.server.isProd && config.cors.origin === '*') {
    errors.push('CORS_ORIGIN=* is not allowed in production');
  }

  // Warn if Redis is not configured in production
  if (config.server.isProd && !config.redis.enabled) {
    console.warn('[CONFIG] Warning: Redis is not configured. Session recovery will not work.');
  }

  // Warn if Supabase is not configured
  if (!config.supabase.enabled) {
    console.warn('[CONFIG] Warning: Supabase is not configured. Profiles and leaderboards will not persist.');
  }

  if (errors.length > 0) {
    console.error('[CONFIG] Configuration errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    throw new Error('Invalid configuration');
  }
}

/**
 * Get a summary of the current configuration (safe to log)
 * @returns Configuration summary without sensitive values
 */
function getConfigSummary(): ConfigSummary {
  return {
    server: {
      port: config.server.port,
      host: config.server.host,
      nodeEnv: config.server.nodeEnv,
    },
    redis: {
      enabled: config.redis.enabled,
      prefix: config.redis.prefix,
    },
    supabase: {
      enabled: config.supabase.enabled,
    },
    rateLimit: {
      maxMessages: config.rateLimit.maxMessages,
      windowMs: config.rateLimit.windowMs,
    },
    features: config.features,
  };
}

// ==========================================
// Exports
// ==========================================

const helpers: ConfigHelpers = {
  getInt,
  getBool,
  getString,
  getRequiredString,
};

// Named exports for TypeScript compatibility
export { config, validateConfig, getConfigSummary, helpers };
export const { server, cors, rateLimit, redis, supabase, game, ai, presence, logging, features } = config;

// CommonJS exports for backward compatibility
module.exports = {
  ...config,
  validateConfig,
  getConfigSummary,
  // Re-export helpers for custom config needs
  helpers,
};
