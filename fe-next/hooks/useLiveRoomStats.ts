'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocketOptional } from '@/utils/SocketContext';
import type { ActiveRoom } from '@/shared/types/game';

interface LiveRoomStats {
  /** Number of rooms in waiting state (joinable) */
  openRooms: number;
  /** Total players in waiting rooms */
  totalPlayers: number;
  /** Total players actively playing across all multiplayer rooms (waiting + in-progress) */
  activePlayers: number;
  isLoading: boolean;
  refresh: () => void;
}

/**
 * useLiveRoomStats - Hook to fetch live room statistics for the landing page
 * Returns the number of open rooms, players in waiting rooms, and total active players
 * Uses useSocketOptional to gracefully handle cases where socket context isn't available
 */
export function useLiveRoomStats(): LiveRoomStats {
  const socketContext = useSocketOptional();
  const socket = socketContext?.socket ?? null;
  const isConnected = socketContext?.isConnected ?? false;
  // No SocketProvider (e.g. landing page) = no live source that will ever
  // connect. Start resolved so the stats cards don't sit in a loading state
  // for the 3s fallback timeout below every single page load.
  const hasProvider = socketContext !== null;
  const [stats, setStats] = useState<Omit<LiveRoomStats, 'refresh'>>({
    openRooms: 0,
    totalPlayers: 0,
    activePlayers: 0,
    isLoading: hasProvider,
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

    // Count all players in active rooms (waiting + in-progress)
    const activeRooms = rooms.filter(room =>
      room.gameState === 'waiting' || room.gameState === 'in-progress'
    );
    const activePlayers = activeRooms.reduce((sum, room) => sum + (room.playerCount || 0), 0);

    setStats({
      openRooms: openRooms.length,
      totalPlayers,
      activePlayers,
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for active rooms updates
    socket.on('activeRooms', handleActiveRooms);

    // Request active rooms on mount
    socket.emit('getActiveRooms');

    // Poll every 30 seconds to keep stats fresh — skip when tab is hidden
    const interval = setInterval(() => {
      if (socket.connected && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        socket.emit('getActiveRooms');
      }
    }, 30000);

    return () => {
      socket.off('activeRooms', handleActiveRooms);
      clearInterval(interval);
    };
  }, [socket, isConnected, handleActiveRooms]);

  // Fallback: a provider exists but hasn't connected yet — give it 3s then
  // stop showing loading. Skip entirely when there's no provider (already
  // resolved above) so the landing page never waits on a socket that can't come.
  useEffect(() => {
    if (hasProvider && !isConnected) {
      const timeout = setTimeout(() => {
        setStats(prev => ({ ...prev, isLoading: false }));
      }, 3000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [hasProvider, isConnected]);

  return {
    openRooms: stats.openRooms,
    totalPlayers: stats.totalPlayers,
    activePlayers: stats.activePlayers,
    isLoading: stats.isLoading,
    refresh,
  };
}

export default useLiveRoomStats;
