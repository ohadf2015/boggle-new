export interface RedialSocket {
  connected: boolean;
  active?: boolean;
  io?: { _readyState?: string };
  connect: () => unknown;
}

// connect() while the handshake is pending sends a second CONNECT on the same connection,
// and the server then holds two sockets for one tab.
export function redialSocket(socket: RedialSocket): void {
  if (socket.connected) return;
  if (socket.active && socket.io?._readyState === 'open') return;
  socket.connect();
}

type ManagerInternals = { _readyState?: string; _reconnecting?: boolean; backoff?: { reset: () => void } };

// For a person asking to reconnect now: while a retry waits out its backoff (up to 45s)
// connect() is a no-op. Clearing the flag dials at once; the manager drops the old timer.
export function redialSocketNow(socket: RedialSocket): void {
  const io = socket.io as ManagerInternals | undefined;
  if (!socket.connected && io?._reconnecting && io._readyState === 'closed') {
    io._reconnecting = false;
    io.backoff?.reset();
  }
  redialSocket(socket);
}
