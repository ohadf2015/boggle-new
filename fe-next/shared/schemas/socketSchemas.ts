/**
 * Zod Schemas for Socket Event Validation
 * Provides runtime type safety for socket events
 */

import { z } from 'zod';

// ==================== Common Schemas ====================

export const GameCodeSchema = z.string().length(4).regex(/^[A-Z0-9]+$/);

export const UsernameSchema = z.string()
  .min(1)
  .max(20)
  .regex(/^[a-zA-Z0-9_\-\u0590-\u05FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/);

export const AvatarSchema = z.object({
  emoji: z.string().max(10),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  profilePictureUrl: z.string().url().nullable().optional(),
});

export const LanguageSchema = z.enum(['he', 'en', 'sv', 'ja', 'es', 'fr', 'de']);

export const GridPositionSchema = z.object({
  row: z.number().int().min(0).max(10),
  col: z.number().int().min(0).max(10),
  letter: z.string().optional(),
});

// ==================== Client → Server Event Schemas ====================

export const CreateGameSchema = z.object({
  gameCode: GameCodeSchema,
  roomName: z.string().max(50).optional(),
  language: LanguageSchema.optional().default('en'),
  hostUsername: UsernameSchema,
  playerId: z.string().max(64).optional().nullable(),
  avatar: AvatarSchema.optional(),
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: z.string().max(128).optional().nullable(),
  isRanked: z.boolean().optional().default(false),
  profilePictureUrl: z.string().url().optional().nullable(),
});

export const JoinGameSchema = z.object({
  gameCode: GameCodeSchema,
  username: UsernameSchema,
  playerId: z.string().max(64).optional().nullable(),
  avatar: AvatarSchema.optional(),
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: z.string().max(128).optional().nullable(),
  profilePictureUrl: z.string().url().optional().nullable(),
});

export const LeaveRoomSchema = z.object({
  gameCode: GameCodeSchema,
  username: UsernameSchema,
});

export const SubmitWordSchema = z.object({
  gameCode: GameCodeSchema,
  username: UsernameSchema,
  word: z.string().min(1).max(50),
  path: z.array(GridPositionSchema).optional(),
});

export const SubmitWordVoteSchema = z.object({
  gameCode: GameCodeSchema,
  word: z.string().min(1).max(50),
  isValid: z.boolean(),
  language: LanguageSchema,
});

export const ChatMessageSchema = z.object({
  gameCode: GameCodeSchema,
  username: UsernameSchema,
  message: z.string().min(1).max(500),
});

export const AddBotSchema = z.object({
  gameCode: GameCodeSchema,
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
});

export const RemoveBotSchema = z.object({
  gameCode: GameCodeSchema,
  botUsername: UsernameSchema,
});

export const StartGameSchema = z.object({
  gameCode: GameCodeSchema,
  letterGrid: z.array(z.array(z.string())),
  timerSeconds: z.number().int().min(30).max(600).optional().default(180),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional().default('MEDIUM'),
  minWordLength: z.number().int().min(2).max(5).optional().default(3),
});

export const StartGameAckSchema = z.object({
  messageId: z.string(),
});

export const HeartbeatSchema = z.object({
  gameCode: GameCodeSchema.optional(),
  username: UsernameSchema.optional(),
  timestamp: z.number().optional(),
});

export const PresenceUpdateSchema = z.object({
  gameCode: GameCodeSchema,
  username: UsernameSchema,
  isWindowFocused: z.boolean(),
  lastActivityAt: z.number().optional(),
});

export const KickPlayerSchema = z.object({
  gameCode: GameCodeSchema,
  username: UsernameSchema,
});

export const TransferHostSchema = z.object({
  gameCode: GameCodeSchema,
  newHostUsername: UsernameSchema,
});

export const CreateTournamentSchema = z.object({
  gameCode: GameCodeSchema,
  name: z.string().min(1).max(50),
  totalRounds: z.number().int().min(1).max(10).default(3),
  settings: z.object({
    timerSeconds: z.number().int().min(30).max(600).optional(),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
    minWordLength: z.number().int().min(2).max(5).optional(),
  }).optional(),
});

export const GetWordsForBoardSchema = z.object({
  language: LanguageSchema,
  boardSize: z.object({
    rows: z.number().int().min(3).max(10),
    cols: z.number().int().min(3).max(10),
  }).optional(),
});

// ==================== Schema Map for Validation ====================

export const ClientEventSchemas = {
  createGame: CreateGameSchema,
  join: JoinGameSchema,
  leaveRoom: LeaveRoomSchema,
  submitWord: SubmitWordSchema,
  submitWordVote: SubmitWordVoteSchema,
  sendChatMessage: ChatMessageSchema,
  addBot: AddBotSchema,
  removeBot: RemoveBotSchema,
  startGame: StartGameSchema,
  startGameAck: StartGameAckSchema,
  heartbeat: HeartbeatSchema,
  presenceUpdate: PresenceUpdateSchema,
  kickPlayer: KickPlayerSchema,
  transferHost: TransferHostSchema,
  createTournament: CreateTournamentSchema,
  getWordsForBoard: GetWordsForBoardSchema,
} as const;

// ==================== Validation Helper ====================

type ClientEventName = keyof typeof ClientEventSchemas;

/**
 * Validates socket event data against its schema
 * @param event - The event name
 * @param data - The event data to validate
 * @returns Validated data, or throws ZodError
 */
export function validateSocketEvent(event: ClientEventName, data: unknown): unknown {
  const schema = ClientEventSchemas[event];
  if (!schema) {
    throw new Error(`No schema defined for event: ${event}`);
  }
  return schema.parse(data);
}

/**
 * Safe validation that returns a result object instead of throwing
 */
export function safeValidateSocketEvent(
  event: ClientEventName,
  data: unknown
): { success: true; data: unknown } | { success: false; error: z.ZodError } {
  const schema = ClientEventSchemas[event];
  if (!schema) {
    return {
      success: false,
      error: new z.ZodError([{
        code: 'custom',
        path: [],
        message: `No schema defined for event: ${event}`,
      }]),
    };
  }
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// Export types for validated data
export type CreateGameData = z.infer<typeof CreateGameSchema>;
export type JoinGameData = z.infer<typeof JoinGameSchema>;
export type SubmitWordData = z.infer<typeof SubmitWordSchema>;
export type ChatMessageData = z.infer<typeof ChatMessageSchema>;
export type StartGameData = z.infer<typeof StartGameSchema>;
