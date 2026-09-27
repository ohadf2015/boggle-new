/**
 * Duel Taunt Handler
 *
 * Async duels are a waiting game: you submit a turn, then nothing happens until
 * the other student opens the app. A taunt is the cheapest possible way to keep
 * that thread alive — a single mascot sticker id relayed into the duel room.
 *
 * Deliberately id-only: there is no free text on the wire, so a classroom
 * teacher has nothing to moderate. Ids are allow-listed here (server side), not
 * trusted from the client.
 */

import type { Namespace } from 'socket.io';
import type { DuelSocket } from './types';
import { z } from 'zod';
import logger from '@/backend/utils/logger';

/** The four stickers the picker offers. Server-side allowlist. */
export const DUEL_TAUNT_STICKERS = ['fire', 'mindblown', 'trophy', 'tears'] as const;

export type DuelTauntSticker = (typeof DUEL_TAUNT_STICKERS)[number];

/** One taunt per socket per this many ms — a sticker spam wall is not fun. */
export const DUEL_TAUNT_COOLDOWN_MS = 3_000;

const tauntSchema = z.object({
  duelId: z.string().uuid('Invalid duel ID'),
  stickerId: z.enum(DUEL_TAUNT_STICKERS),
});

/**
 * Last taunt timestamp per socket id. Bounded by connection count and cleared
 * on disconnect below, so it cannot grow without limit.
 */
const lastTauntAt = new Map<string, number>();

export function clearDuelTauntCooldown(socketId: string): void {
  lastTauntAt.delete(socketId);
}

export function registerTauntHandlers(_namespace: Namespace, socket: DuelSocket): void {
  socket.on('duel:taunt', (data: unknown) => {
    try {
      const validation = tauntSchema.safeParse(data);
      if (!validation.success) {
        socket.emit('duel:error', {
          message: validation.error.issues[0]?.message || 'Invalid taunt',
        });
        return;
      }

      const now = Date.now();
      const previous = lastTauntAt.get(socket.id) ?? 0;
      if (now - previous < DUEL_TAUNT_COOLDOWN_MS) {
        socket.emit('duel:error', { message: 'Taunt cooldown' });
        return;
      }
      lastTauntAt.set(socket.id, now);

      const { duelId, stickerId } = validation.data;

      socket.to(`duel:${duelId}`).emit('duel:taunt-received', {
        duelId,
        fromId: socket.data.userId,
        fromName: socket.data.displayName,
        stickerId,
      });

      logger.info('DUEL', `Taunt ${stickerId} sent in ${duelId} by ${socket.data.userId}`);
    } catch (error) {
      logger.error('DUEL', `Error in duel:taunt: ${(error as Error).message}`);
      socket.emit('duel:error', { message: 'Internal server error' });
    }
  });

  socket.on('disconnect', () => clearDuelTauntCooldown(socket.id));
}
