export const LOBBY_LOCK_EVENTS = {
  set: 'setClassroomLobbyLocked',
  get: 'getClassroomLobbyLocked',
  changed: 'classroomLobbyLockChanged',
} as const;

export const ROOM_LOCKED = 'ROOM_LOCKED';
export const LOBBY_LOCK_FAILED = 'LOBBY_LOCK_FAILED';

export interface LobbyLockChange {
  gameCode: string;
  locked: boolean;
}
