/**
 * Live in-app notices: push a typed event to every socket in `user:<id>`
 * (Redis adapter fans this out across servers) and report whether the user
 * currently has a connected socket — used to skip FCM when they're already
 * looking at the app.
 */
import type { Server } from 'socket.io';
import { LIVE_NOTICE_EVENT, type LiveNotice } from '@/shared/liveNotice';

export { LIVE_NOTICE_EVENT, type LiveNotice };

function getIo(): Server | undefined {
  return (globalThis as { __lcIo?: Server }).__lcIo;
}

export function userHasLiveSocket(userId: string): boolean {
  const io = getIo();
  if (!io) return false;
  const room = io.sockets.adapter.rooms.get(`user:${userId}`);
  return !!room && room.size > 0;
}

export function emitLiveNotice(userId: string, notice: Omit<LiveNotice, 'id'> & { id?: string }): boolean {
  const io = getIo();
  if (!io) return false;
  const payload: LiveNotice = {
    id: notice.id ?? `${notice.type}:${notice.deepLink ?? ''}:${Date.now()}`,
    type: notice.type,
    title: notice.title,
    body: notice.body,
    deepLink: notice.deepLink,
    senderId: notice.senderId,
    requestId: notice.requestId,
  };
  io.to(`user:${userId}`).emit(LIVE_NOTICE_EVENT, payload);
  return userHasLiveSocket(userId);
}
