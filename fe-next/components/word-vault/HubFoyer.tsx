'use client';
/* eslint-disable @next/next/no-img-element -- Decorative character sprites; next/image not needed. */

import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';
import posthog from 'posthog-js';
import { BOOK_1_HEARTH_ROOMS } from '@/lib/word-vault/content/book1-hearth-stub';
import type { WordVaultStore } from '@/lib/word-vault/state/gameStore';

interface HubFoyerProps {
  store: WordVaultStore;
  onEnterRoom: (roomId: string) => void;
}

// Short atmospheric teasers shown on locked doors — creates mystery without spoiling
const LOCKED_TEASERS: Record<string, string> = {
  'room-1-2': 'שירה ישנה נשמעת מבעד לדלת...',
  'room-1-3': 'ריח של תבלינים מוסתרים',
  'room-1-4': 'עשן עולה מן המרתף',
  'room-1-5': 'מטבח שהפסיק לנשום',
  'room-1-6': 'לחישה: "חזרי, קטנטונת..."',
};

export function HubFoyer({ store, onEnterRoom }: HubFoyerProps) {
  const solvedRooms = useStore(store, (s) => s.solvedRooms);

  useEffect(() => {
    posthog.capture('word_vault_hub_visited', { solved_count: solvedRooms.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextRoom = useMemo(() => {
    for (const r of BOOK_1_HEARTH_ROOMS) {
      if (!solvedRooms.includes(r.id)) return r;
    }
    return null;
  }, [solvedRooms]);

  const allDone = nextRoom === null;

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col items-center overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 50% 80%, rgba(255,107,53,0.14) 0%, transparent 55%), linear-gradient(180deg, #060a12 0%, #0b1220 40%, #130a0a 100%)',
      }}
      dir="rtl"
    >
      {/* Cinder villain — lurking in corner */}
      <img
        src="/word-vault/villains/cinder.png"
        alt=""
        aria-hidden="true"
        width={200}
        height={200}
        className="pointer-events-none absolute -bottom-4 -left-6 h-40 w-40 select-none object-contain opacity-35 sm:h-52 sm:w-52"
        style={{ filter: 'drop-shadow(0 0 28px rgba(255,107,53,0.55))' }}
      />

      {/* Librarian guide — right corner */}
      <img
        src="/word-vault/characters/librarian.png"
        alt=""
        aria-hidden="true"
        width={180}
        height={180}
        className="pointer-events-none absolute bottom-0 right-0 h-36 w-36 select-none object-contain opacity-55 sm:h-48 sm:w-48"
      />

      <EmberParticles />

      {/* Header */}
      <div className="relative z-10 mt-10 flex flex-col items-center px-4 text-center">
        {/* Melo hero character */}
        <img
          src="/word-vault/characters/melo.png"
          alt="אש"
          width={120}
          height={120}
          className="pointer-events-none h-24 w-24 select-none object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)] sm:h-28 sm:w-28"
        />
        <h1
          className="mt-2 font-fredoka text-4xl font-black uppercase tracking-[0.2em] text-orange-100 sm:text-5xl"
          style={{ textShadow: '0 0 30px rgba(255,107,53,0.4), 2px 2px 0 rgba(0,0,0,0.8)' }}
        >
          מרתף המילים
        </h1>
        <p className="mt-1 font-rubik text-[11px] uppercase tracking-[0.35em] text-orange-200/45">
          ספר 1 · אולמות האח · {solvedRooms.length}/{BOOK_1_HEARTH_ROOMS.length} חדרים
        </p>
      </div>

      {/* Quick-continue CTA */}
      {!allDone && nextRoom && (
        <button
          type="button"
          onClick={() => onEnterRoom(nextRoom.id)}
          className="relative z-10 mt-5 overflow-hidden rounded-sm border border-orange-400/70 bg-gradient-to-b from-[#3d2010] to-[#1a0e08] px-10 py-3 font-fredoka text-base font-bold uppercase tracking-[0.25em] text-orange-100 transition active:translate-y-[1px]"
          style={{ boxShadow: '0 0 20px rgba(255,107,53,0.3), 0 2px 0 rgba(0,0,0,0.5)' }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(255,120,40,0.2) 0%, transparent 70%)',
            }}
          />
          המשך → {nextRoom.title.he}
        </button>
      )}
      {allDone && (
        <p className="relative z-10 mt-5 font-rubik text-sm uppercase tracking-[0.35em] text-amber-300">
          ✦ ספר 1 הושלם ✦
        </p>
      )}

      {/* Corridor divider */}
      <div
        className="relative z-10 mt-6 w-full max-w-sm px-4"
        aria-label="מפת חדרי המרתף"
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="h-px flex-1 bg-orange-900/40" aria-hidden="true" />
          <span className="font-rubik text-[10px] uppercase tracking-[0.4em] text-orange-300/40">
            מסדרון
          </span>
          <span className="h-px flex-1 bg-orange-900/40" aria-hidden="true" />
        </div>

        {/* Room door cards */}
        <ul className="flex flex-col gap-2.5" role="list">
          {BOOK_1_HEARTH_ROOMS.map((room, idx) => {
            const isSolved = solvedRooms.includes(room.id);
            const isLocked = idx > 0 && !solvedRooms.includes(BOOK_1_HEARTH_ROOMS[idx - 1].id);
            const isNext = !isSolved && !isLocked;

            const teaser = isSolved
              ? room.storyBeat.he.slice(0, 55) + (room.storyBeat.he.length > 55 ? '…' : '')
              : isLocked
              ? LOCKED_TEASERS[room.id] ?? '...'
              : room.storyBeat.he.slice(0, 55) + '…';

            return (
              <li key={room.id}>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => onEnterRoom(room.id)}
                  aria-label={`${room.title.he} — ${isSolved ? 'הושלם' : isLocked ? 'נעול' : 'פתוח'}`}
                  className={[
                    'group relative w-full overflow-hidden rounded-sm border-2 px-4 py-3 text-right transition',
                    isLocked
                      ? 'cursor-not-allowed border-white/8 bg-black/20'
                      : isSolved
                      ? 'border-amber-700/50 bg-amber-950/30 hover:border-amber-500/70'
                      : 'border-orange-500/60 bg-[#1e0f06]/70 hover:border-orange-400',
                  ].join(' ')}
                  style={
                    isNext
                      ? { boxShadow: '0 0 18px rgba(255,107,53,0.22), inset 0 0 20px rgba(255,107,53,0.06)' }
                      : undefined
                  }
                >
                  {/* Active-room glow pulse */}
                  {isNext && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{ animation: 'wv-doorGlow 2.8s ease-in-out infinite' }}
                    />
                  )}

                  {/* Door plate row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      {/* Room number tag + title */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={[
                            'shrink-0 rounded-sm border px-1.5 py-0.5 font-rubik text-[9px] font-bold uppercase tracking-wider',
                            isLocked
                              ? 'border-white/10 text-white/20'
                              : isSolved
                              ? 'border-amber-700/60 text-amber-600/70'
                              : 'border-orange-500/60 text-orange-400',
                          ].join(' ')}
                        >
                          {idx + 1}
                        </span>
                        <span
                          className={[
                            'truncate font-fredoka text-base font-bold',
                            isLocked ? 'text-white/25' : isSolved ? 'text-amber-200/75' : 'text-orange-100',
                          ].join(' ')}
                        >
                          {room.title.he}
                        </span>
                      </div>
                      {/* Teaser line */}
                      <p
                        className={[
                          'font-rubik text-xs leading-relaxed',
                          isLocked ? 'text-white/18 blur-[2px]' : isSolved ? 'text-amber-200/40' : 'text-orange-200/65',
                        ].join(' ')}
                        aria-hidden={isLocked}
                      >
                        {teaser}
                      </p>
                    </div>

                    {/* State icon */}
                    <span
                      className={[
                        'mt-0.5 shrink-0 text-lg',
                        isLocked ? 'opacity-30' : isSolved ? 'opacity-70' : 'opacity-90',
                      ].join(' ')}
                      aria-hidden="true"
                    >
                      {isLocked ? '🔒' : isSolved ? '✦' : '🕯️'}
                    </span>
                  </div>

                  {/* Solved reward chips */}
                  {isSolved && room.rewards.items && room.rewards.items.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {room.rewards.coins > 0 && (
                        <span className="rounded-sm border border-amber-700/40 bg-amber-950/50 px-1.5 py-0.5 font-rubik text-[9px] text-amber-500/70">
                          +{room.rewards.coins} 🪙
                        </span>
                      )}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bottom breathing room */}
      <div className="h-24 w-full shrink-0" aria-hidden="true" />

      <style jsx global>{`
        @keyframes wv-doorGlow {
          0%, 100% { background: radial-gradient(ellipse at center, rgba(255,107,53,0.08) 0%, transparent 70%); }
          50% { background: radial-gradient(ellipse at center, rgba(255,140,60,0.16) 0%, transparent 70%); }
        }
      `}</style>
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
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          10% { opacity: 0.85; }
          80% { opacity: 0.6; }
          100% { transform: translateY(-100vh) translateX(20px) scale(0.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
