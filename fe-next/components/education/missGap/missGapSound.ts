/**
 * Sound for the homework game.
 *
 * Why not `useSoundEffects()`: the global SFX context gates every play on
 * `audioUnlocked` AND `isGameActive`, both of which are owned by the live
 * multiplayer shell. A homework link is a cold share link opened by a student
 * who has never touched the app — those gates would silence the whole session.
 *
 * So: a tiny dedicated player over the same user setting. It reads the SAME
 * localStorage key the settings UI writes (`boggle_sfx_settings`), so muting the
 * app mutes the homework too, and it never autoplays anything before the
 * student's first tap.
 */
'use client';

import { useCallback, useEffect, useRef } from 'react';

const SFX_STORAGE_KEY = 'boggle_sfx_settings';

export const HOMEWORK_SOUNDS = {
  tap: { src: '/sounds/homework-tap.mp3', volume: 0.35 },
  correct: { src: '/sounds/homework-correct.mp3', volume: 0.55 },
  wrong: { src: '/sounds/homework-wrong.mp3', volume: 0.4 },
  streak: { src: '/sounds/homework-streak.mp3', volume: 0.5 },
  complete: { src: '/sounds/homework-complete.mp3', volume: 0.6 },
} as const;

export type HomeworkSoundKey = keyof typeof HOMEWORK_SOUNDS;

/** The app's own SFX setting. Unreadable storage → treat as "not muted". */
export function readSfxSetting(): { muted: boolean; volume: number } {
  try {
    const raw = window.localStorage.getItem(SFX_STORAGE_KEY);
    if (!raw) return { muted: false, volume: 1 };
    const parsed = JSON.parse(raw) as { muted?: boolean; volume?: number };
    return {
      muted: parsed.muted === true,
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : 1,
    };
  } catch {
    return { muted: false, volume: 1 };
  }
}

export function useMissGapSound() {
  const cache = useRef<Partial<Record<HomeworkSoundKey, HTMLAudioElement>>>({});

  useEffect(() => {
    const pool = cache.current;
    return () => {
      for (const audio of Object.values(pool)) {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      }
      cache.current = {};
    };
  }, []);

  return useCallback((key: HomeworkSoundKey) => {
    if (typeof window === 'undefined') return;
    const setting = readSfxSetting();
    if (setting.muted) return;
    const spec = HOMEWORK_SOUNDS[key];
    try {
      let audio = cache.current[key];
      if (!audio) {
        audio = new Audio(spec.src);
        audio.preload = 'auto';
        cache.current[key] = audio;
      }
      audio.currentTime = 0;
      audio.volume = spec.volume * setting.volume;
      // A share link can be opened with no prior gesture; a rejected play is
      // expected and must not throw into the render path.
      void audio.play().catch(() => undefined);
    } catch {
      /* audio is a nice-to-have, never a blocker */
    }
  }, []);
}
