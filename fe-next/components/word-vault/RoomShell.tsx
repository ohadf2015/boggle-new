'use client';
/* eslint-disable @next/next/no-img-element -- Decorative character sprites; next/image not needed. */

import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';
import posthog from 'posthog-js';
import { BOOK_1_HEARTH_ROOMS } from '@/lib/word-vault/content/book1-hearth-stub';
import type { WordVaultStore } from '@/lib/word-vault/state/gameStore';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { BeatRunner } from './BeatRunner';
import { ROOM_R1_1 } from '@/lib/word-vault/beats/r1.1';
import { WordConstraintRiddle } from './riddles/WordConstraintRiddle';
import { CipherRiddle } from './riddles/CipherRiddle';
import { LogicSequenceRiddle } from './riddles/LogicSequenceRiddle';
import { CipherPantryScene } from './scenes/CipherPantryScene';
import { ColdStoveScene } from './scenes/ColdStoveScene';
import { DarkDoorScene } from './scenes/DarkDoorScene';
import { LastRecipeScene } from './scenes/LastRecipeScene';
import { OldKitchenScene } from './scenes/OldKitchenScene';
import { SootedWallScene } from './scenes/SootedWallScene';

interface RoomShellProps {
  store: WordVaultStore;
  roomId: string;
  onExit: () => void;
}

export function RoomShell({ store, roomId, onExit }: RoomShellProps) {
  const { enabled: magicGridEnabled } = useFeatureFlag('word-vault.magic-grid');
  const room = useMemo(
    () => BOOK_1_HEARTH_ROOMS.find((r) => r.id === roomId) ?? null,
    [roomId],
  );
  const isAlreadySolved = useStore(store, (s) => s.solvedRooms.includes(roomId));

  useEffect(() => {
    posthog.capture('word_vault_room_entered', { roomId, is_revisit: isAlreadySolved });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Feature-flagged routing: r1.1 → BeatRunner when enabled, fallback to DarkDoorScene
  if (magicGridEnabled && roomId === 'room-1-1') {
    return (
      <BeatRunner
        room={ROOM_R1_1}
        onRoomComplete={() => {
          posthog.capture('word_vault_beat_solved', { roomId: 'room-1-1', beatId: 'open-door' });
          store.getState().solveRoom('room-1-1', { coins: 5 });
          store.getState().markBeatSolved('r1.1', 'open-door');
          onExit();
        }}
        onResult={(r) => {
          if (r.kind === 'invalid') {
            posthog.capture('word_vault_invalid_attempt', { roomId: 'room-1-1', reason: r.reason });
          } else if (r.kind === 'bonus-hit') {
            posthog.capture('word_vault_bonus_word_found', {
              roomId: 'room-1-1',
              word: r.word,
              rarity: r.rarity,
              coins: r.coins,
            });
            store.getState().earnCoins(r.coins);
          } else if (r.kind === 'target-hit') {
            posthog.capture('word_vault_grid_summon_target_hit', { roomId: 'room-1-1' });
          }
        }}
      />
    );
  }

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
    posthog.capture('word_vault_room_solved', { roomId: room.id });
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

  // Room 1.1: full-screen escape-room scene (dark door)
  if (room.id === 'room-1-1') {
    return (
      <div className="relative flex min-h-[100dvh] flex-col text-white">
        <DarkDoorScene
          onSolved={() => {
            handleSolve();
            onExit();
          }}
          onExit={onExit}
        />
        <RevisitBanner roomId={room.id} show={isAlreadySolved} />
      </div>
    );
  }

  // Room 1.2: Cipher Pantry — frozen jars with scrambled labels
  if (room.id === 'room-1-2') {
    return (
      <div className="relative flex min-h-[100dvh] flex-col text-white">
        <CipherPantryScene
          onSolved={() => {
            handleSolve();
            onExit();
          }}
          onExit={onExit}
        />
        <RevisitBanner roomId={room.id} show={isAlreadySolved} />
      </div>
    );
  }

  // Room 1.3: Sooted Wall — wipe-to-reveal multi-layer cipher
  if (room.id === 'room-1-3') {
    return (
      <div className="relative flex min-h-[100dvh] flex-col text-white">
        <SootedWallScene
          onSolved={() => {
            handleSolve();
            onExit();
          }}
          onExit={onExit}
        />
        <RevisitBanner roomId={room.id} show={isAlreadySolved} />
      </div>
    );
  }

  // Room 1.5: Cael's Old Kitchen — observation memory room
  if (room.id === 'room-1-5') {
    return (
      <div className="relative flex min-h-[100dvh] flex-col text-white">
        <OldKitchenScene
          onSolved={() => {
            handleSolve();
            onExit();
          }}
          onExit={onExit}
        />
        <RevisitBanner roomId={room.id} show={isAlreadySolved} />
      </div>
    );
  }

  // Room 1.4: Cold Stove — sequential ignition puzzle
  if (room.id === 'room-1-4') {
    return (
      <div className="relative flex min-h-[100dvh] flex-col text-white">
        <ColdStoveScene
          onSolved={() => {
            handleSolve();
            onExit();
          }}
          onExit={onExit}
          isRevisit={isAlreadySolved}
        />
        <RevisitBanner roomId={room.id} show={isAlreadySolved} />
      </div>
    );
  }

  // Room 1.6: Last Recipe — confrontation/cook climax
  if (room.id === 'room-1-6') {
    return (
      <div className="relative flex min-h-[100dvh] flex-col text-white">
        <LastRecipeScene
          onSolved={() => {
            handleSolve();
            onExit();
          }}
          onExit={onExit}
          isRevisit={isAlreadySolved}
        />
        <RevisitBanner roomId={room.id} show={isAlreadySolved} />
      </div>
    );
  }

  const isHearthRoom = room.chapter === 1;
  const isRedemptionRoom = room.id === 'room-1-6';

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden text-white">
      {/* Hearth atmosphere — only Book 1 */}
      {isHearthRoom && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 opacity-50"
            style={{
              backgroundImage: "url('/word-vault/bg/hearth-halls.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.45) saturate(1.15)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 100%, rgba(255,107,53,0.28) 0%, transparent 60%), linear-gradient(180deg, rgba(11,18,32,0.55) 0%, rgba(26,14,14,0.7) 100%)',
            }}
          />
          {/* Cinder villain mascot — small lurker most rooms, large confrontation in 1.6 */}
          <img
            src="/word-vault/villains/cinder.png"
            alt=""
            aria-hidden={!isRedemptionRoom}
            className={
              isRedemptionRoom
                ? 'pointer-events-none absolute right-1/2 top-20 z-0 h-72 w-72 translate-x-1/2 select-none object-contain opacity-90 sm:h-96 sm:w-96'
                : 'pointer-events-none absolute -top-4 -left-4 z-0 h-32 w-32 select-none object-contain opacity-60 sm:h-40 sm:w-40'
            }
            style={{
              filter: isRedemptionRoom
                ? 'drop-shadow(0 0 40px rgba(255,107,53,0.95))'
                : 'drop-shadow(0 0 20px rgba(255,107,53,0.6))',
              animation: isRedemptionRoom ? 'wv-rage 3.5s ease-in-out infinite' : undefined,
            }}
          />
          {isRedemptionRoom && (
            <style jsx global>{`
              @keyframes wv-rage {
                0%, 100% { transform: translateX(50%) scale(1); }
                50% { transform: translateX(50%) scale(1.04); }
              }
            `}</style>
          )}
        </>
      )}

      <header className="relative z-10 flex items-center justify-between border-b-4 border-white/10 bg-[#0b1220]/90 px-4 py-3 backdrop-blur-sm">
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

      <p className="relative z-10 px-6 pt-4 font-rubik text-sm leading-relaxed text-white">
        {room.storyBeat.he}
      </p>

      <main className="relative z-10 flex flex-1 items-center justify-center p-6">
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

// Per-room revisit copy (shown only when the player re-enters a solved room from the hub)
const REVISIT_LINES: Record<string, string> = {
  'room-1-1': 'הדלת נשארה פתוחה.',
  'room-1-2': 'הצנצנות עוד שם. הקור פחות.',
  'room-1-3': 'הסימנים שלו זוהרים פחות עכשיו.',
  'room-1-4': 'התנור עוד דולק.',
  'room-1-5': 'המטבח התקרר.',
  'room-1-6': 'המזבח נשאר ריק. הוא הלך.',
};

function RevisitBanner({ roomId, show }: { roomId: string; show: boolean }) {
  if (!show) return null;
  const line = REVISIT_LINES[roomId];
  if (!line) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center px-4"
      dir="rtl"
      aria-live="polite"
    >
      <p
        className="rounded-full border-2 border-amber-300/45 bg-[#1a0e08]/85 px-4 py-1 font-rubik text-xs text-amber-200/90 backdrop-blur"
        style={{ animation: 'wv-revisitFade 5s ease-out forwards' }}
      >
        ↻ {line}
      </p>
      <style jsx>{`
        @keyframes wv-revisitFade {
          0%   { opacity: 0; transform: translateY(-6px); }
          15%  { opacity: 1; transform: translateY(0); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}

function StoryOnlyRoom({ title, beat, onContinue, onExit, isSolved }: StoryOnlyRoomProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-gradient-to-b from-[#0e1a2b] to-[#0b1220] p-8 text-center">
      <h1 className="font-fredoka text-3xl font-bold text-cyan-300">{title}</h1>
      <p className="max-w-md font-rubik text-lg leading-relaxed text-white">{beat}</p>
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
