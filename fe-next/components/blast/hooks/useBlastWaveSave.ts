'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'lexiclash_blast_highest_wave';

export interface BlastWaveSave {
  highestWave: number;
  lastPlayedAt: string;
}

function loadWaveSave(): BlastWaveSave | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.highestWave === 'number' && typeof parsed.lastPlayedAt === 'string') {
      return parsed as BlastWaveSave;
    }
    return null;
  } catch {
    return null;
  }
}

function persistWaveSave(save: BlastWaveSave): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Storage full or unavailable — non-fatal
  }
}

interface UseBlastWaveSaveReturn {
  /** Highest wave ever reached (0 if none) */
  highestWave: number;
  /** ISO timestamp of last play */
  lastPlayedAt: string | null;
  /** Call when a new wave is reached during gameplay */
  recordWave: (wave: number) => void;
  /** Whether player has saved progress worth resuming from */
  hasSavedProgress: boolean;
}

export function useBlastWaveSave(): UseBlastWaveSaveReturn {
  const [save, setSave] = useState<BlastWaveSave | null>(null);

  useEffect(() => {
    setSave(loadWaveSave());
  }, []);

  const recordWave = useCallback((wave: number) => {
    setSave(prev => {
      const currentHighest = prev?.highestWave ?? 0;
      if (wave <= currentHighest) return prev;
      const updated: BlastWaveSave = {
        highestWave: wave,
        lastPlayedAt: new Date().toISOString(),
      };
      persistWaveSave(updated);
      return updated;
    });
  }, []);

  return {
    highestWave: save?.highestWave ?? 0,
    lastPlayedAt: save?.lastPlayedAt ?? null,
    recordWave,
    hasSavedProgress: (save?.highestWave ?? 0) > 1,
  };
}
