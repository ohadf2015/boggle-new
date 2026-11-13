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
