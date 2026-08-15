/**
 * Classifies a socket `error` payload from the multiplayer room flow.
 *
 * Branches on the structured `code` the backend's emitError() always attaches
 * (errorHandler.ts), falling back to message substrings only for legacy untyped
 * emit sites. The prior message-only matcher leaked raw English for GAME_CLOSED
 * paths whose custom message contained neither "closed" nor "not found"
 * (e.g. "Cannot join ranked game in progress").
 */

export type RoomErrorKind = 'gone' | 'codeExists' | 'usernameTaken' | 'rateLimited' | 'generic';

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

  // NAME_TAKEN is what gameLifecycleHandler actually emits, with the message
  // "That name is already in use" — which contains neither the code this used to
  // look for nor the literal word "username", so it fell through to 'generic'.
  // The player was told "an error occurred" and retried the SAME name.
  if (
    code === 'PLAYER_USERNAME_TAKEN' ||
    code === 'NAME_TAKEN' ||
    message.includes('username') ||
    message.includes('name is already in use')
  ) {
    return 'usernameTaken';
  }

  // Rate limiting deserves its own branch: rage-clicking Join is precisely how a
  // player trips the 50 msg/10s limiter, so answering with a generic error
  // invites the next tap, which extends the lockout. 108 join errors came from
  // 19 people — ~5.7 attempts each — and they are the multiplayer rage-clickers.
  if (
    code === 'RATE_LIMITED' ||
    code === 'RATE_LIMIT_EXCEEDED' ||
    message.includes('too many requests') ||
    message.includes('slow down')
  ) {
    return 'rateLimited';
  }

  return 'generic';
}
