'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { BOOK_1_HEARTH_ROOMS } from '@/lib/word-vault/content/book1-hearth-stub';
import type { WordVaultStore } from '@/lib/word-vault/state/gameStore';
import { createHubScene, type HubScene, type HubButtonId } from './pixi/HubScene';

interface HubFoyerProps {
  store: WordVaultStore;
  onEnterRoom: (roomId: string) => void;
}

export function HubFoyer({ store, onEnterRoom }: HubFoyerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<HubScene | null>(null);
  const [activePanel, setActivePanel] = useState<HubButtonId | null>(null);

  const memoryCoins = useStore(store, (s) => s.memoryCoins);
  const hintTokens = useStore(store, (s) => s.hintTokens);
  const solvedRooms = useStore(store, (s) => s.solvedRooms);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    createHubScene(canvas, {
      onButtonClick: (id) => {
        if (id === 'worldmap') {
          setActivePanel('worldmap');
        } else {
          setActivePanel(id);
        }
      },
    }).then((scene) => {
      if (cancelled) {
        scene.destroy();
        return;
      }
      sceneRef.current = scene;
    });

    const onResize = () => {
      const c = canvasRef.current;
      if (!c || !sceneRef.current) return;
      sceneRef.current.resize(c.clientWidth, c.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
  }, []);

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

      <div className="relative flex-1">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
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
