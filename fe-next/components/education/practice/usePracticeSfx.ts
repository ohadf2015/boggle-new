'use client';

/**
 * usePracticeSfx — the sound vocabulary for solo practice.
 *
 * Four of the seven practice modes shipped with no sound at all. Two of them
 * (Spelling, Blitz) had a real streak/combo mechanic underneath, so the mode
 * that most needed audio feedback was the one playing in total silence.
 *
 * The reason they were silent is worth stating, because it is a trap anyone
 * adding a sound here will fall into again: `playSound` defaults
 * `requiresGameActive: true` and no-ops unless something has called
 * `setGameActive(true)`. Practice screens never do. So a mode can author a
 * dozen perfectly good `playSound` calls and ship mute, with no error, no
 * warning and nothing in the console — a silent failure in the literal sense.
 *
 * Every cue below opts out of that gate explicitly. Going through this hook
 * rather than `useSoundEffects` directly is what keeps the next mode from
 * re-acquiring the bug, and a unit test asserts the opt-out on every cue.
 *
 * Volumes are deliberately low: these fire on every keystroke-ish action, and a
 * drill that shouts gets muted by the student within a minute. The app's master
 * mute and SFX volume still apply on top — `playSound` checks them first.
 */

import { useMemo, useRef } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { emitMascotEvent } from '@/lib/blast/mascotBus';

// Drills don't report the word, so a right answer reads as a mid-length word: a cheer, not an awe.
const CHEER_WORD_LENGTH = 5;
const STREAK_DANCE_AT = 3;

export interface PracticeSfx {
  /** A right answer. */
  correct: () => void;
  /** A wrong answer — soft, not a buzzer. */
  wrong: () => void;
  /** A matched pair in Word Matching. */
  match: () => void;
  /** Round begins. */
  start: () => void;
  /** The clock is running out (last few seconds). */
  urgent: () => void;
  /** Clock hit zero. */
  timesUp: () => void;
  /** A hint was spent. */
  hint: () => void;
  /** Advancing to the next question. */
  advance: () => void;
}

export function usePracticeSfx(): PracticeSfx {
  const { playSound } = useSoundEffects();
  const streakRef = useRef(0);

  return useMemo<PracticeSfx>(() => {
    const cheer = () => {
      streakRef.current += 1;
      if (streakRef.current >= STREAK_DANCE_AT) {
        emitMascotEvent({ kind: 'wave-streak', streakCount: streakRef.current });
      }
      emitMascotEvent({ kind: 'word-submitted', wordLength: CHEER_WORD_LENGTH, gemLetterUsed: false });
    };
    return {
      correct: () => {
        playSound('wordAccepted', { requiresGameActive: false, volume: 0.5 });
        cheer();
      },
      wrong: () => {
        streakRef.current = 0;
        playSound('wordRejected', { requiresGameActive: false, volume: 0.35 });
      },
      match: () => {
        playSound('matchFound', { requiresGameActive: false, volume: 0.5 });
        cheer();
      },
      start: () => playSound('roundStart', { requiresGameActive: false, volume: 0.45 }),
      urgent: () => playSound('timerUrgent', { requiresGameActive: false, volume: 0.45 }),
      timesUp: () => playSound('drillComplete', { requiresGameActive: false, volume: 0.55 }),
      hint: () => playSound('hintReveal', { requiresGameActive: false, volume: 0.4 }),
      advance: () => playSound('tileSelect', { requiresGameActive: false, volume: 0.3 }),
    };
  }, [playSound]);
}

export default usePracticeSfx;
