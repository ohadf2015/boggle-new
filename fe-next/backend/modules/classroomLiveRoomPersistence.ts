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

export interface HostIdentity {
  userId: string;
  username: string;
  socketId?: string;
  avatar?: unknown;
}

export interface LiveRoomRosterEntry {
  userId: string;
  username: string;
  socketId?: string;
  avatar?: unknown;
  score?: number;
}

export interface ClassroomLiveRoomRecord {
  roomCode: string;
  classroomId: string;
  teacherId: string;
  hostIdentity: HostIdentity;
  roster: LiveRoomRosterEntry[];
  gameConfig: {
    language?: string;
    gameMode?: string;
    settings?: Record<string, unknown>;
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
        language: (record.gameConfig?.language as never) || 'en',
        isClassroom: true,
        isPrivate: true,
        gameMode: (record.gameConfig?.gameMode as never) || 'classic',
        allowLateJoin: true,
      });

      // Restore host
      addUserToGame(roomCode, hostUsername, hostSocketId, {
        isHost: true,
        authUserId: record.teacherId,
        playerId: record.hostIdentity?.userId || record.teacherId,
        avatar: record.hostIdentity?.avatar,
      });

      // Restore roster students
      if (Array.isArray(record.roster)) {
        for (const player of record.roster) {
          if (!player?.username || player.username === hostUsername) continue;
          addUserToGame(roomCode, player.username, player.socketId || `restored:${player.userId}`, {
            isHost: false,
            authUserId: player.userId,
            playerId: player.userId,
            avatar: player.avatar,
          });
        }
      }

      // Restore lesson vocabulary words
      if (Array.isArray(record.lessonWords)) {
        game.selectedVocabulary = new Set(record.lessonWords);
      }

      if (record.gameConfig?.gameMode) {
        game.gameMode = record.gameConfig.gameMode as never;
      }

      game.gameState = record.currentPhase;
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
          language: record.gameConfig?.language || 'en',
          settings: (record.gameConfig?.settings as ClassroomGameSettings) || {
            gameMode: (record.gameConfig?.gameMode as never) || 'classic',
          },
        });
      }
      if (record.currentPhase !== 'waiting') {
        await updateClassroomGameStatus(roomCode, record.currentPhase as never);
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
