// connection.ts - Redis connection management and health monitoring

import Redis, { type Redis as RedisClient } from 'ioredis';

import { circuitBreaker } from './circuitBreaker';
import {
  baseRedisConfig,
  formatBytes,
  HEALTH_CHECK_INTERVAL,
  MEMORY_WARNING_THRESHOLD,
} from './config';
import type { RedisHealth, RedisMetrics } from './types';

import logger from '../utils/logger';

// State Management
let _redisClient: RedisClient | null = null;
let _rateLimitClient: RedisClient | null = null; // Dedicated connection for rate limiting
let _isRedisAvailable = false;
let _errorReported = false; // Prevent repeated error events to Sentry
let lastHealthCheck = Date.now();
let healthCheckInterval: NodeJS.Timeout | null = null;
let memoryCheckInterval: NodeJS.Timeout | null = null;

// Lua script SHA for atomic word approval
let wordApprovalScriptSha: string | null = null;

// Lua script for atomic word approval increment
// ARGV[3] = maxGameIds (cap to prevent unbounded growth)
const WORD_APPROVAL_SCRIPT = `
local key = KEYS[1]
local gameId = ARGV[1]
local now = ARGV[2]
local maxGameIds = tonumber(ARGV[3]) or 50

local data = redis.call('GET', key)
local approvalData

if data then
  approvalData = cjson.decode(data)
  -- Check if gameId already exists
  for i, id in ipairs(approvalData.gameIds) do
    if id == gameId then
      return data -- No change needed, return existing data
    end
  end
  table.insert(approvalData.gameIds, gameId)

  -- Cap the array to prevent unbounded growth (keep most recent entries)
  while #approvalData.gameIds > maxGameIds do
    table.remove(approvalData.gameIds, 1)
  end

  approvalData.approvalCount = #approvalData.gameIds
  approvalData.lastApproved = now
else
  approvalData = {
    approvalCount = 1,
    gameIds = {gameId},
    firstApproved = now,
    lastApproved = now
  }
end

local encoded = cjson.encode(approvalData)
redis.call('SET', key, encoded)
redis.call('EXPIRE', key, 604800) -- 7 day TTL to prevent unbounded growth
return encoded
`;

function getRetryStrategy(times: number): number | null {
  if (times > 10) {
    logger.error('REDIS', 'Max reconnection attempts reached');
    return null;
  }
  const delay = Math.min(times * 50, 2000);
  logger.debug('REDIS', `Reconnecting in ${delay}ms (attempt ${times})`);
  return delay;
}

async function loadLuaScripts(): Promise<void> {
  if (!_isRedisAvailable || !_redisClient) return;

  try {
    wordApprovalScriptSha = await _redisClient.script('LOAD', WORD_APPROVAL_SCRIPT) as string;
    logger.debug('REDIS', 'Loaded Lua scripts successfully');
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Failed to load Lua scripts: ${err.message}`);
  }
}

function startHealthMonitoring(): void {
  healthCheckInterval = setInterval(async () => {
    await healthCheck();
  }, HEALTH_CHECK_INTERVAL);
  healthCheckInterval.unref();

  memoryCheckInterval = setInterval(async () => {
    await checkRedisMemory();
  }, 60000);
  memoryCheckInterval.unref();
}

export async function healthCheck(): Promise<boolean> {
  if (!_redisClient) return false;

  try {
    const start = Date.now();
    await _redisClient.ping();
    const latency = Date.now() - start;

    if (latency > 100) {
      // Transient network jitter — dev-only signal, never page Sentry for a single slow ping.
      // Persistent degradation is caught by the connection-failure path below.
      logger.debug('REDIS', `High latency: ${latency}ms`);
    }

    lastHealthCheck = Date.now();
    _isRedisAvailable = true;
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    // Only log as error on state transition (available → unavailable)
    // to avoid flooding Sentry with repeated alerts every 30s
    if (_isRedisAvailable) {
      logger.error('REDIS', `Health check failed: ${err.message}`);
    } else {
      logger.debug('REDIS', `Health check still failing: ${err.message}`);
    }
    _isRedisAvailable = false;
    return false;
  }
}

async function checkRedisMemory(): Promise<void> {
  if (!_isRedisAvailable || !_redisClient) return;

  try {
    const info = await _redisClient.info('memory');
    const usedMemoryMatch = info.match(/used_memory:(\d+)/);
    const maxMemoryMatch = info.match(/maxmemory:(\d+)/);

    if (usedMemoryMatch && maxMemoryMatch) {
      const usedMemory = parseInt(usedMemoryMatch[1]);
      const maxMemory = parseInt(maxMemoryMatch[1]);

      if (maxMemory > 0) {
        const usagePercent = (usedMemory / maxMemory) * 100;
        if (usagePercent > MEMORY_WARNING_THRESHOLD) {
          logger.warn(
            'REDIS',
            `Memory usage high: ${usagePercent.toFixed(2)}% (${formatBytes(usedMemory)} / ${formatBytes(maxMemory)})`
          );
        }
      }
    }
  } catch {
    // Silently ignore memory check errors
  }
}

export function getRedisHealth(): RedisHealth {
  const timeSinceLastCheck = Date.now() - lastHealthCheck;
  return {
    available: _isRedisAvailable,
    lastCheck: lastHealthCheck,
    stale: timeSinceLastCheck > HEALTH_CHECK_INTERVAL * 2,
    circuitBreaker: circuitBreaker.getState(),
  };
}

export async function getRedisMetrics(): Promise<RedisMetrics> {
  if (!_isRedisAvailable || !_redisClient) {
    return {
      available: false,
      error: 'Redis not available',
    };
  }

  try {
    const info = await _redisClient.info();
    const dbSize = await _redisClient.dbsize();

    const usedMemoryMatch = info.match(/used_memory:(\d+)/);
    const connectedClientsMatch = info.match(/connected_clients:(\d+)/);
    const totalCommandsMatch = info.match(/total_commands_processed:(\d+)/);
    const hitRateMatch = info.match(/keyspace_hits:(\d+)/);
    const missRateMatch = info.match(/keyspace_misses:(\d+)/);

    const hits = parseInt(hitRateMatch?.[1] || '0');
    const misses = parseInt(missRateMatch?.[1] || '0');
    const hitRate = hits + misses > 0 ? (hits / (hits + misses) * 100).toFixed(2) : '0';

    return {
      available: true,
      keyCount: dbSize,
      usedMemory: parseInt(usedMemoryMatch?.[1] || '0'),
      usedMemoryHuman: formatBytes(parseInt(usedMemoryMatch?.[1] || '0')),
      connectedClients: parseInt(connectedClientsMatch?.[1] || '0'),
      totalCommands: parseInt(totalCommandsMatch?.[1] || '0'),
      hitRate: `${hitRate}%`,
      circuitBreaker: circuitBreaker.getState(),
      health: getRedisHealth(),
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      available: false,
      error: err.message,
    };
  }
}

export async function initRedis(): Promise<boolean> {
  try {
    if (process.env.REDIS_URL) {
      logger.info('REDIS', 'Connecting using REDIS_URL');
      _redisClient = new Redis(process.env.REDIS_URL, {
        ...baseRedisConfig,
        retryStrategy: getRetryStrategy,
      });
    } else {
      const host = process.env.REDIS_HOST || process.env.REDISHOST || '127.0.0.1';
      const port = parseInt(process.env.REDIS_PORT || process.env.REDISPORT || '6379');
      const password = process.env.REDIS_PASSWORD || undefined;

      logger.info('REDIS', `Connecting to ${host}:${port}`);
      _redisClient = new Redis({
        ...baseRedisConfig,
        retryStrategy: getRetryStrategy,
        host,
        port,
        password,
      });
    }

    _redisClient.on('connect', () => {
      logger.info('REDIS', 'Connected to Redis server');
      _isRedisAvailable = true;
      _errorReported = false;
    });

    _redisClient.on('ready', async () => {
      logger.info('REDIS', 'Redis client ready');
      _isRedisAvailable = true;
      _errorReported = false;
      await loadLuaScripts();
    });

    _redisClient.on('error', (err: Error) => {
      // Only warn (→ Sentry) on first error or after recovery
      // Subsequent errors during a known-down state use debug to avoid Sentry noise
      if (!_errorReported) {
        logger.warn('REDIS', `Redis error: ${err.message}`);
        _errorReported = true;
      } else {
        logger.debug('REDIS', `Redis error (repeated): ${err.message}`);
      }
      _isRedisAvailable = false;
    });

    _redisClient.on('close', () => {
      logger.debug('REDIS', 'Redis connection closed');
      _isRedisAvailable = false;
    });

    _redisClient.on('reconnecting', (delay: number) => {
      logger.debug('REDIS', `Reconnecting in ${delay}ms`);
    });

    await _redisClient.connect();
    await _redisClient.ping();
    _isRedisAvailable = true;
    logger.info('REDIS', 'Redis connection test successful');

    // Create dedicated rate-limit client to prevent rate-limit queries
    // from blocking game state operations on the main connection.
    try {
      _rateLimitClient = _redisClient.duplicate();
      _rateLimitClient.on('error', (err: Error) => {
        logger.debug('REDIS', `Rate-limit client error: ${err.message}`);
      });
      await _rateLimitClient.connect();
      logger.info('REDIS', 'Dedicated rate-limit Redis client ready');
    } catch (rlErr: unknown) {
      const err = rlErr as Error;
      logger.warn('REDIS', `Rate-limit client failed, sharing main connection: ${err.message}`);
      _rateLimitClient = null; // Falls back to main client
    }

    startHealthMonitoring();

    return true;
  } catch (error: unknown) {
    const err = error as Error;
    logger.warn('REDIS', `Could not connect to Redis: ${err.message}`);
    logger.info('REDIS', 'Application will continue with in-memory storage');
    _isRedisAvailable = false;
    _redisClient = null;
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = null;
  }

  if (_rateLimitClient) {
    try {
      await _rateLimitClient.quit();
      logger.debug('REDIS', 'Rate-limit Redis client closed');
    } catch {
      // Ignore — main client close is the priority
    }
    _rateLimitClient = null;
  }

  if (_redisClient) {
    try {
      await _redisClient.quit();
      logger.info('REDIS', 'Redis connection closed');
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('REDIS', `Error closing connection: ${err.message}`);
    }
    _redisClient = null;
    _isRedisAvailable = false;
  }
}

export function createPubSubClients(): { pubClient: RedisClient; subClient: RedisClient } | null {
  if (!_redisClient) {
    return null;
  }

  try {
    const pubClient = _redisClient.duplicate();
    const subClient = _redisClient.duplicate();

    // Use debug for pub/sub errors since they cascade from the main
    // connection error (already reported via _errorReported flag)
    pubClient.on('error', (err: Error) => {
      logger.debug('REDIS', `Pub client error: ${err.message}`);
    });

    subClient.on('error', (err: Error) => {
      logger.debug('REDIS', `Sub client error: ${err.message}`);
    });

    return { pubClient, subClient };
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Failed to create pub/sub clients: ${err.message}`);
    return null;
  }
}

export function isRedisAvailable(): boolean {
  return _isRedisAvailable;
}

export function getRedisClient(): RedisClient | null {
  return _redisClient;
}

/**
 * Get dedicated rate-limit Redis client.
 * Falls back to main client if dedicated one isn't available.
 * This prevents rate-limit INCR/EXPIRE ops from queuing behind
 * game state HSET/HGET ops on the single main connection.
 */
export function getRateLimitClient(): RedisClient | null {
  return _rateLimitClient || _redisClient;
}

export function getWordApprovalScriptSha(): string | null {
  return wordApprovalScriptSha;
}

export { loadLuaScripts };
