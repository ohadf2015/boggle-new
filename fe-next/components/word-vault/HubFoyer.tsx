'use client';
/* eslint-disable @next/next/no-img-element -- Decorative character sprites; next/image not needed. */

import { useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { BOOK_1_HEARTH_ROOMS } from '@/lib/word-vault/content/book1-hearth-stub';
import type { WordVaultStore } from '@/lib/word-vault/state/gameStore';

interface HubFoyerProps {
  store: WordVaultStore;
  onEnterRoom: (roomId: string) => void;
}

export function HubFoyer({ store, onEnterRoom }: HubFoyerProps) {
  const [showWorldmap, setShowWorldmap] = useState(false);
  const solvedRooms = useStore(store, (s) => s.solvedRooms);

  const nextRoom = useMemo(() => {
    for (const r of BOOK_1_HEARTH_ROOMS) {
      if (!solvedRooms.includes(r.id)) return r;
    }
    return null;
  }, [solvedRooms]);

  const allDone = nextRoom === null;

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 50% 100%, rgba(255,107,53,0.18) 0%, transparent 55%), linear-gradient(180deg, #0b1220 0%, #11182f 60%, #1a0e0e 100%)',
      }}
    >
      {/* Cinder villain mascot — distant, lurking */}
      <img
        src="/word-vault/villains/cinder.png"
        alt=""
        aria-hidden="true"
        width={224}
        height={224}
        className="pointer-events-none absolute -bottom-6 -left-6 h-44 w-44 select-none object-contain opacity-50 sm:h-56 sm:w-56"
        style={{ filter: 'drop-shadow(0 0 24px rgba(255,107,53,0.5))', aspectRatio: '1 / 1' }}
      />

      {/* Librarian — guide */}
      <img
        src="/word-vault/characters/librarian.png"
        alt=""
        aria-hidden="true"
        width={224}
        height={224}
        className="pointer-events-none absolute bottom-2 right-2 h-40 w-40 select-none object-contain sm:h-56 sm:w-56"
        style={{ aspectRatio: '1 / 1' }}
      />

      {/* Melo — hero */}
      <img
        src="/word-vault/characters/melo.png"
        alt="אש"
        width={160}
        height={160}
        className="pointer-events-none relative z-10 h-32 w-32 select-none object-contain drop-shadow-[3px_3px_0_rgba(0,0,0,0.6)] sm:h-40 sm:w-40"
        style={{ aspectRatio: '1 / 1' }}
      />

      {/* Ember particles */}
      <EmberParticles />

      <h1
        className="relative z-10 mt-2 font-fredoka text-4xl font-black uppercase tracking-[0.18em] text-orange-100 sm:text-5xl"
        style={{ textShadow: '0 0 24px rgba(255,107,53,0.35), 2px 2px 0 rgba(0,0,0,0.7)' }}
      >
        מרתף המילים
      </h1>
      <p className="relative z-10 mt-2 font-rubik text-xs uppercase tracking-[0.3em] text-orange-200/50">
        ספר 1 · אולמות האח · {solvedRooms.length} / {BOOK_1_HEARTH_ROOMS.length}
      </p>

      <div className="relative z-10 mt-10 flex flex-col items-center gap-4">
        {!allDone && nextRoom && (
          <button
            type="button"
            onClick={() => onEnterRoom(nextRoom.id)}
            className="group relative rounded-sm border border-orange-300/60 bg-gradient-to-b from-[#3a1f10] to-[#1a0e08] px-12 py-3.5 font-rubik text-base font-bold uppercase tracking-[0.2em] text-orange-100 shadow-[0_0_24px_rgba(255,107,53,0.25)] transition hover:border-orange-200 hover:text-orange-50 hover:shadow-[0_0_36px_rgba(255,107,53,0.45)] active:translate-y-[1px]"
            style={{ letterSpacing: '0.25em' }}
          >
            <span className="absolute inset-0 -z-10 rounded-sm bg-[radial-gradient(ellipse_at_center,_rgba(255,107,53,0.18)_0%,_transparent_70%)]" aria-hidden="true" />
            המשך
          </button>
        )}
        {allDone && (
          <p className="font-rubik text-sm uppercase tracking-[0.3em] text-orange-200" dir="rtl">
            ספר 1 הושלם
          </p>
        )}
        <button
          type="button"
          onClick={() => setShowWorldmap(true)}
          className="border-b border-white/15 px-2 pb-1 font-rubik text-[11px] uppercase tracking-[0.25em] text-white/50 transition hover:border-white/40 hover:text-white/80"
        >
          מפת חדרים
        </button>
      </div>

      {showWorldmap && (
        <WorldmapPanel
          solvedRooms={solvedRooms}
          onClose={() => setShowWorldmap(false)}
          onEnterRoom={(id) => {
            setShowWorldmap(false);
            onEnterRoom(id);
          }}
        />
      )}
    </div>
  );
}

interface WorldmapPanelProps {
  solvedRooms: string[];
  onClose: () => void;
  onEnterRoom: (roomId: string) => void;
}

function WorldmapPanel({ solvedRooms, onClose, onEnterRoom }: WorldmapPanelProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b1220]/95 p-6">
      <div className="w-full max-w-md rounded-sm border border-orange-300/40 bg-[#0b1220]/95 p-6 shadow-[0_0_40px_rgba(255,107,53,0.2)]" dir="rtl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-rubik text-xs uppercase tracking-[0.3em] text-orange-200">ספר 1 · אולמות האח</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border-2 border-white/40 px-2 py-0.5 text-xs text-white/70"
          >
            סגור
          </button>
        </div>
        <ul className="flex flex-col gap-1.5">
          {BOOK_1_HEARTH_ROOMS.map((room, idx) => {
            const isSolved = solvedRooms.includes(room.id);
            const isLocked = idx > 0 && !solvedRooms.includes(BOOK_1_HEARTH_ROOMS[idx - 1].id);
            return (
              <li key={room.id}>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => onEnterRoom(room.id)}
                  className={
                    'flex w-full items-center justify-between rounded border-2 px-3 py-2 font-rubik transition ' +
                    (isLocked
                      ? 'cursor-not-allowed border-white/20 bg-white/5 text-white/40'
                      : isSolved
                      ? 'border-amber-300 bg-amber-300/10 text-amber-200'
                      : 'border-pink-400 bg-pink-400/10 text-white hover:bg-pink-400/30')
                  }
                >
                  <span className="text-right text-sm">
                    <span className="font-bold">{idx + 1}.</span> {room.title.he}
                  </span>
                  <span className="text-xs">
                    {isSolved ? '✓' : isLocked ? '🔒' : '▶'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function EmberParticles() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden motion-reduce:hidden"
    >
      {Array.from({ length: 14 }).map((_, i) => {
        const left = (i * 7.3) % 100;
        const delay = (i * 0.7) % 8;
        const dur = 6 + (i % 5);
        const size = 3 + (i % 3);
        return (
          <span
            key={i}
            className="absolute bottom-0 rounded-full bg-orange-400"
            style={{
              left: `${left}%`,
              width: `${size}px`,
              height: `${size}px`,
              animation: `wv-ember ${dur}s ${delay}s linear infinite`,
              filter: 'blur(1px)',
            }}
          />
        );
      })}
      <style jsx>{`
        @keyframes wv-ember {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.85;
          }
          80% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-100vh) translateX(20px) scale(0.4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
