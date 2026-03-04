"use strict";
/**
 * Zod Schemas for Socket Event Validation
 * Single source of truth for both frontend and backend
 *
 * This module provides runtime type safety for all socket events.
 * The backend uses these via the CommonJS bridge at backend/utils/schemas.js
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientEventSchemas = exports.BroadcastShufflingGridSchema = exports.UpdateGameSettingsSchema = exports.ReconnectSchema = exports.CloseRoomSchema = exports.ResetGameSchema = exports.GetWordsForBoardSchema = exports.CreateTournamentSchema = exports.TransferHostSchema = exports.KickPlayerSchema = exports.WindowFocusChangeSchema = exports.PresenceUpdateSchema = exports.HeartbeatSchema = exports.RemoveBotSchema = exports.AddBotSchema = exports.ChatMessageSchema = exports.SubmitPeerValidationVoteSchema = exports.SubmitWordVoteSchema = exports.SubmitWordSchema = exports.StartGameAckSchema = exports.StartGameSchema = exports.LeaveRoomSchema = exports.JoinGameSchema = exports.CreateGameSchema = exports.PresenceStatusSchema = exports.BotDifficultySchema = exports.DifficultySchema = exports.GridPositionSchema = exports.WordSchema = exports.UsernameSchema = exports.GameCodeSchema = exports.AvatarSchema = exports.LanguageSchema = exports.ALLOWED_IMAGE_DOMAINS = void 0;
exports.validatePayload = validatePayload;
exports.validateSocketEvent = validateSocketEvent;
exports.safeValidateSocketEvent = safeValidateSocketEvent;
exports.getEventSchema = getEventSchema;
const zod_1 = require("zod");
// ==================== Security Configuration ====================
// Allowed domains for profile picture URLs (prevent SSRF attacks)
// SECURITY: Use specific project domain from environment variable when available
const getSupabaseDomains = () => {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (supabaseUrl) {
            const url = new URL(supabaseUrl);
            const domains = [url.hostname]; // e.g., 'yourproject.supabase.co'
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
    }
    catch {
        // If parsing fails, return empty array
    }
    return [];
};
const supabaseDomains = getSupabaseDomains();
exports.ALLOWED_IMAGE_DOMAINS = [
    'i.imgur.com',
    'cdn.discordapp.com',
    'lh3.googleusercontent.com',
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
exports.LanguageSchema = zod_1.z.enum(['he', 'en', 'sv', 'ja', 'es', 'fr', 'de']);
exports.AvatarSchema = zod_1.z.object({
    emoji: zod_1.z.string()
        .min(1)
        .max(10)
        // SECURITY: Prevent emoji bombs and excessive zero-width joiners
        .refine((val) => {
        // Count actual characters (emoji with modifiers can be multiple code points)
        const chars = Array.from(val);
        if (chars.length > 4)
            return false;
        // Check for excessive zero-width joiners
        const zwjCount = (val.match(/\u200D/g) || []).length;
        return zwjCount <= 3;
    }, 'Invalid emoji format'),
    color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    avatarImage: zod_1.z.string().max(100).regex(/^[a-z0-9_\-\/]+$/i).optional().nullable(),
    profilePictureUrl: zod_1.z.string()
        .url()
        .nullable()
        .optional()
        // SECURITY: HTTPS-only and domain whitelist to prevent SSRF/XSS
        .refine((url) => {
        if (!url)
            return true; // null/undefined is allowed
        try {
            const parsed = new URL(url);
            // Only allow HTTPS (prevent data:, javascript:, file:, http: schemes)
            if (parsed.protocol !== 'https:')
                return false;
            // Check against whitelist
            return exports.ALLOWED_IMAGE_DOMAINS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
        }
        catch {
            return false;
        }
    }, 'Profile picture URL must be from an allowed domain (HTTPS only)'),
});
exports.GameCodeSchema = zod_1.z.string()
    .min(6, 'Game code must be at least 6 characters')
    .max(10, 'Game code must be at most 10 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Game code must be alphanumeric');
exports.UsernameSchema = zod_1.z.string()
    .min(1, 'Username is required')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_\-\u0590-\u05FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\s]+$/)
    .transform(s => s.trim())
    // SECURITY: Reject control characters, zero-width characters, and BOM
    .refine((val) => !/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/.test(val), 'Username contains invalid characters');
exports.WordSchema = zod_1.z.string()
    .min(1, 'Word is required')
    .max(50, 'Word must be at most 50 characters')
    .transform(s => s.trim());
exports.GridPositionSchema = zod_1.z.object({
    row: zod_1.z.number().int().min(0).max(10),
    col: zod_1.z.number().int().min(0).max(10),
    letter: zod_1.z.string().optional(),
});
exports.DifficultySchema = zod_1.z.enum(['EASY', 'MEDIUM', 'HARD']);
exports.BotDifficultySchema = zod_1.z.enum(['easy', 'medium', 'hard']);
exports.PresenceStatusSchema = zod_1.z.enum(['active', 'idle', 'afk']);
// ==================== Client → Server Event Schemas ====================
/**
 * createGame event payload
 */
exports.CreateGameSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema,
    roomName: zod_1.z.string().max(50).optional(),
    language: exports.LanguageSchema.optional().default('en'),
    hostUsername: exports.UsernameSchema.optional(),
    playerId: zod_1.z.string().max(64).optional().nullable(),
    avatar: exports.AvatarSchema.optional(),
    authUserId: zod_1.z.string().uuid().optional().nullable(),
    guestTokenHash: zod_1.z.string().max(128).optional().nullable(),
    isRanked: zod_1.z.boolean().optional().default(false),
    profilePictureUrl: zod_1.z.string()
        .url()
        .optional()
        .nullable()
        .refine((url) => {
        if (!url)
            return true;
        try {
            const parsed = new URL(url);
            if (parsed.protocol !== 'https:')
                return false;
            return exports.ALLOWED_IMAGE_DOMAINS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
        }
        catch {
            return false;
        }
    }, 'Profile picture URL must be from an allowed domain (HTTPS only)'),
});
/**
 * join event payload
 */
exports.JoinGameSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema,
    username: exports.UsernameSchema,
    playerId: zod_1.z.string().max(64).optional().nullable(),
    avatar: exports.AvatarSchema.optional(),
    authUserId: zod_1.z.string().uuid().optional().nullable(),
    guestTokenHash: zod_1.z.string().max(128).optional().nullable(),
    profilePictureUrl: zod_1.z.string()
        .url()
        .optional()
        .nullable()
        .refine((url) => {
        if (!url)
            return true;
        try {
            const parsed = new URL(url);
            if (parsed.protocol !== 'https:')
                return false;
            return exports.ALLOWED_IMAGE_DOMAINS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
        }
        catch {
            return false;
        }
    }, 'Profile picture URL must be from an allowed domain (HTTPS only)'),
});
/**
 * leaveRoom event payload
 */
exports.LeaveRoomSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema,
    username: exports.UsernameSchema,
});
/**
 * startGame event payload
 */
exports.StartGameSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema.optional(),
    letterGrid: zod_1.z.array(zod_1.z.array(zod_1.z.string())),
    timerSeconds: zod_1.z.number().int().min(30).max(600).optional().default(180),
    language: exports.LanguageSchema.optional(),
    difficulty: exports.DifficultySchema.optional().default('MEDIUM'),
    minWordLength: zod_1.z.number().int().min(2).max(5).optional().default(3),
});
/**
 * startGameAck event payload - client acknowledges game start
 */
exports.StartGameAckSchema = zod_1.z.object({
    messageId: zod_1.z.string().min(1),
});
/**
 * submitWord event payload
 */
exports.SubmitWordSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema.optional(),
    username: exports.UsernameSchema.optional(),
    word: exports.WordSchema,
    path: zod_1.z.array(exports.GridPositionSchema).optional(),
    comboLevel: zod_1.z.number().int().min(0).max(10).optional(),
});
/**
 * submitWordVote event payload - voting on community words
 * Note: voteType must be 'like' or 'dislike' to match database constraint
 */
exports.SubmitWordVoteSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema.optional(),
    word: exports.WordSchema,
    voteType: zod_1.z.enum(['like', 'dislike']).optional(),
    isValid: zod_1.z.boolean().optional(),
    language: exports.LanguageSchema.optional(),
    submittedBy: exports.UsernameSchema.optional(),
    isBot: zod_1.z.boolean().optional(),
});
/**
 * submitPeerValidationVote event payload
 */
exports.SubmitPeerValidationVoteSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema.optional(),
    word: exports.WordSchema,
    isValid: zod_1.z.boolean(),
});
/**
 * sendChatMessage event payload
 */
exports.ChatMessageSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema.optional(),
    username: exports.UsernameSchema.optional(),
    message: zod_1.z.string().min(1).max(500),
});
/**
 * addBot event payload
 */
exports.AddBotSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema.optional(),
    difficulty: exports.BotDifficultySchema.optional().default('medium'),
});
/**
 * removeBot event payload
 */
exports.RemoveBotSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema.optional(),
    botId: zod_1.z.string().optional(),
    botUsername: exports.UsernameSchema.optional(),
    username: exports.UsernameSchema.optional(),
});
/**
 * heartbeat event payload
 */
exports.HeartbeatSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema.optional(),
    username: exports.UsernameSchema.optional(),
    timestamp: zod_1.z.number().optional(),
});
/**
 * presenceUpdate event payload
 */
exports.PresenceUpdateSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema.optional(),
    username: exports.UsernameSchema.optional(),
    status: exports.PresenceStatusSchema.optional(),
    isWindowFocused: zod_1.z.boolean().optional(),
    lastActivityAt: zod_1.z.number().optional(),
});
/**
 * windowFocusChange event payload
 */
exports.WindowFocusChangeSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema.optional(),
    isFocused: zod_1.z.boolean(),
});
/**
 * kickPlayer event payload
 */
exports.KickPlayerSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema,
    username: exports.UsernameSchema,
});
/**
 * transferHost event payload
 */
exports.TransferHostSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema,
    newHostUsername: exports.UsernameSchema,
});
/**
 * createTournament event payload
 */
exports.CreateTournamentSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema.optional(),
    name: zod_1.z.string().min(1).max(100),
    totalRounds: zod_1.z.number().int().min(2).max(10).default(3),
    settings: zod_1.z.object({
        timerSeconds: zod_1.z.number().int().min(30).max(600).optional(),
        difficulty: exports.DifficultySchema.optional(),
        minWordLength: zod_1.z.number().int().min(2).max(5).optional(),
    }).optional(),
});
/**
 * getWordsForBoard event payload
 */
exports.GetWordsForBoardSchema = zod_1.z.object({
    language: exports.LanguageSchema,
    boardSize: zod_1.z.object({
        rows: zod_1.z.number().int().min(3).max(10),
        cols: zod_1.z.number().int().min(3).max(10),
    }).optional(),
});
/**
 * resetGame event payload
 */
exports.ResetGameSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema.optional(),
});
/**
 * closeRoom event payload
 */
exports.CloseRoomSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema,
});
/**
 * reconnect event payload
 */
exports.ReconnectSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema,
    username: exports.UsernameSchema,
    authUserId: zod_1.z.string().uuid().optional().nullable(),
    guestTokenHash: zod_1.z.string().max(128).optional().nullable(),
});
/**
 * updateGameSettings event payload
 */
exports.UpdateGameSettingsSchema = zod_1.z.object({
    gameCode: exports.GameCodeSchema,
    settings: zod_1.z.object({
        timerSeconds: zod_1.z.number().int().min(30).max(600).optional(),
        difficulty: exports.DifficultySchema.optional(),
        minWordLength: zod_1.z.number().int().min(2).max(5).optional(),
        language: exports.LanguageSchema.optional(),
    }),
});
/**
 * broadcastShufflingGrid event payload
 */
exports.BroadcastShufflingGridSchema = zod_1.z.object({
    gridState: zod_1.z.unknown(),
});
// ==================== Schema Map for Validation ====================
exports.ClientEventSchemas = {
    createGame: exports.CreateGameSchema,
    join: exports.JoinGameSchema,
    leaveRoom: exports.LeaveRoomSchema,
    startGame: exports.StartGameSchema,
    startGameAck: exports.StartGameAckSchema,
    resetGame: exports.ResetGameSchema,
    closeRoom: exports.CloseRoomSchema,
    submitWord: exports.SubmitWordSchema,
    submitWordVote: exports.SubmitWordVoteSchema,
    submitPeerValidationVote: exports.SubmitPeerValidationVoteSchema,
    sendChatMessage: exports.ChatMessageSchema,
    addBot: exports.AddBotSchema,
    removeBot: exports.RemoveBotSchema,
    heartbeat: exports.HeartbeatSchema,
    presenceUpdate: exports.PresenceUpdateSchema,
    windowFocusChange: exports.WindowFocusChangeSchema,
    kickPlayer: exports.KickPlayerSchema,
    transferHost: exports.TransferHostSchema,
    createTournament: exports.CreateTournamentSchema,
    getWordsForBoard: exports.GetWordsForBoardSchema,
    reconnect: exports.ReconnectSchema,
    updateGameSettings: exports.UpdateGameSettingsSchema,
    broadcastShufflingGrid: exports.BroadcastShufflingGridSchema,
};
/**
 * Validate a socket event payload against its schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Result object with success status
 */
function validatePayload(schema, data) {
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
function validateSocketEvent(event, data) {
    const schema = exports.ClientEventSchemas[event];
    if (!schema) {
        throw new Error(`No schema defined for event: ${event}`);
    }
    return schema.parse(data);
}
/**
 * Safe validation that returns a result object instead of throwing
 */
function safeValidateSocketEvent(event, data) {
    const schema = exports.ClientEventSchemas[event];
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
function getEventSchema(eventName) {
    return exports.ClientEventSchemas[eventName] || null;
}
