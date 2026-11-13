interface LeaveSocket {
  connected: boolean;
  connect: () => unknown;
  emit: (event: string, payload: { gameCode: string; username: string }) => unknown;
}

/** A socket the server dropped never reconnects by itself, so a leave emitted on it would sit in the buffer and the room would stay open. */
export function sendLeaveRoom(socket: LeaveSocket | null | undefined, gameCode: string, username: string): void {
  if (!socket || !gameCode) return;
  try {
    if (!socket.connected) socket.connect();
    socket.emit('leaveRoom', { gameCode, username });
  } catch {
    /* socket gone: the exit itself still goes on */
  }
}
