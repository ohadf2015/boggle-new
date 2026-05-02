'use client';
/* eslint-disable @next/next/no-img-element -- Decorative character sprites; next/image not needed. */

import { useState } from 'react';
import { useStore } from 'zustand';
import { BOOK_1_HEARTH_ROOMS } from '@/lib/word-vault/content/book1-hearth-stub';
import type { WordVaultStore } from '@/lib/word-vault/state/gameStore';

type HubButtonId = 'worldmap' | 'inventory' | 'memory-theatre' | 'shop' | 'settings';

const HUB_BUTTONS: { id: HubButtonId; labelHe: string }[] = [
  { id: 'worldmap', labelHe: 'מפת העולם' },
  { id: 'inventory', labelHe: 'מלאי' },
  { id: 'memory-theatre', labelHe: 'תיאטרון הזיכרון' },
  { id: 'shop', labelHe: 'חנות' },
  { id: 'settings', labelHe: 'הגדרות' },
];

interface HubFoyerProps {
  store: WordVaultStore;
  onEnterRoom: (roomId: string) => void;
}

export function HubFoyer({ store, onEnterRoom }: HubFoyerProps) {
  const [activePanel, setActivePanel] = useState<HubButtonId | null>(null);

  const memoryCoins = useStore(store, (s) => s.memoryCoins);
  const hintTokens = useStore(store, (s) => s.hintTokens);
  const solvedRooms = useStore(store, (s) => s.solvedRooms);

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <header className="flex items-center justify-between border-b-4 border-white/10 bg-[#0b1220]/95 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-lime-300 px-3 py-1 font-fredoka font-bold text-[#0b1220]">
            🪙 {memoryCoins}
          </span>
          <span className="rounded-md bg-cyan-300 px-3 py-1 font-fredoka font-bold text-[#0b1220]">
            💡 {hintTokens}
          </span>
        </div>
        <span className="font-rubik text-sm text-white/70">
          חדרים שנפתרו: {solvedRooms.length} / 6
        </span>
      </header>

      <div
        className="relative flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden px-6 py-8"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 100%, rgba(255,107,53,0.18) 0%, transparent 55%), linear-gradient(180deg, #0b1220 0%, #11182f 60%, #1a0e0e 100%)",
        }}
      >
        {/* Cinder villain mascot — Book 1 boss preview, lurking */}
        <img
          src="/word-vault/villains/cinder.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 -left-6 h-44 w-44 select-none object-contain opacity-50 sm:h-56 sm:w-56"
          style={{ filter: 'drop-shadow(0 0 24px rgba(255,107,53,0.5))' }}
        />

        {/* Librarian — guide, on the right */}
        <img
          src="/word-vault/characters/librarian.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 right-2 h-40 w-40 select-none object-contain sm:h-56 sm:w-56"
        />

        {/* Melo — hero, between us and the page */}
        <img
          src="/word-vault/characters/melo.png"
          alt="מלו"
          className="pointer-events-none relative z-10 h-32 w-32 select-none object-contain drop-shadow-[3px_3px_0_rgba(0,0,0,0.6)] sm:h-40 sm:w-40"
        />

        {/* Ember particles */}
        <EmberParticles />

        <h1 className="relative z-10 font-fredoka text-5xl font-black tracking-tight text-lime-300 drop-shadow-[3px_3px_0_#000] sm:text-6xl">
          מרתף המילים
        </h1>
        <p className="relative z-10 font-rubik text-base text-white/70">ספר 1 — אולמות האח</p>
        <ul className="relative z-10 flex w-full max-w-sm flex-col gap-3 pt-2">
          {HUB_BUTTONS.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => setActivePanel(b.id)}
                className="w-full rounded-md border-4 border-white bg-pink-400 px-6 py-3 text-center font-fredoka text-xl font-bold text-[#0b1220] shadow-[4px_4px_0_0_#000] transition hover:bg-lime-300 active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000]"
              >
                {b.labelHe}
              </button>
            </li>
          ))}
          <li className="pt-2">
            <button
              type="button"
              onClick={() => onEnterRoom('room-1-6')}
              className="w-full rounded-md border-4 border-orange-300 bg-[#1a0e0e] px-6 py-3 text-center font-fredoka text-lg font-bold text-orange-300 shadow-[4px_4px_0_0_#000] transition hover:bg-orange-300 hover:text-[#0b1220]"
            >
              ▶ קרב סינדר (פלייטסט)
            </button>
          </li>
        </ul>
      </div>

      {activePanel === 'worldmap' && (
        <WorldmapPanel
          solvedRooms={solvedRooms}
          onClose={() => setActivePanel(null)}
          onEnterRoom={(id) => {
            setActivePanel(null);
            onEnterRoom(id);
          }}
        />
      )}

      {activePanel && activePanel !== 'worldmap' && (
        <PlaceholderPanel
          panelId={activePanel}
          onClose={() => setActivePanel(null)}
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
      <div className="w-full max-w-md rounded-lg border-4 border-lime-300 bg-[#111a2c] p-6 shadow-[6px_6px_0_0_#000]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-fredoka text-2xl font-bold text-lime-300">ספר 1 — אולמות האח</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border-2 border-white/40 px-3 py-1 text-sm text-white"
          >
            סגור
          </button>
        </div>
        <ul className="flex flex-col gap-2">
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
                    'flex w-full items-center justify-between rounded border-2 px-4 py-3 font-rubik transition ' +
                    (isLocked
                      ? 'cursor-not-allowed border-white/20 bg-white/5 text-white/40'
                      : isSolved
                      ? 'border-lime-300 bg-lime-300/10 text-lime-200'
                      : 'border-pink-400 bg-pink-400/10 text-white hover:bg-pink-400/30')
                  }
                >
                  <span className="text-right">
                    <span className="font-bold">{idx + 1}.</span> {room.title.he}
                  </span>
                  <span className="text-xs">
                    {isSolved ? '✓ נפתר' : isLocked ? '🔒 נעול' : '▶ הכנס'}
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

interface PlaceholderPanelProps {
  panelId: string;
  onClose: () => void;
}

const PANEL_TITLES: Record<string, string> = {
  inventory: 'מלאי',
  'memory-theatre': 'תיאטרון הזיכרון',
  shop: 'חנות',
  settings: 'הגדרות',
};

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

function PlaceholderPanel({ panelId, onClose }: PlaceholderPanelProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b1220]/95 p-6">
      <div className="w-full max-w-sm rounded-lg border-4 border-pink-400 bg-[#111a2c] p-6 text-center shadow-[6px_6px_0_0_#000]">
        <h2 className="mb-2 font-fredoka text-2xl font-bold text-pink-300">
          {PANEL_TITLES[panelId] ?? panelId}
        </h2>
        <p className="mb-4 font-rubik text-white/70">בקרוב.</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded border-2 border-lime-300 px-4 py-2 font-bold text-lime-300"
        >
          סגור
        </button>
      </div>
    </div>
  );
}
