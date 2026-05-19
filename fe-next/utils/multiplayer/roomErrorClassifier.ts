/**
 * Classifies a socket `error` payload from the multiplayer room flow.
 *
 * Branches on the structured `code` the backend's emitError() always attaches
 * (errorHandler.ts), falling back to message substrings only for legacy untyped
 * emit sites. The prior message-only matcher leaked raw English for GAME_CLOSED
 * paths whose custom message contained neither "closed" nor "not found"
 * (e.g. "Cannot join ranked game in progress").
 */

export type RoomErrorKind = 'gone' | 'codeExists' | 'usernameTaken' | 'generic';

interface RoomErrorPayload {
  code?: string;
  message?: string;
}

export function classifyRoomError(data: RoomErrorPayload | null | undefined): RoomErrorKind {
  const code = data?.code;
  const message = (data?.message ?? '').toLowerCase();

  if (
    code === 'GAME_NOT_FOUND' ||
    code === 'GAME_CLOSED' ||
    message.includes('not found') ||
    message.includes('closed')
  ) {
    return 'gone';
  }

  if (code === 'GAME_ALREADY_EXISTS' || message.includes('game code already')) {
    return 'codeExists';
  }

  if (code === 'PLAYER_USERNAME_TAKEN' || message.includes('username')) {
    return 'usernameTaken';
  }

  return 'generic';
}
