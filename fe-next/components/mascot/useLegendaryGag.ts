'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeMascotEvents } from '@/lib/blast/mascotBus';
import { createSeededRng } from '@/lib/mascot/rng';
import {
  gagDurationMs,
  rollLegendaryRound,
  shouldTriggerLegendary,
  type LegendaryGag,
} from '@/lib/mascot/legendary';
import { loadClipManifest, withClip, type ClipEntry } from '@/lib/mascot/clipManifest';

const LAST_GAG_KEY = 'lexiclash_mascot_last_gag';

function readLastGag(): string | null {
  try {
    return window.localStorage.getItem(LAST_GAG_KEY);
  } catch {
    return null;
  }
}

function writeLastGag(id: string): void {
  try {
    window.localStorage.setItem(LAST_GAG_KEY, id);
  } catch {
    // Storage blocked: worst case the same gag can come back next time.
  }
}

interface Options {
  enabled: boolean;
  seed?: number;
  chance?: number;
  onShow: (gag: LegendaryGag) => void;
}

/** Rolls once per mount (one round); plays the gag at most once. */
export function useLegendaryGag({ enabled, seed, chance, onShow }: Options): LegendaryGag | null {
  const [plan] = useState(() =>
    rollLegendaryRound(createSeededRng(seed ?? Date.now()), { chance, lastGagId: readLastGag() }),
  );
  const [active, setActive] = useState<LegendaryGag | null>(null);
  const fired = useRef(false);
  const wordsFound = useRef(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onShowRef = useRef(onShow);
  onShowRef.current = onShow;
  const clips = useRef<Map<string, ClipEntry>>(new Map());

  useEffect(() => {
    if (!plan?.clip) return;
    let live = true;
    void loadClipManifest().then((map) => {
      if (live) clips.current = map;
    });
    return () => {
      live = false;
    };
  }, [plan]);

  useEffect(() => {
    if (!plan) return;
    let endTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeMascotEvents((event) => {
      if (event.kind !== 'word-submitted' || fired.current) return;
      wordsFound.current += 1;
      if (!enabledRef.current) return;
      if (!shouldTriggerLegendary(plan, { wordsFound: wordsFound.current, wordLength: event.wordLength })) return;
      fired.current = true;
      const gag = withClip(plan, clips.current);
      writeLastGag(gag.id);
      setActive(gag);
      onShowRef.current(gag);
      endTimer = setTimeout(() => setActive(null), gagDurationMs(gag));
    });
    return () => {
      unsubscribe();
      if (endTimer) clearTimeout(endTimer);
    };
  }, [plan]);

  return active;
}
