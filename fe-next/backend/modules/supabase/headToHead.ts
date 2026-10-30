import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, type PlayerScore, type UserAuthInfo } from './client';
import logger from '../../utils/logger';

export const H2H_MAX_PLAYERS = 8;
export const H2H_WRITE_TIMEOUT_MS = 1500;

export interface H2hPlayer {
  authUserId: string;
  score: number;
}

export interface H2hPairRow {
  player1_id: string;
  player2_id: string;
  player1_wins: number;
  player2_wins: number;
  draws: number;
  player1_score: number;
  player2_score: number;
}

export type H2hOutcome = 'written' | 'skipped' | 'timeout' | 'error';

export function buildHeadToHeadPairs(players: H2hPlayer[]): H2hPairRow[] {
  const best = new Map<string, number>();
  for (const p of players) {
    if (!p.authUserId) continue;
    best.set(p.authUserId, Math.max(best.get(p.authUserId) ?? -Infinity, p.score || 0));
  }
  const top = [...best.entries()].sort((a, b) => b[1] - a[1]).slice(0, H2H_MAX_PLAYERS);
  const pairs: H2hPairRow[] = [];
  for (let i = 0; i < top.length; i++) {
    for (let j = i + 1; j < top.length; j++) {
      const [[id1, s1], [id2, s2]] = top[i][0] < top[j][0] ? [top[i], top[j]] : [top[j], top[i]];
      pairs.push({
        player1_id: id1,
        player2_id: id2,
        player1_wins: s1 > s2 ? 1 : 0,
        player2_wins: s2 > s1 ? 1 : 0,
        draws: s1 === s2 ? 1 : 0,
        player1_score: s1,
        player2_score: s2,
      });
    }
  }
  return pairs;
}

async function defaultIsClassroomRoom(gameCode: string): Promise<boolean | null> {
  const { getGameAsync } = await import('../gameStateManager');
  const game = (await getGameAsync(gameCode)) as { isClassroom?: boolean } | null;
  if (!game) return null;
  if (game.isClassroom) return true;
  const { getClassroomGame } = await import('../classroomGameManager');
  return !!(await getClassroomGame(gameCode));
}

interface Deps {
  client?: SupabaseClient | null;
  isClassroomRoom?: (gameCode: string) => Promise<boolean | null>;
}

function skip(gameCode: string, reason: string): H2hOutcome {
  // Call through `logger`: a detached `logger.warn` loses `this` and throws
  // "reading 'pino'", which turned every skip into an h2h_write error.
  const line = `h2h_write game=${gameCode} outcome=skipped reason=${reason}`;
  if (reason === 'room_unknown') logger.warn('H2H', line);
  else logger.info('H2H', line);
  return 'skipped';
}

/** Never rejects; the caller fires and forgets. */
export async function recordHeadToHead(
  gameCode: string,
  scores: PlayerScore[],
  authMap: Record<string, UserAuthInfo>,
  deps: Deps = {}
): Promise<H2hOutcome> {
  const started = Date.now();
  try {
    const client = 'client' in deps ? deps.client : getSupabase();
    if (!client) return skip(gameCode, 'no_client');

    const players = scores
      .map((s) => ({ authUserId: authMap[s.username]?.authUserId ?? '', score: s.score || 0 }))
      .filter((p) => p.authUserId);
    if (new Set(players.map((p) => p.authUserId)).size < 2) return skip(gameCode, 'fewer_than_2_humans');

    const classroom = await (deps.isClassroomRoom ?? defaultIsClassroomRoom)(gameCode);
    if (classroom !== false) return skip(gameCode, classroom ? 'classroom' : 'room_unknown');

    const pairs = buildHeadToHeadPairs(players);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), H2H_WRITE_TIMEOUT_MS);
    });
    const write = Promise.resolve(client.rpc('record_head_to_head_results', { p_pairs: pairs }));
    const result = await Promise.race([write, timeout]).finally(() => clearTimeout(timer));

    if (result === 'timeout') {
      logger.warn('H2H', `h2h_write game=${gameCode} outcome=timeout pairs=${pairs.length} after ${H2H_WRITE_TIMEOUT_MS}ms, outcome unknown`);
      return 'timeout';
    }
    if (result.error) {
      logger.error('H2H', `h2h_write game=${gameCode} outcome=error pairs=${pairs.length}: ${result.error.message}`);
      return 'error';
    }
    logger.info('H2H', `h2h_write game=${gameCode} outcome=written pairs=${pairs.length} rows=${result.data ?? '?'} ms=${Date.now() - started}`);
    return 'written';
  } catch (err) {
    logger.error('H2H', `h2h_write game=${gameCode} outcome=error: ${(err as Error)?.message ?? String(err)}`);
    return 'error';
  }
}
