/**
 * Zod Schemas for Socket Event Validation
 * Single source of truth for both frontend and backend
 *
 * This module provides runtime type safety for all socket events.
 * The backend uses these via the CommonJS bridge at backend/utils/schemas.js
 */

import { z } from 'zod';
import { customAvatarSchema } from '../types/customAvatar';
import { BLAST_COMBO_TYPES } from '../types/blast';

// ==================== Security Configuration ====================

// Allowed domains for profile picture URLs (prevent SSRF attacks)
// SECURITY: Use specific project domain from environment variable when available
const getSupabaseDomains = (): string[] => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const url = new URL(supabaseUrl);
      const domains: string[] = [url.hostname]; // e.g., 'yourproject.supabase.co'

      // Also allow the storage subdomain pattern for direct storage URLs
      // Pattern: [project-ref].supabase.co -> also allow storage.[project-ref].supabase.co
      const projectRef = url.hostname.split('.')[0];
      if (projectRef) {
        domains.push(`${projectRef}.supabase.co`); // Main domain
        // Supabase storage uses pattern like: [project-ref].supabase.co/storage/v1/...
        // The hostname is already the project domain, so we're covered
      }

      return domains;
    }
  } catch {
    // If parsing fails, return empty array
  }
  return [];
};

const supabaseDomains = getSupabaseDomains();

export const ALLOWED_IMAGE_DOMAINS: string[] = [
  'i.imgur.com',
  'cdn.discordapp.com',
  'googleusercontent.com',  // Allows all *.googleusercontent.com (lh3, lh4, lh5, etc.)
  'avatars.githubusercontent.com',
  'cdn.cloudflare.com',
  'res.cloudinary.com',
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
  // SECURITY: Use specific project domains when available, fallback to generic supabase.co
  // Includes both API domain and storage paths (same domain, different paths)
  ...(supabaseDomains.length > 0 ? supabaseDomains : ['supabase.co']),
].filter(Boolean);

// ==================== Base Schemas ====================
// These are the building blocks reused across event schemas

export const LanguageSchema = z.enum(['he', 'en', 'sv', 'ja', 'es', 'fr', 'de']);

export const AvatarSchema = z.object({
  emoji: z.string()
    .min(1)
    .max(10)
    // SECURITY: Prevent emoji bombs and excessive zero-width joiners
    .refine((val) => {
      // Count actual characters (emoji with modifiers can be multiple code points)
      const chars = Array.from(val);
      if (chars.length > 4) return false;
      // Check for excessive zero-width joiners
      const zwjCount = (val.match(/\u200D/g) || []).length;
      return zwjCount <= 3;
    }, 'Invalid emoji format'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  avatarImage: z.string().max(100).regex(/^[a-z0-9_\-\/]+$/i).optional().nullable(),
  customAvatar: customAvatarSchema.optional().nullable(),
});

export const GameCodeSchema = z.string()
  .min(6, 'Game code must be at least 6 characters')
  .max(10, 'Game code must be at most 10 characters')
  .regex(/^[A-Za-z0-9]+$/, 'Game code must be alphanumeric')
  .transform(s => s.toUpperCase());

export const RoomNameSchema = z.string()
  .max(50, 'Room name must be at most 50 characters')
  .regex(/^[a-zA-Z0-9\s._\-\u0590-\u05FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/, 'Room name can only contain letters, numbers, spaces, dots, underscores, and hyphens')
  .transform(s => s.trim())
  .refine((val) => !/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/.test(val), 'Room name contains invalid characters')
  .optional();

export const PlayerIdSchema = z.string()
  .regex(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i, 'Player ID must be a valid UUID v4')
  .optional()
  .nullable();

export const GuestTokenHashSchema = z.string()
  .regex(/^[a-f0-9]{64}$/i, 'Guest token hash must be a valid SHA-256 hash')
  .optional()
  .nullable();

export const UsernameSchema = z.string()
  .min(1, 'Username is required')
  .max(30, 'Username must be at most 30 characters')
  // Latin: a-zA-Z + Latin-1 Supplement/Extended (\u00C0-\u024F) covers Spanish/Swedish/French/German/Nordic accents.
  // Sentry 139/142/138/143: non-ASCII names like "Andr\u00E9s", "Bj\u00F6rn", "Fran\u00E7ois" were rejected.
  .regex(/^[a-zA-Z0-9._\-\u00C0-\u024F\u0590-\u05FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\s]+$/)
  .transform(s => s.trim())
  // SECURITY: Reject control characters, zero-width characters, and BOM
  .refine((val) => !/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/.test(val), 'Username contains invalid characters');

export const WordSchema = z.string()
  .min(1, 'Word is required')
  .max(50, 'Word must be at most 50 characters')
  .transform(s => s.trim());

export const GridPositionSchema = z.object({
  row: z.number().int().min(0).max(10),
  col: z.number().int().min(0).max(10),
  letter: z.string().optional(),
});

export const DifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const BotDifficultySchema = z.enum(['easy', 'medium', 'hard']);

export const PresenceStatusSchema = z.enum(['active', 'idle', 'afk']);

// ==================== Client → Server Event Schemas ====================

/**
 * createGame event payload
 */
export const CreateGameSchema = z.object({
  gameCode: GameCodeSchema,
  roomName: RoomNameSchema,
  language: LanguageSchema.optional().default('en'),
  hostUsername: UsernameSchema.optional(),
  playerId: PlayerIdSchema,
  avatar: AvatarSchema.optional(),
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: GuestTokenHashSchema,
  isRanked: z.boolean().optional().default(false),
  isPrivate: z.boolean().optional().default(false),
  // Audit T4 (2026-05-10): when true, host disconnect must NOT auto-promote a
  // student/player. Goes straight to grace period so the teacher can reclaim
  // host. Set by the multiplayer client when ?classroom=true URL param is on.
  isClassroom: z.boolean().optional().default(false),
});

/**
 * join event payload
 */
export const JoinGameSchema = z.object({
  gameCode: GameCodeSchema,
  username: UsernameSchema,
  playerId: PlayerIdSchema,
  avatar: AvatarSchema.optional(),
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: GuestTokenHashSchema,
});

/**
 * leaveRoom event payload
 */
export const LeaveRoomSchema = z.object({
  gameCode: GameCodeSchema,
  username: UsernameSchema,
});

/**
 * startGame event payload
 */
export const StartGameSchema = z.object({
  gameCode: GameCodeSchema.optional(),
  letterGrid: z.array(z.array(z.string().max(5)).max(15)).max(15).optional().default([]),
  timerSeconds: z.number().int().optional().default(120),
  language: LanguageSchema.optional(),
  difficulty: DifficultySchema.optional().default('MEDIUM'),
  minWordLength: z.number().int().min(2).max(5).optional().default(2),
  boardTheme: z.object({
    nameKey: z.string(),
    emoji: z.string(),
    isHoliday: z.boolean().optional(),
  }).nullable().optional(),
  gameMode: z.enum(['classic', 'blast', 'word-hunt', 'wheel-rush', 'random']).optional(),
  tvMode: z.boolean().optional(),
  /**
   * Optional boost token bundled with startGame so the server can register
   * the boost atomically with state transition (eliminates the prior race
   * with a separate `boost:apply` emit).
   */
  boostToken: z.string().min(1).max(512).optional(),
});

/**
 * startGameAck event payload - client acknowledges game start
 */
export const StartGameAckSchema = z.object({
  messageId: z.string().min(1),
});

/**
 * countdownComplete event payload - client signals pre-game countdown finished
 * (independent of ack: ack = delivery confirmation, this = readiness to play)
 */
export const CountdownCompleteSchema = z.object({
  messageId: z.string().min(1),
});

/**
 * submitWord event payload
 */
export const SubmitWordSchema = z.object({
  gameCode: GameCodeSchema.optional(),
  username: UsernameSchema.optional(),
  word: WordSchema,
  path: z.array(GridPositionSchema).optional(),
  // comboLevel and fireRoundActive deliberately omitted — derived server-side
  // to prevent clients from spoofing score multipliers.
  // comboType: server has no tile state to detect combos, so the value itself
  // is client-supplied — but the surface is enum-restricted to canonical types
  // to prevent arbitrary string injection (BLT-VAL-1, blast MP audit 2026-04-28).
  comboType: z.enum(BLAST_COMBO_TYPES).optional().nullable(),
  // inputMethod: tracks whether word was submitted via keyboard ('kb') or drag/tap ('drag')
  inputMethod: z.enum(['kb', 'drag']).optional().default('drag'),
});

/**
 * submitWheelWord event payload - Wheel Rush MP word submission
 */
export const SubmitWheelWordSchema = z.object({
  word: z.string().min(1).max(20).transform(s => s.toUpperCase().trim()),
});

/** Word Tower (versus) MP word submission — built from tray + anchor. */
export const SubmitTowerWordSchema = z.object({
  word: z.string().min(1).max(40).transform(s => s.trim()),
});

/** Word Tower (versus) — reroll the tray. */
export const ScrambleTowerSchema = z.object({}).strict();

/** Word Tower (versus) — drop a bomb on a rival's tower. */
export const SendTowerBombSchema = z.object({
  targetPlayerId: z.string().min(1).max(64),
});

/**
 * submitShiritoriWord event payload - Shiritori (しりとり) MP word-chain turn.
 * Hiragana words; game is resolved from the socket, like wheel-rush.
 */
export const SubmitShiritoriWordSchema = z.object({
  word: z.string().min(1).max(50).transform(s => s.trim()),
});

/**
 * submitWordVote event payload - voting on community words
 * Note: voteType must be 'like' or 'dislike' to match database constraint
 */
export const SubmitWordVoteSchema = z.object({
  gameCode: GameCodeSchema.optional(),
  word: WordSchema,
  voteType: z.enum(['like', 'dislike']).optional(),
  isValid: z.boolean().optional(),
  language: LanguageSchema.optional(),
  submittedBy: UsernameSchema.optional(),
  // isBot intentionally omitted — derived from server-side game.users state
});

/**
 * submitPeerValidationVote event payload
 */
export const SubmitPeerValidationVoteSchema = z.object({
  gameCode: GameCodeSchema.optional(),
  word: WordSchema,
  isValid: z.boolean(),
});

/**
 * sendChatMessage event payload
 */
export const ChatMessageSchema = z.object({
  gameCode: GameCodeSchema.optional(),
  username: UsernameSchema.optional(),
  message: z.string().min(1).max(500),
});

/**
 * addBot event payload
 */
export const AddBotSchema = z.object({
  gameCode: GameCodeSchema.optional(),
  difficulty: BotDifficultySchema.optional().default('medium'),
});

/**
 * removeBot event payload
 */
export const RemoveBotSchema = z.object({
  gameCode: GameCodeSchema.optional(),
  botId: z.string().optional(),
  botUsername: UsernameSchema.optional(),
  username: UsernameSchema.optional(),
});

/**
 * heartbeat event payload
 */
export const HeartbeatSchema = z.object({
  gameCode: GameCodeSchema.optional(),
  username: UsernameSchema.optional(),
  timestamp: z.number().optional(),
});

/**
 * presenceUpdate event payload
 */
export const PresenceUpdateSchema = z.object({
  gameCode: GameCodeSchema.optional(),
  username: UsernameSchema.optional(),
  status: PresenceStatusSchema.optional(),
  isWindowFocused: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isIdle: z.boolean().optional(),
  lastActivityAt: z.number().optional(),
});

/**
 * windowFocusChange event payload
 */
export const WindowFocusChangeSchema = z.object({
  gameCode: GameCodeSchema.optional(),
  isFocused: z.boolean(),
});

/**
 * kickPlayer event payload
 */
export const KickPlayerSchema = z.object({
  gameCode: GameCodeSchema,
  username: UsernameSchema,
});

/**
 * transferHost event payload
 */
export const TransferHostSchema = z.object({
  gameCode: GameCodeSchema,
  newHostUsername: UsernameSchema,
});

/**
 * createTournament event payload
 */
export const CreateTournamentSchema = z.object({
  gameCode: GameCodeSchema.optional(),
  name: z.string().min(1).max(100),
  totalRounds: z.number().int().min(2).max(10).default(3),
  settings: z.object({
    timerSeconds: z.number().int().min(30).max(120).optional(),
    difficulty: DifficultySchema.optional(),
    minWordLength: z.number().int().min(2).max(5).optional(),
  }).optional(),
});

/**
 * getWordsForBoard event payload
 */
export const GetWordsForBoardSchema = z.object({
  language: LanguageSchema,
  boardSize: z.object({
    rows: z.number().int().min(3).max(10),
    cols: z.number().int().min(3).max(10),
  }).optional(),
});

/**
 * resetGame event payload
 */
export const ResetGameSchema = z.object({
  gameCode: GameCodeSchema.optional(),
});

/**
 * closeRoom event payload
 */
export const CloseRoomSchema = z.object({
  gameCode: GameCodeSchema,
});

/**
 * reconnect event payload
 */
export const ReconnectSchema = z.object({
  gameCode: GameCodeSchema,
  username: UsernameSchema,
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: GuestTokenHashSchema,
});

/**
 * updateGameSettings event payload
 */
export const UpdateGameSettingsSchema = z.object({
  gameCode: GameCodeSchema,
  settings: z.object({
    timerSeconds: z.number().int().min(30).max(120).optional(),
    difficulty: DifficultySchema.optional(),
    minWordLength: z.number().int().min(2).max(5).optional(),
    language: LanguageSchema.optional(),
  }),
});

/**
 * broadcastShufflingGrid event payload
 */
export const BroadcastShufflingGridSchema = z.object({
  gridState: z.unknown(),
});

/**
 * scorecard:generate event payload
 */
export const GenerateScoreCardSchema = z.object({
  gameCode: GameCodeSchema.optional(),
  username: UsernameSchema.optional(),
});

// ==================== Schema Map for Validation ====================

export const ClientEventSchemas = {
  createGame: CreateGameSchema,
  join: JoinGameSchema,
  leaveRoom: LeaveRoomSchema,
  startGame: StartGameSchema,
  startGameAck: StartGameAckSchema,
  countdownComplete: CountdownCompleteSchema,
  resetGame: ResetGameSchema,
  closeRoom: CloseRoomSchema,
  submitWord: SubmitWordSchema,
  submitWheelWord: SubmitWheelWordSchema,
  submitShiritoriWord: SubmitShiritoriWordSchema,
  submitWordVote: SubmitWordVoteSchema,
  submitPeerValidationVote: SubmitPeerValidationVoteSchema,
  sendChatMessage: ChatMessageSchema,
  chatMessage: ChatMessageSchema,
  addBot: AddBotSchema,
  removeBot: RemoveBotSchema,
  heartbeat: HeartbeatSchema,
  presenceUpdate: PresenceUpdateSchema,
  windowFocusChange: WindowFocusChangeSchema,
  kickPlayer: KickPlayerSchema,
  transferHost: TransferHostSchema,
  createTournament: CreateTournamentSchema,
  getWordsForBoard: GetWordsForBoardSchema,
  reconnect: ReconnectSchema,
  updateGameSettings: UpdateGameSettingsSchema,
  broadcastShufflingGrid: BroadcastShufflingGridSchema,
  'scorecard:generate': GenerateScoreCardSchema,
} as const;

// ==================== Validation Helpers ====================

export type ClientEventName = keyof typeof ClientEventSchemas;

/**
 * Validate a socket event payload against its schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Result object with success status
 */
export function validatePayload<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  // Zod v4 uses 'issues' instead of 'errors'
  const issues = result.error.issues || [];
  const errorMessages = issues
    .map((e) => `${String(e.path?.join?.('.') || '')}: ${e.message || 'Invalid'}`)
    .join(', ');
  return { success: false, error: errorMessages || 'Validation failed' };
}

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
): { success: true; data: unknown } | { success: false; error: string } {
  const schema = ClientEventSchemas[event];
  if (!schema) {
    return {
      success: false,
      error: `No schema defined for event: ${event}`,
    };
  }
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  // Zod v4 uses 'issues' instead of 'errors'
  const issues = result.error.issues || [];
  const errorMessage = issues
    .map((e) => `${String(e.path?.join?.('.') || '')}: ${e.message || 'Invalid'}`)
    .join(', ');
  return { success: false, error: errorMessage || 'Validation failed' };
}

/**
 * Get schema for an event name
 * @param eventName - Name of the socket event
 * @returns Schema or null if not found
 */
export function getEventSchema(eventName: string): z.ZodSchema | null {
  return (ClientEventSchemas as Record<string, z.ZodSchema>)[eventName] || null;
}

// ==================== Type Exports ====================

export type Language = z.infer<typeof LanguageSchema>;
export type Avatar = z.infer<typeof AvatarSchema>;
export type GridPosition = z.infer<typeof GridPositionSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;
export type BotDifficulty = z.infer<typeof BotDifficultySchema>;
export type PresenceStatus = z.infer<typeof PresenceStatusSchema>;

export type CreateGameData = z.infer<typeof CreateGameSchema>;
export type JoinGameData = z.infer<typeof JoinGameSchema>;
export type LeaveRoomData = z.infer<typeof LeaveRoomSchema>;
export type StartGameData = z.infer<typeof StartGameSchema>;
export type SubmitWordData = z.infer<typeof SubmitWordSchema>;
export type SubmitWheelWordData = z.infer<typeof SubmitWheelWordSchema>;
export type SubmitTowerWordData = z.infer<typeof SubmitTowerWordSchema>;
export type ScrambleTowerData = z.infer<typeof ScrambleTowerSchema>;
export type SendTowerBombData = z.infer<typeof SendTowerBombSchema>;
export type SubmitShiritoriWordData = z.infer<typeof SubmitShiritoriWordSchema>;
export type ChatMessageData = z.infer<typeof ChatMessageSchema>;
export type AddBotData = z.infer<typeof AddBotSchema>;
export type RemoveBotData = z.infer<typeof RemoveBotSchema>;
export type HeartbeatData = z.infer<typeof HeartbeatSchema>;
export type PresenceUpdateData = z.infer<typeof PresenceUpdateSchema>;
export type KickPlayerData = z.infer<typeof KickPlayerSchema>;
export type TransferHostData = z.infer<typeof TransferHostSchema>;
export type CreateTournamentData = z.infer<typeof CreateTournamentSchema>;
export type ReconnectData = z.infer<typeof ReconnectSchema>;

// UGC Word Packs
export const ApplyWordPackSchema = z.object({
  packId: z.uuid(),
});
export type ApplyWordPackData = z.infer<typeof ApplyWordPackSchema>;
