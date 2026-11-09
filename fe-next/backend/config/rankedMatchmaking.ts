/**
 * Ranked matchmaking readiness gate.
 *
 * In-memory MatchmakingQueue cannot span Socket.IO Redis-adapter replicas
 * (see server/redisAdapter.ts). Until a shared queue exists, public ranked
 * matchmaking stays OFF unless operators explicitly set
 * RANKED_MATCHMAKING_ENABLED=true on every instance that should accept joins.
 *
 * Client PostHog flag `ranked-public-v1` defaults to off separately — both
 * must be on before players can queue. Progress/league/MMR UI does not use
 * this gate.
 */

export const RANKED_MATCH_TICKET_TTL_MS = 90_000;

export interface RankedMatchTicket {
  roomId: string;
  role: 'host' | 'joiner';
  playerId: string;
  opponentId: string;
  expiresAt: number;
}

/** Explicit opt-in. Missing / any value other than "true" → disabled. */
export function isRankedMatchmakingEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.RANKED_MATCHMAKING_ENABLED === 'true';
}

export function isRankedMatchTicketValid(
  ticket: RankedMatchTicket | null | undefined,
  {
    roomId,
    role,
    playerId,
    now = Date.now(),
  }: {
    roomId: string;
    role: 'host' | 'joiner';
    playerId: string;
    now?: number;
  },
): boolean {
  if (!ticket) return false;
  if (ticket.roomId !== roomId) return false;
  if (ticket.role !== role) return false;
  if (ticket.playerId !== playerId) return false;
  if (now > ticket.expiresAt) return false;
  return true;
}

export function buildRankedMatchTicket(args: {
  roomId: string;
  role: 'host' | 'joiner';
  playerId: string;
  opponentId: string;
  now?: number;
}): RankedMatchTicket {
  const now = args.now ?? Date.now();
  return {
    roomId: args.roomId,
    role: args.role,
    playerId: args.playerId,
    opponentId: args.opponentId,
    expiresAt: now + RANKED_MATCH_TICKET_TTL_MS,
  };
}
