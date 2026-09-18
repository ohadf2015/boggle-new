'use client';

/**
 * ClassroomGameJuiceDemo — Demonstration component showing how
 * LiveClassroomLeaderboard and useClassroomGameJuice work together.
 *
 * This is used only for testing/documentation.
 */

import React, { useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { LiveClassroomLeaderboard } from '../LiveClassroomLeaderboard';
import { useClassroomGameJuice } from '../useClassroomGameJuice';
import type { ClassroomLeaderboardEntry } from '../types';

interface DemoProps {
  mockSocket?: Partial<Socket> | null;
}

export function ClassroomGameJuiceDemo({ mockSocket }: DemoProps) {
  const [players, setPlayers] = useState<ClassroomLeaderboardEntry[]>([
    { id: '1', name: 'Alice', score: 100, wordCount: 5, avatar: null, rank: 1 },
    { id: '2', name: 'Bob', score: 80, wordCount: 4, avatar: null, rank: 2 },
    { id: '3', name: 'Charlie', score: 60, wordCount: 3, avatar: null, rank: 3 },
  ]);

  const [isPlaying, setIsPlaying] = useState(false);

  const juice = useClassroomGameJuice({
    socket: (mockSocket as Socket) || null,
    gameMode: 'classic',
    isPlaying,
  });

  // Simulate a score update
  const simulateCorrectAnswer = useCallback(() => {
    const randomPlayer = players[Math.floor(Math.random() * players.length)];
    setPlayers(prev =>
      prev
        .map(p =>
          p.id === randomPlayer.id
            ? {
                ...p,
                score: p.score + Math.floor(Math.random() * 30) + 10,
                wordCount: p.wordCount + 1,
              }
            : p
        )
        .sort((a, b) => b.score - a.score)
        .map((p, idx) => ({ ...p, rank: idx + 1 }))
    );
  }, [players]);

  return (
    <div className="p-4 bg-neo-navy text-neo-white min-h-screen flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-4 py-2 bg-neo-lime text-neo-navy font-bold rounded-neo"
        >
          {isPlaying ? 'Pause Game' : 'Start Game'}
        </button>
        <button
          onClick={simulateCorrectAnswer}
          disabled={!isPlaying}
          className="px-4 py-2 bg-neo-cyan text-neo-navy font-bold rounded-neo disabled:opacity-50"
        >
          Simulate Correct Answer
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 bg-neo-navy-elevated p-4 rounded-neo border-[2px] border-neo-white/20">
          <LiveClassroomLeaderboard
            players={players}
            gameMode="classic"
            isPlaying={isPlaying}
            visibility="full"
          />
        </div>

        <div className="w-64 bg-neo-navy-elevated p-4 rounded-neo border-[2px] border-neo-white/20">
          <h3 className="font-bold mb-2">Juice State</h3>
          <div className="text-xs space-y-1 font-mono">
            <p>Recent Scorers: {juice.recentScorerIds.size}</p>
            <p>
              {Array.from(juice.recentScorerIds).map(id => (
                <span key={id} className="block text-neo-lime">
                  • {players.find(p => p.id === id)?.name}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClassroomGameJuiceDemo;
