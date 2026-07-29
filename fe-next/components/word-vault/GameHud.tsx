'use client';

import { useState } from 'react';
import { useStore } from 'zustand';
import { BOOK_1_ITEMS } from '@/lib/word-vault/content/book1-hearth-stub';
import type { ItemId } from '@/lib/word-vault/types';
import type { WordVaultStore } from '@/lib/word-vault/state/gameStore';

interface Props {
  store: WordVaultStore;
}

const ITEM_GLYPH: Record<ItemId, string> = {
  'melo-lantern':     '🏮',
  'defrost-candle':   '🕯️',
  'brass-key':        '🗝️',
  'cael-recipe-book': '📖',
  'family-photo':     '🖼️',
  'cinder-charm':     '🔥',
  'broom':            '🧹',
};

export function GameHud({ store }: Props) {
  const [showInventory, setShowInventory] = useState(false);
  const memoryCoins = useStore(store, (s) => s.memoryCoins);
  const hintTokens = useStore(store, (s) => s.hintTokens);
  const items = useStore(store, (s) => s.permanentItems);

  return (
    <>
      {/* Persistent HUD bar at top of every scene */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-3 pt-3"
        dir="rtl"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 100%)',
        }}
      >
        <div className="pointer-events-auto flex items-center gap-2">
          <HudPill icon="🪙" value={memoryCoins} tone="gold" glow={items.includes('cinder-charm')} />
          <HudPill icon="💡" value={hintTokens} tone="cyan" />
        </div>
        <button
          type="button"
          onClick={() => setShowInventory(true)}
          disabled={items.length === 0}
          className="pointer-events-auto flex items-center gap-1 rounded-full border-2 border-amber-300/60 bg-[#1a0e08]/80 px-3 py-1 font-fredoka text-sm font-bold text-amber-200 backdrop-blur disabled:opacity-30"
          aria-label="מלאי"
        >
          🎒
          <span>{items.length}</span>
        </button>
      </div>

      {/* Inventory drawer */}
      {showInventory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-6"
          onClick={() => setShowInventory(false)}
        >
          <div
            className="w-full max-w-md rounded-md border-4 border-amber-300 p-5 shadow-[6px_6px_0_0_#000]"
            style={{ background: 'linear-gradient(180deg, #2a1f14 0%, #1a1208 100%)' }}
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2
                className="font-fredoka text-2xl font-black text-amber-200"
                style={{ textShadow: '2px 2px 0 #000' }}
              >
                המלאי של אש
              </h2>
              <button
                type="button"
                onClick={() => setShowInventory(false)}
                className="rounded border-2 border-white/30 px-2 py-0.5 text-sm text-white"
              >
                סגור
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-center font-rubik text-white">המלאי ריק. עוד לא מצאת כלום.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((id) => {
                  const def = BOOK_1_ITEMS.find((i) => i.id === id);
                  if (!def) return null;
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-3 rounded-md border-2 border-amber-300/30 bg-[#0e0805]/80 px-3 py-2"
                    >
                      <span className="text-2xl leading-none">{ITEM_GLYPH[id]}</span>
                      <div className="flex flex-col">
                        <span className="font-fredoka text-base font-black text-amber-200">{def.name.he}</span>
                        <span className="font-rubik text-xs text-white">{def.description.he}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-4 text-center font-rubik text-[11px] italic text-amber-200/45">
              חלק מהפריטים פעילים בחדרים אחרים.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function HudPill({
  icon,
  value,
  tone,
  glow = false,
}: {
  icon: string;
  value: number;
  tone: 'gold' | 'cyan';
  glow?: boolean;
}) {
  const palette =
    tone === 'gold'
      ? { bg: 'rgba(255,210,90,0.95)', border: '#9c6a14', ink: '#1a0e08' }
      : { bg: 'rgba(120,200,230,0.95)', border: '#2c5168', ink: '#0a141a' };
  return (
    <span
      className="flex items-center gap-1 rounded-full border-2 px-3 py-0.5 font-fredoka font-black"
      style={{
        background: palette.bg,
        borderColor: palette.border,
        color: palette.ink,
        boxShadow: glow ? '0 0 14px 2px rgba(255,107,53,0.65), inset 0 0 8px rgba(255,140,60,0.35)' : undefined,
      }}
    >
      <span>{icon}</span>
      <span>{value}</span>
    </span>
  );
}

/** Helper for scene components: check if player has a particular item. */
export function hasItem(store: WordVaultStore, id: ItemId): boolean {
  return store.getState().permanentItems.includes(id);
}
