/**
 * Socket Schemas - CommonJS Bridge
 *
 * Single source of truth: imports from shared/schemas/socketSchemas.ts
 * This file is compiled to CommonJS for Node.js compatibility.
 *
 * Build: npm run build:schemas
 */
export { LanguageSchema, AvatarSchema, GameCodeSchema, UsernameSchema, WordSchema, GridPositionSchema, DifficultySchema, BotDifficultySchema, PresenceStatusSchema, CreateGameSchema, JoinGameSchema, LeaveRoomSchema, StartGameSchema, StartGameAckSchema, SubmitWordSchema, SubmitWordVoteSchema, SubmitPeerValidationVoteSchema, ChatMessageSchema, AddBotSchema, RemoveBotSchema, HeartbeatSchema, PresenceUpdateSchema, WindowFocusChangeSchema, KickPlayerSchema, TransferHostSchema, CreateTournamentSchema, GetWordsForBoardSchema, ResetGameSchema, CloseRoomSchema, ReconnectSchema, UpdateGameSettingsSchema, BroadcastShufflingGridSchema, ClientEventSchemas, validatePayload, validateSocketEvent, safeValidateSocketEvent, getEventSchema, type ClientEventName, type Language, type Avatar, type GridPosition, type Difficulty, type BotDifficulty, type PresenceStatus, type CreateGameData, type JoinGameData, type LeaveRoomData, type StartGameData, type SubmitWordData, type ChatMessageData, type AddBotData, type RemoveBotData, type HeartbeatData, type PresenceUpdateData, type KickPlayerData, type TransferHostData, type CreateTournamentData, type ReconnectData, } from '../../shared/schemas/socketSchemas';
import { z } from 'zod';
/**
 * Validate and emit error if validation fails (integrated with error handler)
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param socket - Socket for error emission
 * @param eventName - Event name for logging
 * @returns Validation result
 */
export declare function validateWithError<T extends z.ZodSchema>(schema: T, data: unknown, socket: any, eventName?: string): {
    success: true;
    data: z.infer<T>;
} | {
    success: false;
};
/**
 * Create a validated event handler wrapper with error handling
 * @param schema - Zod schema for validation
 * @param handler - Event handler function (receives validated data)
 * @param socket - Socket for error emission
 * @param eventName - Event name for logging
 * @returns Wrapped handler with validation
 */
export declare function withValidation<T extends z.ZodSchema>(schema: T, handler: (data: z.infer<T>) => void | Promise<void>, socket: any, eventName?: string): (data: unknown) => Promise<void>;
/**
 * Create a validation middleware for socket events
 * @param eventName - Name of the socket event
 * @returns Middleware function
 */
export declare function createValidationMiddleware(eventName: string): (socket: any, data: unknown, handler: (data: unknown) => void) => void;
/**
 * Check if an event has a registered schema
 * @param eventName - Name of the socket event
 * @returns True if schema exists
 */
export declare function hasSchema(eventName: string): boolean;
/**
 * Create a validation error (AppError)
 * @param message - Error message
 * @param fields - Field-level errors
 * @returns AppError instance
 */
export declare function createValidationError(message: string, fields?: Record<string, string>): any;
export declare const eventSchemas: {
    readonly createGame: z.ZodObject<{
        gameCode: z.ZodString;
        roomName: z.ZodOptional<z.ZodString>;
        language: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            he: "he";
            en: "en";
            sv: "sv";
            ja: "ja";
            es: "es";
            fr: "fr";
            de: "de";
        }>>>;
        hostUsername: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
        playerId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        avatar: z.ZodOptional<z.ZodObject<{
            emoji: z.ZodString;
            color: z.ZodString;
            avatarImage: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            profilePictureUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        authUserId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        guestTokenHash: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        isRanked: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        profilePictureUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
    readonly join: z.ZodObject<{
        gameCode: z.ZodString;
        username: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        playerId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        avatar: z.ZodOptional<z.ZodObject<{
            emoji: z.ZodString;
            color: z.ZodString;
            avatarImage: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            profilePictureUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        authUserId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        guestTokenHash: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        profilePictureUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
    readonly leaveRoom: z.ZodObject<{
        gameCode: z.ZodString;
        username: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    }, z.core.$strip>;
    readonly startGame: z.ZodObject<{
        gameCode: z.ZodOptional<z.ZodString>;
        letterGrid: z.ZodArray<z.ZodArray<z.ZodString>>;
        timerSeconds: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        language: z.ZodOptional<z.ZodEnum<{
            he: "he";
            en: "en";
            sv: "sv";
            ja: "ja";
            es: "es";
            fr: "fr";
            de: "de";
        }>>;
        difficulty: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            EASY: "EASY";
            MEDIUM: "MEDIUM";
            HARD: "HARD";
        }>>>;
        minWordLength: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, z.core.$strip>;
    readonly startGameAck: z.ZodObject<{
        messageId: z.ZodString;
    }, z.core.$strip>;
    readonly resetGame: z.ZodObject<{
        gameCode: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readonly closeRoom: z.ZodObject<{
        gameCode: z.ZodString;
    }, z.core.$strip>;
    readonly submitWord: z.ZodObject<{
        gameCode: z.ZodOptional<z.ZodString>;
        username: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
        word: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        path: z.ZodOptional<z.ZodArray<z.ZodObject<{
            row: z.ZodNumber;
            col: z.ZodNumber;
            letter: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        comboLevel: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    readonly submitWordVote: z.ZodObject<{
        gameCode: z.ZodOptional<z.ZodString>;
        word: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        voteType: z.ZodOptional<z.ZodEnum<{
            like: "like";
            dislike: "dislike";
        }>>;
        isValid: z.ZodOptional<z.ZodBoolean>;
        language: z.ZodOptional<z.ZodEnum<{
            he: "he";
            en: "en";
            sv: "sv";
            ja: "ja";
            es: "es";
            fr: "fr";
            de: "de";
        }>>;
        submittedBy: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
        isBot: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
    readonly submitPeerValidationVote: z.ZodObject<{
        gameCode: z.ZodOptional<z.ZodString>;
        word: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        isValid: z.ZodBoolean;
    }, z.core.$strip>;
    readonly sendChatMessage: z.ZodObject<{
        gameCode: z.ZodOptional<z.ZodString>;
        username: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
        message: z.ZodString;
    }, z.core.$strip>;
    readonly addBot: z.ZodObject<{
        gameCode: z.ZodOptional<z.ZodString>;
        difficulty: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            easy: "easy";
            medium: "medium";
            hard: "hard";
        }>>>;
    }, z.core.$strip>;
    readonly removeBot: z.ZodObject<{
        gameCode: z.ZodOptional<z.ZodString>;
        botId: z.ZodOptional<z.ZodString>;
        botUsername: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
        username: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    }, z.core.$strip>;
    readonly heartbeat: z.ZodObject<{
        gameCode: z.ZodOptional<z.ZodString>;
        username: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
        timestamp: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    readonly presenceUpdate: z.ZodObject<{
        gameCode: z.ZodOptional<z.ZodString>;
        username: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
        status: z.ZodOptional<z.ZodEnum<{
            active: "active";
            idle: "idle";
            afk: "afk";
        }>>;
        isWindowFocused: z.ZodOptional<z.ZodBoolean>;
        lastActivityAt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    readonly windowFocusChange: z.ZodObject<{
        gameCode: z.ZodOptional<z.ZodString>;
        isFocused: z.ZodBoolean;
    }, z.core.$strip>;
    readonly kickPlayer: z.ZodObject<{
        gameCode: z.ZodString;
        username: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    }, z.core.$strip>;
    readonly transferHost: z.ZodObject<{
        gameCode: z.ZodString;
        newHostUsername: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    }, z.core.$strip>;
    readonly createTournament: z.ZodObject<{
        gameCode: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        totalRounds: z.ZodDefault<z.ZodNumber>;
        settings: z.ZodOptional<z.ZodObject<{
            timerSeconds: z.ZodOptional<z.ZodNumber>;
            difficulty: z.ZodOptional<z.ZodEnum<{
                EASY: "EASY";
                MEDIUM: "MEDIUM";
                HARD: "HARD";
            }>>;
            minWordLength: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    readonly getWordsForBoard: z.ZodObject<{
        language: z.ZodEnum<{
            he: "he";
            en: "en";
            sv: "sv";
            ja: "ja";
            es: "es";
            fr: "fr";
            de: "de";
        }>;
        boardSize: z.ZodOptional<z.ZodObject<{
            rows: z.ZodNumber;
            cols: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    readonly reconnect: z.ZodObject<{
        gameCode: z.ZodString;
        username: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        authUserId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        guestTokenHash: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
    readonly updateGameSettings: z.ZodObject<{
        gameCode: z.ZodString;
        settings: z.ZodObject<{
            timerSeconds: z.ZodOptional<z.ZodNumber>;
            difficulty: z.ZodOptional<z.ZodEnum<{
                EASY: "EASY";
                MEDIUM: "MEDIUM";
                HARD: "HARD";
            }>>;
            minWordLength: z.ZodOptional<z.ZodNumber>;
            language: z.ZodOptional<z.ZodEnum<{
                he: "he";
                en: "en";
                sv: "sv";
                ja: "ja";
                es: "es";
                fr: "fr";
                de: "de";
            }>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
    readonly broadcastShufflingGrid: z.ZodObject<{
        gridState: z.ZodUnknown;
    }, z.core.$strip>;
};
export { LanguageSchema as languageSchema, AvatarSchema as avatarSchema, GameCodeSchema as gameCodeSchema, UsernameSchema as usernameSchema, WordSchema as wordSchema, GridPositionSchema as gridPositionSchema, DifficultySchema as difficultySchema, BotDifficultySchema as botDifficultySchema, PresenceStatusSchema as presenceStatusSchema, CreateGameSchema as createGameSchema, JoinGameSchema as joinGameSchema, LeaveRoomSchema as leaveRoomSchema, StartGameSchema as startGameSchema, StartGameAckSchema as startGameAckSchema, SubmitWordSchema as submitWordSchema, SubmitWordVoteSchema as submitWordVoteSchema, SubmitPeerValidationVoteSchema as submitPeerValidationVoteSchema, ChatMessageSchema as chatMessageSchema, AddBotSchema as addBotSchema, RemoveBotSchema as removeBotSchema, HeartbeatSchema as heartbeatSchema, PresenceUpdateSchema as presenceUpdateSchema, WindowFocusChangeSchema as windowFocusChangeSchema, KickPlayerSchema as kickPlayerSchema, TransferHostSchema as transferHostSchema, CreateTournamentSchema as createTournamentSchema, GetWordsForBoardSchema as getWordsForBoardSchema, ResetGameSchema as resetGameSchema, CloseRoomSchema as closeRoomSchema, ReconnectSchema as reconnectSchema, UpdateGameSettingsSchema as updateGameSettingsSchema, BroadcastShufflingGridSchema as broadcastShufflingGridSchema, } from '../../shared/schemas/socketSchemas';
