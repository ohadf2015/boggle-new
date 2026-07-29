'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useStore } from 'zustand';
import type { Locale } from '@/lib/word-vault/types';
import { GameHud } from '@/components/word-vault/GameHud';
import { HubFoyer } from '@/components/word-vault/HubFoyer';
import { RoomShell } from '@/components/word-vault/RoomShell';
import { BOOK_1_HEARTH_ROOMS } from '@/lib/word-vault/content/book1-hearth-stub';
import { getGameStore, type WordVaultStore } from '@/lib/word-vault/state/gameStore';

// Pixi overlay only mounts during scene transitions — keeps the rest of the
// page free of the Pixi runtime cost on first paint.
const EmberOverlayLazy = dynamic(
  () => import('@/components/word-vault/pixi/EmberOverlay').then((m) => m.EmberOverlay),
  { ssr: false },
);

interface PageClientProps {
  locale: Locale;
}

type Screen =
  | { kind: 'story'; roomId: string; isRevisit?: boolean }
  | { kind: 'hub' }
  | { kind: 'transition'; nextRoomId: string | null }
  | { kind: 'book-end' };

const ROOM_ORDER = BOOK_1_HEARTH_ROOMS.map((r) => r.id);

function getNextRoomId(currentRoomId: string): string | null {
  const idx = ROOM_ORDER.indexOf(currentRoomId);
  if (idx < 0 || idx >= ROOM_ORDER.length - 1) return null;
  return ROOM_ORDER[idx + 1];
}

export function PageClient({ locale }: PageClientProps) {
  const [store, setStore] = useState<WordVaultStore | null>(null);
  const [screen, setScreen] = useState<Screen>({ kind: 'story', roomId: ROOM_ORDER[0] });

  useEffect(() => {
    setStore(() => getGameStore());
  }, []);

  useEffect(() => {
    if (store) store.getState().setLocale(locale);
  }, [store, locale]);

  if (locale !== 'he') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#0b1220] p-8 text-center text-white">
        <h1 className="font-fredoka mb-4 text-4xl font-bold text-lime-300">Word Vault</h1>
        <p className="max-w-md text-lg text-white">
          Hebrew-only Book 1 demo. English coming in v1.5.
        </p>
        <Link
          href="/he/word-vault"
          className="mt-6 rounded-md border-2 border-lime-300 bg-[#0b1220] px-6 py-3 font-bold text-lime-300 transition hover:bg-lime-300 hover:text-[#0b1220]"
        >
          Open Hebrew demo →
        </Link>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#000] text-white" />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#0b1220] text-white" dir="rtl">
      <SceneRouter store={store} screen={screen} setScreen={setScreen} />
    </div>
  );
}

function SceneRouter({
  store,
  screen,
  setScreen,
}: {
  store: WordVaultStore;
  screen: Screen;
  setScreen: (s: Screen) => void;
}) {
  // resume-from-progress: jump to the latest unsolved room on first mount
  const solvedRooms = useStore(store, (s) => s.solvedRooms);
  const latestUnsolved = useMemo(() => {
    for (const id of ROOM_ORDER) {
      if (!solvedRooms.includes(id)) return id;
    }
    return null;
  }, [solvedRooms]);

  // Auto-jump on first mount if user has progress
  const [autoJumped, setAutoJumped] = useState(false);
  useEffect(() => {
    if (autoJumped) return;
    setAutoJumped(true);
    if (latestUnsolved && latestUnsolved !== ROOM_ORDER[0]) {
      setScreen({ kind: 'story', roomId: latestUnsolved });
    } else if (latestUnsolved === null) {
      setScreen({ kind: 'hub' });
    }
    // else stay on default room-1-1
  }, [autoJumped, latestUnsolved, setScreen]);

  if (screen.kind === 'hub') {
    return (
      <HubFoyer
        store={store}
        onEnterRoom={(roomId) => {
          const isRevisit = solvedRooms.includes(roomId);
          setScreen({ kind: 'story', roomId, isRevisit });
        }}
      />
    );
  }

  if (screen.kind === 'transition') {
    return <SceneTransition nextRoomId={screen.nextRoomId} setScreen={setScreen} />;
  }

  if (screen.kind === 'book-end') {
    return <BookEndCinematic onContinue={() => setScreen({ kind: 'hub' })} />;
  }

  return (
    <SceneFrame>
      <RoomShell
        store={store}
        roomId={screen.roomId}
        onExit={() => {
          // Revisit flow: solved-room replays return to hub, never auto-advance
          if (screen.kind === 'story' && screen.isRevisit) {
            setScreen({ kind: 'hub' });
            return;
          }
          // After solving the LAST room: book-end cinematic
          if (screen.roomId === ROOM_ORDER[ROOM_ORDER.length - 1]) {
            setScreen({ kind: 'book-end' });
            return;
          }
          // Otherwise: smooth transition to next room
          const next = getNextRoomId(screen.roomId);
          setScreen({ kind: 'transition', nextRoomId: next });
        }}
      />
      <GameHud store={store} />
      <PauseMenuButton onPause={() => setScreen({ kind: 'hub' })} />
    </SceneFrame>
  );
}

function SceneFrame({ children }: { children: React.ReactNode }) {
  // Wrapper for cross-fade-in on scene mount
  return (
    <div
      className="relative min-h-[100dvh]"
      style={{ animation: 'wv-sceneIn 700ms ease-out' }}
    >
      {children}
      <style jsx global>{`
        @keyframes wv-sceneIn {
          0% { opacity: 0; transform: scale(0.985); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes wv-sceneOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function SceneTransition({
  nextRoomId,
  setScreen,
}: {
  nextRoomId: string | null;
  setScreen: (s: Screen) => void;
}) {
  // Lazy import to keep the room-scene bundle smaller — only loaded when a
  // transition actually fires (typically once per room).
  const [burst, setBurst] = useState<{ id: number; x: number; y: number } | null>(null);
  useEffect(() => {
    const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 200;
    const cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 200;
    setBurst({ id: Date.now(), x: cx, y: cy });
    const t = setTimeout(() => {
      if (nextRoomId) setScreen({ kind: 'story', roomId: nextRoomId });
      else setScreen({ kind: 'hub' });
    }, 1100);
    return () => clearTimeout(t);
  }, [nextRoomId, setScreen]);

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#050309]"
      style={{ animation: 'wv-sceneIn 600ms ease-out' }}
    >
      {/* Pixi ember overlay — bursts on enter for a dramatic scene-shift beat. */}
      <EmberOverlayLazy density={36} tint={0xff6b35} intensity={0.6} burst={burst ?? undefined} />

      {/* Sigil mark — pulses softly in/out. */}
      <div className="relative z-10 text-center">
        <p
          className="font-serif italic text-3xl text-orange-200/80"
          style={{ textShadow: '0 0 28px rgba(255,107,53,0.45)' }}
        >
          ⟡
        </p>
        <p className="mt-3 font-rubik text-[10px] uppercase tracking-[0.4em] text-orange-100/40">
          ...
        </p>
      </div>

      <style jsx global>{`
        @keyframes wv-pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.6); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function PauseMenuButton({ onPause }: { onPause: () => void }) {
  return (
    <button
      type="button"
      onClick={onPause}
      aria-label="תפריט"
      className="fixed left-3 bottom-3 z-30 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur transition hover:text-white"
    >
      ☰
    </button>
  );
}

function BookEndCinematic({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{
        background:
          'radial-gradient(ellipse at 50% 40%, rgba(255,210,140,0.4) 0%, rgba(20,12,8,0.98) 70%), #0a0604',
      }}
      dir="rtl"
    >
      {/* Floating embers */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="absolute"
            style={{
              left: `${(i * 7.7) % 100}%`,
              bottom: 0,
              width: 3 + (i % 3),
              height: 3 + (i % 3),
              background: i % 4 === 0 ? '#fff5d8' : '#ffaa44',
              borderRadius: '50%',
              boxShadow: '0 0 10px rgba(255,180,80,0.85)',
              animation: `wv-bookEmber ${10 + (i % 7)}s ${(i * 0.5) % 8}s linear infinite`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* Title */}
      <p
        className="font-fredoka text-xs uppercase tracking-[0.5em] text-amber-200/55"
        style={{ animation: 'wv-fadeUp 1.2s ease-out 0s both' }}
      >
        ספר 1 — אולמות האח
      </p>
      <h1
        className="mt-3 font-fredoka text-5xl font-black text-amber-200 sm:text-6xl"
        style={{
          textShadow: '3px 3px 0 #000, 0 0 40px rgba(255,180,80,0.85)',
          animation: 'wv-fadeUp 1.4s ease-out 0.4s both',
        }}
      >
        אורי חזר.
      </h1>

      {/* Cael portrait */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/word-vault/characters/cael.png"
        alt="אורי"
        className="mt-6 h-56 w-56 object-contain sm:h-72 sm:w-72"
        style={{
          filter: 'drop-shadow(0 0 60px rgba(255,225,170,0.95))',
          animation: 'wv-fadeUp 1.6s ease-out 0.8s both, wv-caelGlow 4s ease-in-out 2s infinite',
        }}
      />

      {/* Story closure */}
      <p
        className="mt-6 max-w-md font-rubik text-base leading-relaxed text-white sm:text-lg"
        style={{ animation: 'wv-fadeUp 1.8s ease-out 1.4s both' }}
      >
        הלבה התקררה. הסדקים נסגרו. רגע אחד הוא חזר —
        <br />
        חיבק את אש, לחש &quot;תודה&quot;, ונעלם.
        <br />
        השאיר אחריו: ספר מתכונים, קמע גחלת, ושיר אותיות אחד.
      </p>

      {/* Loot earned */}
      <div
        className="mt-6 flex flex-wrap items-center justify-center gap-3"
        style={{ animation: 'wv-fadeUp 2s ease-out 2s both' }}
      >
        <BookEndChip emoji="📖" label="ספר המתכונים" />
        <BookEndChip emoji="🔥" label="קמע גחלת" />
        <BookEndChip emoji="🎵" label="שיר אותיות 1/4" />
      </div>

      <p
        className="mt-6 max-w-md font-fredoka text-sm uppercase tracking-[0.3em] text-amber-200/55"
        style={{ animation: 'wv-fadeUp 2.4s ease-out 2.8s both' }}
      >
        עוד שלושה בני דודים. עוד שלוש אחיות. ספר 2 בקרוב.
      </p>

      {/* Continue button */}
      <button
        type="button"
        onClick={onContinue}
        className="mt-8 rounded-md border-4 border-amber-300 bg-amber-200 px-10 py-3 font-fredoka text-xl font-black text-[#1a0e08] shadow-[4px_4px_0_0_#000] transition active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000]"
        style={{ animation: 'wv-fadeUp 2.6s ease-out 3.4s both' }}
      >
        חזרה למרתף &nbsp;→
      </button>

      <style jsx global>{`
        @keyframes wv-fadeUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes wv-bookEmber {
          0% { opacity: 0; transform: translate(0, 0) scale(1); }
          10% { opacity: 0.95; }
          90% { opacity: 0.6; }
          100% { opacity: 0; transform: translate(60px, -120vh) scale(0.4); }
        }
        @keyframes wv-caelGlow {
          0%,100% { filter: drop-shadow(0 0 50px rgba(255,225,170,0.85)); }
          50% { filter: drop-shadow(0 0 90px rgba(255,235,180,1)); }
        }
      `}</style>
    </div>
  );
}

function BookEndChip({ emoji, label }: { emoji: string; label: string }) {
  return (
    <span className="flex items-center gap-2 rounded-md border-4 border-amber-300 bg-[#1a0e08]/90 px-4 py-2 font-fredoka text-base font-black text-amber-200 shadow-[3px_3px_0_0_#000]">
      <span className="text-2xl">{emoji}</span>
      <span>{label}</span>
    </span>
  );
}
