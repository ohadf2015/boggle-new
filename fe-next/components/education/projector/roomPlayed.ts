const key = (gameCode: string) => `edu-room-played:${gameCode}`;

/** Before the first round the lobby already decided the game, so the projector only echoes it; after one, "Next game" lands here to change it. */
export function roomPlayed(gameCode: string): boolean {
  try {
    return sessionStorage.getItem(key(gameCode)) === '1';
  } catch {
    return false;
  }
}

export function markRoomPlayed(gameCode: string): void {
  try {
    sessionStorage.setItem(key(gameCode), '1');
  } catch {
    /* storage off: the echo simply stays read-only */
  }
}
