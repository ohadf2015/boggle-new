import { getCacheClient } from '@/backend/cache/redisCache';
import logger from '@/utils/logger';
import { classroomGameKey } from './classroomGameLookup';

/**
 * Is this classroom playing right now, and under which game code?
 *
 * The mirror of `lookupLiveClassroomGame`, which maps a GAME code to its
 * classroom. Two systems mint six-character codes into the same field — the
 * permanent `classrooms.join_code` on the handout, and the live game code on
 * the projector — and only one of them ever led to the game. The 2026-09-04 fix
 * taught the join route to resolve a projector code; the roster code, which is
 * the one a teacher posts in Google Classroom, still enrolled the student and
 * dropped them on `/student` with a success toast while their class played on.
 * This is the other half of that fix.
 *
 * Reads `classroom_games:<classroomId>` — the set `classroomGameManager` writes
 * on create (`sadd`, :135) and clears on end (`srem`, :226/:337). Keyed here
 * rather than imported from that module for the reason its sibling documents:
 * its Node-ESM `.js` specifiers resolve under `tsx` and not under webpack, so
 * importing it from an API route breaks `next build` and nothing earlier.
 *
 * Never throws. A join that would otherwise succeed must not be blocked by this
 * lookup — the caller falls through to enrolling the student, which is exactly
 * what it did before this function existed.
 */
export async function lookupLiveGameForClassroom(classroomId: string): Promise<string | null> {
  try {
    const redis = getCacheClient();
    if (!redis) return null;

    const gameCodes: string[] = await redis.smembers(`classroom_games:${classroomId}`);
    if (!gameCodes?.length) return null;

    // ponytail: no `srem` of the dead entries, unlike `getActiveClassroomGames`.
    // That read prunes because the student banner polls it every 15s and shows
    // `games[0]`; here a stale entry only costs one extra GET on one join. The
    // banner's own poll still does the pruning. Prune here too if this ever
    // runs somewhere the banner does not.
    let best: { gameCode: string; createdAt: string } | null = null;

    for (const gameCode of gameCodes) {
      const raw = await redis.get(classroomGameKey(gameCode));
      if (!raw) continue; // expired key still listed in the set

      const game = JSON.parse(raw) as { classroomId?: string; status?: string; endedAt?: string; createdAt?: string };
      if (game?.classroomId !== classroomId) continue;
      // The session rule, as `lookupLiveClassroomGame` states it: `endedAt`, not
      // `status: 'finished'` — a finished ROUND is still a live game whose
      // teacher has not pressed "next round" yet.
      if (game.status === 'ended' || game.endedAt) continue;

      const createdAt = game.createdAt ?? '';
      // A Redis set has no order. Newest wins: a teacher who relaunched without
      // ending the first game would otherwise send the class to a coin flip.
      if (!best || createdAt > best.createdAt) best = { gameCode, createdAt };
    }

    return best?.gameCode ?? null;
  } catch (err) {
    logger.error('lookupLiveGameForClassroom failed:', err);
    return null;
  }
}
