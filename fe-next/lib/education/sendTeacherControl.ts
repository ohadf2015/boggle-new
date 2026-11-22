import { redialSocketNow, type RedialSocket } from '@/lib/multiplayer/redialSocket';

type ControlSocket = RedialSocket & { emit: (event: string, ...args: unknown[]) => unknown };

// socket.io buffers an emit made while offline and flushes it on reconnect, before the
// page rejoins its room, so every queued tap came back as a rejection toast.
export function sendTeacherControl(
  socket: ControlSocket | null | undefined,
  event: string,
  payload: unknown,
  onOffline: () => void,
): boolean {
  if (!socket?.connected) {
    onOffline();
    if (socket) redialSocketNow(socket);
    return false;
  }
  if (payload === undefined) socket.emit(event);
  else socket.emit(event, payload);
  return true;
}
