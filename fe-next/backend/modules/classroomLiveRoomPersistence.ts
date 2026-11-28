/**
 * Classroom Live Room Persistence
 *
 * Persists minimal live room state (code, teacherId, hostIdentity, roster,
 * gameConfig, lessonWords, currentPhase) to Postgres so teacher live classes
 * survive single-replica server deploys, restarts, and pod recycling.
 *
 * On reconnect or join to a room not in process memory, restores the room into
 * gameStateManager and classroomGameManager.
 */

import type { Socket } from 'socket.io';
import type { Avatar, GameMode, Language } from '@/shared/types/game';
import { getSupabase } from './supabase/client.js';
import {
  createGame,
  getGame,
  addUserToGame,
  type GameState,
} from './gameStateManager.js';
import {
  createClassroomGame,
  getClassroomGame,
  updateClassroomGameStatus,
  type ClassroomGameSettings,
} from './classroomGameManager.js';
import { getGameRoom, joinRoom } from '../utils/socketHelpers.js';
import logger from '../utils/logger.js';

const LANGUAGES: readonly Language[] = ['he', 'en', 'sv', 'ja', 'es', 'ru', 'fr', 'de'];
const BOARD_MODES: readonly GameMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush', 'word-tower', 'crossword', 'wordcraft'];
const CLASSROOM_MODES = ['classic', 'blast', 'word-hunt', 'wheel-rush', 'vocab-quiz', 'wordcraft', 'crossword'] as const;

function asLanguage(value: unknown): Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value) ? (value as Language) : 'en';
}

function asAvatar(value: unknown): Avatar | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const avatar: Avatar = {};
  if (typeof raw.avatarImage === 'string') avatar.avatarImage = raw.avatarImage;
  if (typeof raw.emoji === 'string') avatar.emoji = raw.emoji;
  if (typeof raw.color === 'string') avatar.color = raw.color;
  if (raw.customAvatar && typeof raw.customAvatar === 'object') {
    avatar.customAvatar = raw.customAvatar as Avatar['customAvatar'];
  }
  return avatar;
}

function asClassroomMode(value: unknown): NonNullable<ClassroomGameSettings['gameMode']> {
  return typeof value === 'string' && (CLASSROOM_MODES as readonly string[]).includes(value)
    ? (value as NonNullable<ClassroomGameSettings['gameMode']>)
    : 'classic';
}

/** Board engines use GameMode. vocab-quiz is stored beside it so a restored quiz room stays a quiz. */
function restoredBoardMode(value: string | undefined): GameMode | undefined {
  if (!value) return undefined;
  if ((BOARD_MODES as readonly string[]).includes(value)) return value as GameMode;
  if (value === 'vocab-quiz') return 'vocab-quiz' as GameMode;
  return undefined;
}

function restoredBoardPhase(phase: ClassroomLiveRoomRecord['currentPhase']): GameState['gameState'] {
  return phase === 'playing' ? 'in-progress' : 'waiting';
}

export interface HostIdentity {
  userId: string;
  username: string;
  socketId?: string;
  avatar?: Avatar | null;
}

export interface LiveRoomRosterEntry {
  userId: string;
  username: string;
  socketId?: string;
  avatar?: Avatar | null;
  score?: number;
}

export interface ClassroomLiveRoomRecord {
  roomCode: string;
  classroomId: string;
  teacherId: string;
  hostIdentity: HostIdentity;
  roster: LiveRoomRosterEntry[];
  gameConfig: {
    language?: Language;
    gameMode?: ClassroomGameSettings['gameMode'];
    settings?: ClassroomGameSettings;
  };
  lessonWords: string[];
  currentPhase: 'waiting' | 'playing' | 'ended';
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Persist minimal live room state to Postgres.
 * Fails safely open on DB errors so transient issues never block live gameplay.
 */
export async function persistLiveRoomState(record: ClassroomLiveRoomRecord): Promise<boolean> {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;

    const row = {
      room_code: record.roomCode,
      classroom_id: record.classroomId || null,
      teacher_id: record.teacherId,
      host_identity: record.hostIdentity,
      roster: record.roster ?? [],
      game_config: record.gameConfig ?? {},
      lesson_words: record.lessonWords ?? [],
      current_phase: record.currentPhase ?? 'waiting',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('classroom_live_rooms' as never)
      .upsert(row as never, { onConflict: 'room_code' });

    if (error) {
      logger.warn('CLASSROOM_GAME', `Failed to persist live room ${record.roomCode} to DB: ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    logger.warn('CLASSROOM_GAME', `Exception persisting live room ${record.roomCode}: ${(err as Error)?.message ?? err}`);
    return false;
  }
}

/**
 * Fetch persisted room state from Postgres.
 */
export async function getPersistedLiveRoomState(roomCode: string): Promise<ClassroomLiveRoomRecord | null> {
  try {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('classroom_live_rooms' as never)
      .select('*')
      .eq('room_code', roomCode)
      .maybeSingle();

    if (error || !data) return null;

    const raw = data as Record<string, unknown>;
    return {
      roomCode: String(raw.room_code || roomCode),
      classroomId: String(raw.classroom_id || ''),
      teacherId: String(raw.teacher_id || ''),
      hostIdentity: (raw.host_identity as HostIdentity) || { userId: '', username: 'Teacher' },
      roster: (raw.roster as LiveRoomRosterEntry[]) || [],
      gameConfig: (raw.game_config as ClassroomLiveRoomRecord['gameConfig']) || {},
      lessonWords: (raw.lesson_words as string[]) || [],
      currentPhase: (raw.current_phase as ClassroomLiveRoomRecord['currentPhase']) || 'waiting',
      createdAt: raw.created_at ? String(raw.created_at) : undefined,
      updatedAt: raw.updated_at ? String(raw.updated_at) : undefined,
    };
  } catch (err) {
    logger.warn('CLASSROOM_GAME', `Exception reading live room ${roomCode} from DB: ${(err as Error)?.message ?? err}`);
    return null;
  }
}

/**
 * Mark room as ended in Postgres so it is never revived post-conclusion.
 */
export async function markLiveRoomEnded(roomCode: string): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return;

    await supabase
      .from('classroom_live_rooms' as never)
      .update({
        current_phase: 'ended',
        updated_at: new Date().toISOString(),
      } as never)
      .eq('room_code', roomCode);
  } catch (err) {
    logger.warn('CLASSROOM_GAME', `Exception marking room ${roomCode} ended: ${(err as Error)?.message ?? err}`);
  }
}

/**
 * Restore an in-memory game room from persistent Postgres state.
 * Returns true if restored successfully, false if unrecoverable.
 */
export async function restoreLiveRoomFromDb(
  roomCode: string,
  connectingSocket?: Socket,
  connectingUserId?: string
): Promise<boolean> {
  try {
    const record = await getPersistedLiveRoomState(roomCode);
    if (!record || record.currentPhase === 'ended') {
      return false;
    }

    const hostUsername = record.hostIdentity?.username || 'Teacher';
    const isTeacherConnecting = !!connectingUserId && connectingUserId === record.teacherId;
    const hostSocketId = isTeacherConnecting && connectingSocket
      ? connectingSocket.id
      : (record.hostIdentity?.socketId || '');

    let game: GameState | null = getGame(roomCode);
    if (!game) {
      game = createGame(roomCode, {
        hostSocketId,
        hostUsername,
        hostPlayerId: record.hostIdentity?.userId || record.teacherId,
        roomName: roomCode,
        language: asLanguage(record.gameConfig?.language),
        isClassroom: true,
        isPrivate: true,
        allowLateJoin: true,
      });

      // Restore host
      addUserToGame(roomCode, hostUsername, hostSocketId, {
        isHost: true,
        authUserId: record.teacherId,
        playerId: record.hostIdentity?.userId || record.teacherId,
        avatar: asAvatar(record.hostIdentity?.avatar),
      });

      // Restore roster students
      if (Array.isArray(record.roster)) {
        for (const player of record.roster) {
          if (!player?.username || player.username === hostUsername) continue;
          addUserToGame(roomCode, player.username, player.socketId || `restored:${player.userId}`, {
            isHost: false,
            authUserId: player.userId,
            playerId: player.userId,
            avatar: asAvatar(player.avatar),
          });
        }
      }

      // Restore lesson vocabulary words
      if (Array.isArray(record.lessonWords)) {
        game.selectedVocabulary = new Set(record.lessonWords);
      }

      const restoredMode = restoredBoardMode(record.gameConfig?.gameMode);
      if (restoredMode) game.gameMode = restoredMode;

      game.gameState = restoredBoardPhase(record.currentPhase);
      logger.info('CLASSROOM_GAME', `Restored room ${roomCode} from DB (phase: ${record.currentPhase}, roster: ${record.roster?.length ?? 0})`);
    } else if (isTeacherConnecting && connectingSocket) {
      // Reclaim host socket on reconnect
      game.hostSocketId = connectingSocket.id;
      if (game.users?.[hostUsername]) {
        game.users[hostUsername].socketId = connectingSocket.id;
      }
    }

    // Reconnect socket to room channel if provided
    if (connectingSocket) {
      joinRoom(connectingSocket, getGameRoom(roomCode));
    }

    // Sync Redis/classroomGameManager record if missing or needs phase sync
    try {
      const existingClassroom = await getClassroomGame(roomCode);
      if (!existingClassroom) {
        await createClassroomGame({
          gameCode: roomCode,
          classroomId: record.classroomId,
          teacherId: record.teacherId,
          teacherName: hostUsername,
          lessonIds: [],
          lessonNames: [],
          vocabularyWords: record.lessonWords,
          language: asLanguage(record.gameConfig?.language),
          settings: record.gameConfig?.settings || {
            gameMode: asClassroomMode(record.gameConfig?.gameMode),
          },
        });
      }
      if (record.currentPhase === 'playing') {
        await updateClassroomGameStatus(roomCode, 'playing');
      }
    } catch (redisErr) {
      logger.warn('CLASSROOM_GAME', `Redis sync for restored room ${roomCode} failed: ${(redisErr as Error)?.message ?? redisErr}`);
    }

    return true;
  } catch (err) {
    logger.error('CLASSROOM_GAME', `Failed to restore room ${roomCode} from DB: ${(err as Error)?.message ?? err}`);
    return false;
  }
}
