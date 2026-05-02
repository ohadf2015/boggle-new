'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useStore } from 'zustand';
import type { Locale } from '@/lib/word-vault/types';
import { HubFoyer } from '@/components/word-vault/HubFoyer';
import { RoomShell } from '@/components/word-vault/RoomShell';
import { BOOK_1_HEARTH_ROOMS } from '@/lib/word-vault/content/book1-hearth-stub';
import { getGameStore, type WordVaultStore } from '@/lib/word-vault/state/gameStore';

interface PageClientProps {
  locale: Locale;
}

type Screen =
  | { kind: 'story'; roomId: string }
  | { kind: 'hub' }
  | { kind: 'transition'; nextRoomId: string | null };

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
        <p className="max-w-md text-lg text-white/80">
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
        onEnterRoom={(roomId) => setScreen({ kind: 'story', roomId })}
      />
    );
  }

  if (screen.kind === 'transition') {
    return <SceneTransition nextRoomId={screen.nextRoomId} setScreen={setScreen} />;
  }

  return (
    <SceneFrame>
      <RoomShell
        store={store}
        roomId={screen.roomId}
        onExit={() => {
          // After solving (or backing out): smooth transition to next room (or hub if last)
          const next = getNextRoomId(screen.roomId);
          setScreen({ kind: 'transition', nextRoomId: next });
        }}
      />
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
  useEffect(() => {
    const t = setTimeout(() => {
      if (nextRoomId) setScreen({ kind: 'story', roomId: nextRoomId });
      else setScreen({ kind: 'hub' });
    }, 900);
    return () => clearTimeout(t);
  }, [nextRoomId, setScreen]);

  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#050309]"
      style={{ animation: 'wv-sceneIn 600ms ease-out' }}
    >
      {/* Soft ember pulse during transition */}
      <div
        className="h-2 w-2 rounded-full"
        style={{
          background: 'rgba(255,140,60,0.9)',
          boxShadow: '0 0 32px 8px rgba(255,140,60,0.6)',
          animation: 'wv-pulse 1.4s ease-in-out infinite',
        }}
      />
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
      className="fixed left-3 bottom-3 z-30 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/30 text-white/40 backdrop-blur transition hover:text-white/80"
    >
      ☰
    </button>
  );
}
