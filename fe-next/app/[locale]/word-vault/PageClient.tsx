'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/word-vault/types';
import { HubFoyer } from '@/components/word-vault/HubFoyer';
import { RoomShell } from '@/components/word-vault/RoomShell';
import { getGameStore, type WordVaultStore } from '@/lib/word-vault/state/gameStore';

interface PageClientProps {
  locale: Locale;
}

type Screen = { kind: 'hub' } | { kind: 'room'; roomId: string };

export function PageClient({ locale }: PageClientProps) {
  const [store, setStore] = useState<WordVaultStore | null>(null);
  const [screen, setScreen] = useState<Screen>({ kind: 'hub' });

  useEffect(() => {
    setStore(getGameStore());
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
      <div className="flex min-h-[70vh] items-center justify-center bg-[#0b1220] text-white">
        <p className="font-fredoka text-2xl text-lime-300">טוען…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#0b1220] text-white" dir="rtl">
      {screen.kind === 'hub' ? (
        <HubFoyer
          store={store}
          onEnterRoom={(roomId) => setScreen({ kind: 'room', roomId })}
        />
      ) : (
        <RoomShell
          store={store}
          roomId={screen.roomId}
          onExit={() => setScreen({ kind: 'hub' })}
        />
      )}
    </div>
  );
}
