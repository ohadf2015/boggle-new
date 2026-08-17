'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';
import { io, type Socket } from 'socket.io-client';
import type { WordCraftGameState } from '@/shared/types/wordcraft';

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

  const [gameState, setGameState] = useState<WordCraftGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [yourSeat, setYourSeat] = useState<'player1' | 'player2' | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedRackTile, setSelectedRackTile] = useState<string | null>(null);
  const [selectedBoardPos, setSelectedBoardPos] = useState<{ row: number; col: number } | null>(null);
  const [placements, setPlacements] = useState<Array<{ tileId: string; pos: { row: number; col: number }; letter: string }>>([]);

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

    // A rejected move is part of playing, not a broken connection. Only errors
    // that mean "you are not in a playable match" may replace the screen; a
    // dictionary or placement rejection has to leave the board, the rack and the
    // pending tiles exactly where they are so the player can try again.
    // Observed before this split: submitting a word the dictionary didn't know
    // replaced the whole match with a dead-end "Connection Error / Back" screen.
    const FATAL_ERRORS = new Set(['NOT_IN_ROOM', 'ROOM_FULL', 'MATCH_CREATION_FAILED', 'MATCH_NOT_FOUND']);

    const handleError = (data: any) => {
      const code = data?.error || 'UNKNOWN_ERROR';
      if (FATAL_ERRORS.has(code)) {
        console.error('[WordCraft MP] Fatal error from server:', data);
        setError(code);
        return;
      }
      console.warn('[WordCraft MP] Move rejected:', data);
      setMoveError(code);
    };

    const handleMoveAccepted = (data: any) => {
      console.log('[WordCraft MP] Move accepted:', data);
      setMoveError(null);
      setPlacements([]);
      setSelectedRackTile(null);
      setSelectedBoardPos(null);
    };

    // Set up listeners first
    socket.on('wordcraftState', handleState);
    socket.on('wordcraftError', handleError);
    socket.on('wordcraftMoveAccepted', handleMoveAccepted);

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
      socket.off('wordcraftMoveAccepted', handleMoveAccepted);
      socket.close();
      socketRef.current = null;
    };
  }, [matchId, username]);

  const addPlacement = () => {
    if (!selectedRackTile || !selectedBoardPos || !gameState) return;

    const currentPlayerRack = yourSeat === 'player1' ? gameState.player1.rack : gameState.player2.rack;
    const rackTile = currentPlayerRack.find((t) => t.id === selectedRackTile);
    if (!rackTile) return;

    // Prevent duplicate placements
    if (placements.some((p) => p.tileId === selectedRackTile)) return;

    setPlacements([
      ...placements,
      {
        tileId: selectedRackTile,
        pos: selectedBoardPos,
        letter: rackTile.letter,
      },
    ]);
    setSelectedRackTile(null);
    setSelectedBoardPos(null);
  };

  const submitMove = () => {
    if (!socketRef.current || placements.length === 0 || !gameState) return;

    const rack = yourSeat === 'player1' ? gameState.player1.rack : gameState.player2.rack;
    socketRef.current.emit('submitWordCraftMove', {
      placements,
      rack,
    });
  };

  const submitPass = () => {
    if (!socketRef.current || !gameState) return;
    socketRef.current.emit('submitWordCraftPass', {});
  };

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

  // Game state display with board
  const inviteUrl = getWordCraftInviteUrl(matchId);
  const currentPlayerRack = yourSeat === 'player1' ? (gameState.player1.rack || []) : (gameState.player2.rack || []);
  const opponentRackCount = yourSeat === 'player1'
    ? (typeof (gameState.player2.rack as any) === 'number' ? gameState.player2.rack : gameState.player2.rack?.length ?? 0)
    : (typeof (gameState.player1.rack as any) === 'number' ? gameState.player1.rack : gameState.player1.rack?.length ?? 0);
  const boardSize = gameState.board.length;
  const isYourTurn = gameState.turn === yourSeat;
  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
  };

  return (
    <div className="flex flex-col w-full h-svh overflow-hidden relative bg-neo-navy texture-halftone">
      <PlayfulBackground intensity="medium" colorScheme="game" />
      <div className="relative z-10 flex flex-col p-6 text-white overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">WordCraft 1v1 - {matchId}</h1>

        {/* Game Info */}
        <div className="bg-neo-navy/50 rounded-lg p-4 mb-4 backdrop-blur">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Your Seat</p>
              <p className="font-bold">{yourSeat}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Current Turn</p>
              <p className="font-bold">{isYourTurn ? '👉 YOUR TURN' : gameState.turn}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Status</p>
              <p className="font-bold">{gameState.gameStatus}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Winner</p>
              <p className="font-bold">{gameState.winner || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="bg-neo-purple/30 rounded-lg p-4 mb-4 backdrop-blur">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-400">{gameState.player1.username}</p>
              <p className="text-2xl font-bold">{gameState.player1.score}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-400">vs</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">{gameState.player2.username}</p>
              <p className="text-2xl font-bold">{gameState.player2.score}</p>
            </div>
          </div>
        </div>

        {/* Board Display */}
        <div className="bg-neo-navy/50 rounded-lg p-4 mb-4 overflow-x-auto">
          <p className="text-sm text-gray-400 mb-2">Board ({boardSize}×{boardSize})</p>
          <div className="text-xs text-gray-500 mb-2">Opponent has {opponentRackCount} tiles</div>
          <div className="inline-block">
            {gameState.board.map((row, r) => (
              <div key={r} className="flex">
                {row.map((cell, c) => (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => isYourTurn && selectedRackTile && setSelectedBoardPos({ row: r, col: c })}
                    className={`w-8 h-8 border border-gray-600 flex items-center justify-center text-xs font-bold ${
                      cell ? 'bg-neo-pink text-white' : 'bg-gray-900 hover:bg-gray-800'
                    } ${selectedBoardPos?.row === r && selectedBoardPos?.col === c ? 'ring-2 ring-yellow-400' : ''}`}
                  >
                    {cell?.letter || '.'}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Your Rack */}
        <div className="bg-neo-navy/50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-400 mb-2">Your Rack</p>
          <div className="flex gap-2 flex-wrap">
            {currentPlayerRack.map((tile) => (
              <button
                key={tile.id}
                onClick={() => isYourTurn && setSelectedRackTile(tile.id)}
                className={`px-3 py-2 rounded font-bold text-sm ${
                  selectedRackTile === tile.id ? 'bg-yellow-500 text-black' : 'bg-neo-pink text-white hover:bg-neo-pink/80'
                }`}
              >
                {tile.letter}
              </button>
            ))}
          </div>
        </div>

        {/* A rejected move says what happened and leaves everything in place. */}
        {moveError && (
          <p role="status" className="text-sm font-bold text-neo-yellow">
            {moveError === 'INVALID_WORD'
              ? 'That word is not in the dictionary — your tiles are still yours.'
              : moveError === 'NOT_YOUR_TURN'
                ? "It is not your turn yet."
                : moveError === 'INVALID_PLACEMENT'
                  ? 'Tiles must form one line, connected to the board.'
                  : `Move rejected (${moveError}).`}
          </p>
        )}

        {/* Controls */}
        {isYourTurn && (
          <div className="flex gap-2 flex-wrap">
            {selectedRackTile && selectedBoardPos && (
              <button
                onClick={addPlacement}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Place Tile at ({selectedBoardPos.row}, {selectedBoardPos.col})
              </button>
            )}
            <button
              onClick={submitMove}
              disabled={placements.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Move ({placements.length})
            </button>
            <button
              onClick={submitPass}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Pass
            </button>
          </div>
        )}

        <button
          onClick={copyInvite}
          className="mt-4 px-4 py-2 bg-neo-pink text-white rounded-lg hover:bg-neo-pink/80 w-fit"
        >
          Copy Invite Link
        </button>

        <p className="text-sm text-gray-400 mt-4">✓ Connected to multiplayer server</p>
      </div>
    </div>
  );
}
