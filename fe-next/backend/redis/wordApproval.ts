// wordApproval.ts - Word approval tracking with atomic operations

import { circuitBreaker } from './circuitBreaker';
import { MAX_SCAN_ITERATIONS, MAX_WORD_APPROVAL_GAME_IDS, PIPELINE_BATCH_SIZE } from './config';
import {
  getRedisClient,
  getWordApprovalScriptSha,
  isRedisAvailable,
  loadLuaScripts,
} from './connection';
import { KEY_PATTERNS, KEYS } from './keys';
import type { WordApprovalData } from './types';

import logger from '../utils/logger';

export async function getWordApprovalStatus(
  word: string,
  language: string
): Promise<WordApprovalData | null> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return null;
  }

  try {
    const key = KEYS.wordApproval(language, word);
    const client = getRedisClient()!;
    const data = await circuitBreaker.execute(() => client.get(key));
    return data ? JSON.parse(data) : null;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting word approval status: ${err.message}`);
    return null;
  }
}

export async function incrementWordApproval(
  word: string,
  language: string,
  gameId: string
): Promise<WordApprovalData | null> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return null;
  }

  const key = KEYS.wordApproval(language, word);
  const now = new Date().toISOString();
  const client = getRedisClient()!;
  const scriptSha = getWordApprovalScriptSha();

  // Try Lua script first (atomic)
  if (scriptSha) {
    try {
      const result = await circuitBreaker.execute(() =>
        client.evalsha(scriptSha, 1, key, gameId, now, MAX_WORD_APPROVAL_GAME_IDS.toString())
      );
      return JSON.parse(result as string);
    } catch (error: unknown) {
      const err = error as Error;
      // If script not found (NOSCRIPT), reload and retry once
      if (err.message.includes('NOSCRIPT')) {
        logger.debug('REDIS', 'Word approval script not found, reloading...');
        await loadLuaScripts();
        // Retry with reloaded script
        const newSha = getWordApprovalScriptSha();
        if (newSha) {
          try {
            const retryResult = await circuitBreaker.execute(() =>
              client.evalsha(newSha, 1, key, gameId, now, MAX_WORD_APPROVAL_GAME_IDS.toString())
            );
            return JSON.parse(retryResult as string);
          } catch (retryError) {
            logger.warn('REDIS', `Lua script retry failed, falling back to WATCH/MULTI`);
          }
        }
      } else {
        logger.warn('REDIS', `Lua script failed, falling back to WATCH/MULTI: ${err.message}`);
      }
    }
  }

  // Fallback to WATCH/MULTI for atomic operation
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await client.watch(key);

      const existing = await client.get(key);
      let approvalData: WordApprovalData;

      if (existing) {
        approvalData = JSON.parse(existing);
        if (approvalData.gameIds.includes(gameId)) {
          await client.unwatch();
          return approvalData;
        }
        approvalData.gameIds.push(gameId);

        // Cap the array to prevent unbounded growth (keep most recent entries)
        while (approvalData.gameIds.length > MAX_WORD_APPROVAL_GAME_IDS) {
          approvalData.gameIds.shift();
        }

        approvalData.approvalCount = approvalData.gameIds.length;
        approvalData.lastApproved = now;
      } else {
        approvalData = {
          approvalCount: 1,
          gameIds: [gameId],
          firstApproved: now,
          lastApproved: now,
        };
      }

      const result = await client
        .multi()
        .set(key, JSON.stringify(approvalData))
        .exec();

      if (result === null) {
        await new Promise(resolve => setTimeout(resolve, 10 * Math.pow(2, attempt)));
        continue;
      }

      return approvalData;
    } catch (error: unknown) {
      const err = error as Error;
      await client.unwatch();
      logger.error('REDIS', `Error incrementing word approval: ${err.message}`);
      if (attempt === maxRetries - 1) {
        return null;
      }
    }
  }

  return null;
}

export async function getApprovedWords(
  language: string,
  minApprovals: number = 2
): Promise<string[]> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return [];
  }

  try {
    const approvedWords: string[] = [];
    let cursor = '0';
    let iterations = 0;
    const client = getRedisClient()!;

    do {
      if (iterations++ > MAX_SCAN_ITERATIONS) {
        logger.warn('REDIS', 'SCAN exceeded max iterations for approved words');
        break;
      }

      const result = await circuitBreaker.execute(() =>
        client.scan(cursor, 'MATCH', KEY_PATTERNS.wordApprovals(language), 'COUNT', PIPELINE_BATCH_SIZE)
      );
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        for (let i = 0; i < keys.length; i += PIPELINE_BATCH_SIZE) {
          const batch = keys.slice(i, i + PIPELINE_BATCH_SIZE);
          const pipeline = client.pipeline();

          batch.forEach((key: string) => pipeline.get(key));

          const results = await pipeline.exec();
          if (results) {
            results.forEach((pipelineResult, idx: number) => {
              const [err, data] = pipelineResult as [Error | null, string | null];
              if (err) {
                logger.error('REDIS', `Pipeline error for key ${batch[idx]}: ${err.message}`);
                return;
              }
              if (data) {
                try {
                  const approvalData = JSON.parse(data) as WordApprovalData;
                  if (approvalData.approvalCount >= minApprovals) {
                    const parts = batch[idx].split(':');
                    if (parts.length >= 5) {
                      approvedWords.push(parts[parts.length - 1]);
                    }
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            });
          }
        }
      }
    } while (cursor !== '0');

    return approvedWords;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting approved words: ${err.message}`);
    return [];
  }
}
