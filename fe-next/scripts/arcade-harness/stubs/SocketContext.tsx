import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

let shared: Socket | null = null;
const get = () => (shared ??= io(location.origin, { transports: ['websocket'] }));

export function useSocket() {
  const socket = get();
  const [isConnected, setConnected] = useState(socket.connected);
  useEffect(() => {
    const on = () => setConnected(true);
    const off = () => setConnected(false);
    socket.on('connect', on);
    socket.on('disconnect', off);
    return () => {
      socket.off('connect', on);
      socket.off('disconnect', off);
    };
  }, [socket]);
  return { socket, isConnected };
}
