'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';
import { io, type Socket } from 'socket.io-client';

export interface WordCraftMPProps {
  matchId: string;
}

/**
 * Generate a shareable invite URL for this match.
 * Both players visit this same URL to join the match.
 */
export function getWordCraftInviteUrl(matchId: string, locale: string = 'en'): string {
  if (typeof window === 'undefined') return '';
  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  return `${baseUrl}/${locale}/word-craft?mp=${matchId}`;
}

export default function WordCraftMPClient({ matchId }: WordCraftMPProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const { profile } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const username = profile?.display_name || `Player-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

  const [gameState, setGameState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [yourSeat, setYourSeat] = useState<'player1' | 'player2' | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Create a direct socket connection
    const socket = io(undefined, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    const joinRoom = () => {
      console.log('[WordCraft MP] Joining room', matchId, 'as', username);
      socket.emit('joinWordCraftRoom', { roomId: matchId, username });
    };

    const handleState = (data: any) => {
      console.log('[WordCraft MP] Received state:', data);
      setGameState(data);
      if (data.yourSeat) {
        setYourSeat(data.yourSeat);
      }
      setIsConnected(true);
    };

    const handleError = (data: any) => {
      console.error('[WordCraft MP] Error from server:', data);
      setError(data.error || 'Unknown error');
    };

    // Set up listeners first
    socket.on('wordcraftState', handleState);
    socket.on('wordcraftError', handleError);

    // Join immediately if already connected, otherwise wait
    if (socket.connected) {
      console.log('[WordCraft MP] Socket already connected, joining immediately');
      joinRoom();
    } else {
      socket.once('connect', () => {
        console.log('[WordCraft MP] Socket connected, joining room');
        joinRoom();
      });
    }

    return () => {
      socket.off('wordcraftState', handleState);
      socket.off('wordcraftError', handleError);
      socket.close();
      socketRef.current = null;
    };
  }, [matchId, username]);

  if (error) {
    return (
      <div className="flex flex-col w-full h-svh overflow-hidden relative bg-neo-navy texture-halftone items-center justify-center gap-4">
        <PlayfulBackground intensity="medium" colorScheme="game" />
        <div className="relative z-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Connection Error</h2>
          <p className="text-lg text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-neo-pink text-white rounded-lg hover:bg-neo-pink/80"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected || !gameState) {
    return (
      <div className="flex flex-col w-full h-svh overflow-hidden relative bg-neo-navy texture-halftone">
        <PlayfulBackground intensity="medium" colorScheme="game" />
        <PageLoader size="md" className="relative z-10" />
        <div className="relative z-10 text-center text-white">
          <p className="mt-4">Connecting to WordCraft 1v1...</p>
          <p className="text-sm text-gray-400 mt-2">Match: {matchId}</p>
          <p className="text-sm text-gray-400">You are: {yourSeat || 'loading...'}</p>
        </div>
      </div>
    );
  }

  // Game state display
  const inviteUrl = getWordCraftInviteUrl(matchId);
  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
  };

  return (
    <div className="flex flex-col w-full h-svh overflow-hidden relative bg-neo-navy texture-halftone">
      <PlayfulBackground intensity="medium" colorScheme="game" />
      <div className="relative z-10 flex flex-col p-8 text-white">
        <h1 className="text-3xl font-bold mb-4">WordCraft 1v1 - {matchId}</h1>
        <div className="bg-neo-navy/50 rounded-lg p-6 backdrop-blur mb-4">
          <p className="mb-2"><strong>Your Seat:</strong> {yourSeat}</p>
          <p className="mb-2"><strong>Player 1:</strong> {gameState.player1?.username}</p>
          <p className="mb-2"><strong>Player 2:</strong> {gameState.player2?.username}</p>
          <p className="mb-2"><strong>Current Turn:</strong> {gameState.turn}</p>
          <p className="mb-2"><strong>Status:</strong> {gameState.gameStatus}</p>
          <p className="mb-2"><strong>P1 Score:</strong> {gameState.player1?.score}</p>
          <p className="mb-2"><strong>P2 Score:</strong> {gameState.player2?.score}</p>
        </div>
        <button
          onClick={copyInvite}
          className="px-4 py-2 bg-neo-pink text-white rounded-lg hover:bg-neo-pink/80 w-fit"
        >
          Copy Invite Link
        </button>
        <p className="text-sm text-gray-400 mt-4">
          ✓ Connected to multiplayer server
        </p>
      </div>
    </div>
  );
}
