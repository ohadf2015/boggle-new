'use client';

import { useMemo } from 'react';
import { useStore } from 'zustand';
import { BOOK_1_HEARTH_ROOMS } from '@/lib/word-vault/content/book1-hearth-stub';
import type { WordVaultStore } from '@/lib/word-vault/state/gameStore';
import { WordConstraintRiddle } from './riddles/WordConstraintRiddle';
import { CipherRiddle } from './riddles/CipherRiddle';
import { LogicSequenceRiddle } from './riddles/LogicSequenceRiddle';

interface RoomShellProps {
  store: WordVaultStore;
  roomId: string;
  onExit: () => void;
}

export function RoomShell({ store, roomId, onExit }: RoomShellProps) {
  const room = useMemo(
    () => BOOK_1_HEARTH_ROOMS.find((r) => r.id === roomId) ?? null,
    [roomId],
  );
  const isAlreadySolved = useStore(store, (s) => s.solvedRooms.includes(roomId));

  if (!room) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-fredoka text-2xl text-pink-300">חדר לא נמצא</p>
        <button
          type="button"
          onClick={onExit}
          className="rounded border-2 border-lime-300 px-4 py-2 font-bold text-lime-300"
        >
          חזרה למרתף
        </button>
      </div>
    );
  }

  const handleSolve = () => {
    store.getState().solveRoom(room.id, room.rewards);
  };

  if (room.riddle === null) {
    return (
      <StoryOnlyRoom
        title={room.title.he}
        beat={room.storyBeat.he}
        onContinue={() => {
          handleSolve();
          onExit();
        }}
        onExit={onExit}
        isSolved={isAlreadySolved}
      />
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-[#1a0e0e] via-[#0b1220] to-[#0b1220] text-white">
      <header className="flex items-center justify-between border-b-4 border-white/10 bg-[#0b1220]/90 px-4 py-3">
        <button
          type="button"
          onClick={onExit}
          className="rounded border-2 border-white/40 px-3 py-1 text-sm text-white"
        >
          ← חזרה
        </button>
        <h1 className="font-fredoka text-xl font-bold text-lime-300">{room.title.he}</h1>
        <span className="w-16" />
      </header>

      <p className="px-6 pt-4 font-rubik text-sm leading-relaxed text-white/80">
        {room.storyBeat.he}
      </p>

      <main className="flex flex-1 items-center justify-center p-6">
        {room.riddle.engine === 'word-constraint' && (
          <WordConstraintRiddle
            riddle={room.riddle}
            store={store}
            onSolved={() => {
              handleSolve();
              onExit();
            }}
          />
        )}
        {room.riddle.engine === 'cipher' && (
          <CipherRiddle
            riddle={room.riddle}
            store={store}
            onSolved={() => {
              handleSolve();
              onExit();
            }}
          />
        )}
        {room.riddle.engine === 'logic-sequence' && (
          <LogicSequenceRiddle
            riddle={room.riddle}
            store={store}
            onSolved={() => {
              handleSolve();
              onExit();
            }}
          />
        )}
      </main>
    </div>
  );
}

interface StoryOnlyRoomProps {
  title: string;
  beat: string;
  onContinue: () => void;
  onExit: () => void;
  isSolved: boolean;
}

function StoryOnlyRoom({ title, beat, onContinue, onExit, isSolved }: StoryOnlyRoomProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-gradient-to-b from-[#0e1a2b] to-[#0b1220] p-8 text-center">
      <h1 className="font-fredoka text-3xl font-bold text-cyan-300">{title}</h1>
      <p className="max-w-md font-rubik text-lg leading-relaxed text-white/80">{beat}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onExit}
          className="rounded border-2 border-white/40 px-4 py-2 font-bold text-white"
        >
          חזרה
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded border-2 border-lime-300 bg-lime-300 px-4 py-2 font-bold text-[#0b1220]"
        >
          {isSolved ? 'חזרה' : 'המשך'}
        </button>
      </div>
    </div>
  );
}
