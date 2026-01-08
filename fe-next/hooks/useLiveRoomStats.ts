'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocketOptional } from '@/utils/SocketContext';
import type { ActiveRoom } from '@/shared/types/game';

interface LiveRoomStats {
  openRooms: number;
  totalPlayers: number;
  isLoading: boolean;
  refresh: () => void;
}

/**
 * useLiveRoomStats - Hook to fetch live room statistics for the landing page
 * Returns the number of open rooms and total players across all rooms
 * Uses useSocketOptional to gracefully handle cases where socket context isn't available
 */
export function useLiveRoomStats(): LiveRoomStats {
  const socketContext = useSocketOptional();
  const socket = socketContext?.socket ?? null;
  const isConnected = socketContext?.isConnected ?? false;
  const [stats, setStats] = useState<Omit<LiveRoomStats, 'refresh'>>({
    openRooms: 0,
    totalPlayers: 0,
    isLoading: true,
  });

  const refresh = useCallback(() => {
    if (socket?.connected) {
      socket.emit('getActiveRooms');
    }
  }, [socket]);

  const handleActiveRooms = useCallback((data: { rooms?: ActiveRoom[] }) => {
    const rooms = data.rooms || [];
    // Filter to only show rooms in waiting state (not in-game, finished, or validating)
    const openRooms = rooms.filter(room => room.gameState === 'waiting');
    const totalPlayers = openRooms.reduce((sum, room) => sum + (room.playerCount || 0), 0);

    setStats({
      openRooms: openRooms.length,
      totalPlayers,
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for active rooms updates
    socket.on('activeRooms', handleActiveRooms);

    // Request active rooms on mount
    socket.emit('getActiveRooms');

    // Poll every 30 seconds to keep stats fresh
    const interval = setInterval(() => {
      if (socket.connected) {
        socket.emit('getActiveRooms');
      }
    }, 30000);

    return () => {
      socket.off('activeRooms', handleActiveRooms);
      clearInterval(interval);
    };
  }, [socket, isConnected, handleActiveRooms]);

  // Mark as not loading after a timeout if socket isn't connected
  useEffect(() => {
    if (!isConnected) {
      const timeout = setTimeout(() => {
        setStats(prev => ({ ...prev, isLoading: false }));
      }, 3000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [isConnected]);

  return { ...stats, refresh };
}

export default useLiveRoomStats;
