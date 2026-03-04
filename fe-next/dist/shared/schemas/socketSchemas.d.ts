/**
 * Zod Schemas for Socket Event Validation
 * Single source of truth for both frontend and backend
 *
 * This module provides runtime type safety for all socket events.
 * The backend uses these via the CommonJS bridge at backend/utils/schemas.js
 */
import { z } from 'zod';
export declare const ALLOWED_IMAGE_DOMAINS: string[];
export declare const LanguageSchema: z.ZodEnum<{
    he: "he";
    en: "en";
    sv: "sv";
    ja: "ja";
    es: "es";
    fr: "fr";
    de: "de";
}>;
export declare const AvatarSchema: z.ZodObject<{
    emoji: z.ZodString;
    color: z.ZodString;
    avatarImage: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    profilePictureUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const GameCodeSchema: z.ZodString;
export declare const UsernameSchema: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
export declare const WordSchema: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
export declare const GridPositionSchema: z.ZodObject<{
    row: z.ZodNumber;
    col: z.ZodNumber;
    letter: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const DifficultySchema: z.ZodEnum<{
    EASY: "EASY";
    MEDIUM: "MEDIUM";
    HARD: "HARD";
}>;
export declare const BotDifficultySchema: z.ZodEnum<{
    easy: "easy";
    medium: "medium";
    hard: "hard";
}>;
export declare const PresenceStatusSchema: z.ZodEnum<{
    active: "active";
    idle: "idle";
    afk: "afk";
}>;
/**
 * createGame event payload
 */
export declare const CreateGameSchema: z.ZodObject<{
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
/**
 * join event payload
 */
export declare const JoinGameSchema: z.ZodObject<{
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
/**
 * leaveRoom event payload
 */
export declare const LeaveRoomSchema: z.ZodObject<{
    gameCode: z.ZodString;
    username: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
}, z.core.$strip>;
/**
 * startGame event payload
 */
export declare const StartGameSchema: z.ZodObject<{
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
/**
 * startGameAck event payload - client acknowledges game start
 */
export declare const StartGameAckSchema: z.ZodObject<{
    messageId: z.ZodString;
}, z.core.$strip>;
/**
 * submitWord event payload
 */
export declare const SubmitWordSchema: z.ZodObject<{
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
/**
 * submitWordVote event payload - voting on community words
 * Note: voteType must be 'like' or 'dislike' to match database constraint
 */
export declare const SubmitWordVoteSchema: z.ZodObject<{
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
/**
 * submitPeerValidationVote event payload
 */
export declare const SubmitPeerValidationVoteSchema: z.ZodObject<{
    gameCode: z.ZodOptional<z.ZodString>;
    word: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    isValid: z.ZodBoolean;
}, z.core.$strip>;
/**
 * sendChatMessage event payload
 */
export declare const ChatMessageSchema: z.ZodObject<{
    gameCode: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    message: z.ZodString;
}, z.core.$strip>;
/**
 * addBot event payload
 */
export declare const AddBotSchema: z.ZodObject<{
    gameCode: z.ZodOptional<z.ZodString>;
    difficulty: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        easy: "easy";
        medium: "medium";
        hard: "hard";
    }>>>;
}, z.core.$strip>;
/**
 * removeBot event payload
 */
export declare const RemoveBotSchema: z.ZodObject<{
    gameCode: z.ZodOptional<z.ZodString>;
    botId: z.ZodOptional<z.ZodString>;
    botUsername: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    username: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
}, z.core.$strip>;
/**
 * heartbeat event payload
 */
export declare const HeartbeatSchema: z.ZodObject<{
    gameCode: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    timestamp: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/**
 * presenceUpdate event payload
 */
export declare const PresenceUpdateSchema: z.ZodObject<{
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
/**
 * windowFocusChange event payload
 */
export declare const WindowFocusChangeSchema: z.ZodObject<{
    gameCode: z.ZodOptional<z.ZodString>;
    isFocused: z.ZodBoolean;
}, z.core.$strip>;
/**
 * kickPlayer event payload
 */
export declare const KickPlayerSchema: z.ZodObject<{
    gameCode: z.ZodString;
    username: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
}, z.core.$strip>;
/**
 * transferHost event payload
 */
export declare const TransferHostSchema: z.ZodObject<{
    gameCode: z.ZodString;
    newHostUsername: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
}, z.core.$strip>;
/**
 * createTournament event payload
 */
export declare const CreateTournamentSchema: z.ZodObject<{
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
/**
 * getWordsForBoard event payload
 */
export declare const GetWordsForBoardSchema: z.ZodObject<{
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
/**
 * resetGame event payload
 */
export declare const ResetGameSchema: z.ZodObject<{
    gameCode: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * closeRoom event payload
 */
export declare const CloseRoomSchema: z.ZodObject<{
    gameCode: z.ZodString;
}, z.core.$strip>;
/**
 * reconnect event payload
 */
export declare const ReconnectSchema: z.ZodObject<{
    gameCode: z.ZodString;
    username: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    authUserId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    guestTokenHash: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
/**
 * updateGameSettings event payload
 */
export declare const UpdateGameSettingsSchema: z.ZodObject<{
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
/**
 * broadcastShufflingGrid event payload
 */
export declare const BroadcastShufflingGridSchema: z.ZodObject<{
    gridState: z.ZodUnknown;
}, z.core.$strip>;
export declare const ClientEventSchemas: {
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
export type ClientEventName = keyof typeof ClientEventSchemas;
/**
 * Validate a socket event payload against its schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Result object with success status
 */
export declare function validatePayload<T extends z.ZodSchema>(schema: T, data: unknown): {
    success: true;
    data: z.infer<T>;
} | {
    success: false;
    error: string;
};
/**
 * Validates socket event data against its schema
 * @param event - The event name
 * @param data - The event data to validate
 * @returns Validated data, or throws ZodError
 */
export declare function validateSocketEvent(event: ClientEventName, data: unknown): unknown;
/**
 * Safe validation that returns a result object instead of throwing
 */
export declare function safeValidateSocketEvent(event: ClientEventName, data: unknown): {
    success: true;
    data: unknown;
} | {
    success: false;
    error: string;
};
/**
 * Get schema for an event name
 * @param eventName - Name of the socket event
 * @returns Schema or null if not found
 */
export declare function getEventSchema(eventName: string): z.ZodSchema | null;
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
