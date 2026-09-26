import type { Language } from '@/shared/types/game';
import type { ArenaRoom } from './ArenaRow';

/**
 * The room a join sheet shows. `unlisted`: a code nobody lists (a private
 * room, one made seconds ago, or a typo) — nothing about it is known yet.
 */
export type JoinTarget = ArenaRoom & { unlisted?: boolean };

const sameCode = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase();

/**
 * The ticket for a typed or linked code, before (or without) a listing: the code
 * and nothing else. `language` only seeds a first-time guest's generated name —
 * the sheet never shows it as the room's flag.
 */
export function codeTicket(code: string, nameLanguage: Language): JoinTarget {
  return {
    gameCode: code.trim().toUpperCase(),
    roomName: '',
    playerCount: 0,
    language: nameLanguage,
    gameState: 'waiting',
    isRanked: false,
    createdAt: 0,
    unlisted: true,
  };
}

/**
 * What the join sheet shows, resolved at RENDER time from the live listing — for
 * a typed code, a room card and an invite link alike (pitfall class 3). Seats
 * that fill while the sheet is open, and a listing that arrives after it opened,
 * both show; a room that left the listing keeps the snapshot it was opened with.
 */
export function resolveJoinTarget(selected: JoinTarget | null, rooms: readonly ArenaRoom[]): JoinTarget | null {
  if (!selected) return null;
  return rooms.find((r) => sameCode(r.gameCode, selected.gameCode)) ?? selected;
}
