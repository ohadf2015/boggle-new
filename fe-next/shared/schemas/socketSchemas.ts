/**
 * Zod Schemas for Socket Event Validation
 * Single source of truth for both frontend and backend
 *
 * This module provides runtime type safety for all socket events.
 * The backend uses these via the CommonJS bridge at backend/utils/schemas.js
 */

import { z } from 'zod';

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
  profilePictureUrl: z.string()
    .url()
    .nullable()
    .optional()
    // SECURITY: HTTPS-only and domain whitelist to prevent SSRF/XSS
    .refine((url) => {
      if (!url) return true; // null/undefined is allowed
      try {
        const parsed = new URL(url);
        // Only allow HTTPS (prevent data:, javascript:, file:, http: schemes)
        if (parsed.protocol !== 'https:') return false;
        // Check against whitelist
        return ALLOWED_IMAGE_DOMAINS.some(domain =>
          parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
        );
      } catch {
        return false;
      }
    }, 'Profile picture URL must be from an allowed domain (HTTPS only)'),
});

export const GameCodeSchema = z.string()
  .min(6, 'Game code must be at least 6 characters')
  .max(10, 'Game code must be at most 10 characters')
  .regex(/^[A-Za-z0-9]+$/, 'Game code must be alphanumeric');

export const UsernameSchema = z.string()
  .min(1, 'Username is required')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_\-\u0590-\u05FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\s]+$/)
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
  roomName: z.string().max(50).optional(),
  language: LanguageSchema.optional().default('en'),
  hostUsername: UsernameSchema.optional(),
  playerId: z.string().max(64).optional().nullable(),
  avatar: AvatarSchema.optional(),
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: z.string().max(128).optional().nullable(),
  isRanked: z.boolean().optional().default(false),
  profilePictureUrl: z.string()
    .url()
    .optional()
    .nullable()
    .refine((url) => {
      if (!url) return true;
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return false;
        return ALLOWED_IMAGE_DOMAINS.some(domain =>
          parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
        );
      } catch {
        return false;
      }
    }, 'Profile picture URL must be from an allowed domain (HTTPS only)'),
});

/**
 * join event payload
 */
export const JoinGameSchema = z.object({
  gameCode: GameCodeSchema,
  username: UsernameSchema,
  playerId: z.string().max(64).optional().nullable(),
  avatar: AvatarSchema.optional(),
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: z.string().max(128).optional().nullable(),
  profilePictureUrl: z.string()
    .url()
    .optional()
    .nullable()
    .refine((url) => {
      if (!url) return true;
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return false;
        return ALLOWED_IMAGE_DOMAINS.some(domain =>
          parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
        );
      } catch {
        return false;
      }
    }, 'Profile picture URL must be from an allowed domain (HTTPS only)'),
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
  letterGrid: z.array(z.array(z.string())),
  timerSeconds: z.number().int().min(30).max(600).optional().default(180),
  language: LanguageSchema.optional(),
  difficulty: DifficultySchema.optional().default('MEDIUM'),
  minWordLength: z.number().int().min(2).max(5).optional().default(3),
});

/**
 * startGameAck event payload - client acknowledges game start
 */
export const StartGameAckSchema = z.object({
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
  comboLevel: z.number().int().min(0).max(100).optional(),
  fireRoundActive: z.boolean().optional().default(false),
  // comboType is trusted from client (server has no tile state to detect combos).
  // Used to re-broadcast blast combo effects to all players in the room.
  comboType: z.string().optional().nullable(),
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
  isBot: z.boolean().optional(),
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
    timerSeconds: z.number().int().min(30).max(600).optional(),
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
  guestTokenHash: z.string().max(128).optional().nullable(),
});

/**
 * updateGameSettings event payload
 */
export const UpdateGameSettingsSchema = z.object({
  gameCode: GameCodeSchema,
  settings: z.object({
    timerSeconds: z.number().int().min(30).max(600).optional(),
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

// ==================== Schema Map for Validation ====================

export const ClientEventSchemas = {
  createGame: CreateGameSchema,
  join: JoinGameSchema,
  leaveRoom: LeaveRoomSchema,
  startGame: StartGameSchema,
  startGameAck: StartGameAckSchema,
  resetGame: ResetGameSchema,
  closeRoom: CloseRoomSchema,
  submitWord: SubmitWordSchema,
  submitWordVote: SubmitWordVoteSchema,
  submitPeerValidationVote: SubmitPeerValidationVoteSchema,
  sendChatMessage: ChatMessageSchema,
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
  packId: z.string().uuid(),
});
export type ApplyWordPackData = z.infer<typeof ApplyWordPackSchema>;
