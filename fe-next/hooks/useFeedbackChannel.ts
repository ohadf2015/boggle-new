'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { playWordFindChord } from '../lib/audio/wordFindChord';
import { useSoundEffects } from '../contexts/SoundEffectsContext';
import { useReducedMotion } from './useReducedMotion';

export type FeedbackEvent =
  | { type: 'word-found-self'; word: string; score: number }
  | { type: 'word-found-opponent'; word: string; score: number }
  | { type: 'steal'; word: string; fromUserId: string }
  | { type: 'combo'; count: number }
  | { type: 'round-end'; winnerId: string };

export interface VisualState {
  flash: boolean;
  shake: boolean;
  popup?: { word: string; score: number };
}

const FLASH_MS = 600;
const SHAKE_MS = 100;

/**
 * Fans game events to three feedback channels: audio (`playWordFindChord` +
 * coin collect), visual (flash + popup + shake state), and respects
 * `useReducedMotion` for the visual half (audio still plays so silent users
 * still get readable feedback elsewhere via the words ladder bump).
 *
 * Returned visual state should be consumed by a sibling overlay (`<FeedbackHost>`)
 * mounted inside the desktop shell.
 */
export function useFeedbackChannel() {
  const [visual, setVisual] = useState<VisualState>({ flash: false, shake: false });
  const { playCoinCollectSound } = useSoundEffects();
  const reduced = useReducedMotion();
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    };
  }, []);

  const fire = useCallback((event: FeedbackEvent) => {
    switch (event.type) {
      case 'word-found-self': {
        playWordFindChord(event.word.length, 0);
        playCoinCollectSound();
        if (!reduced) {
          setVisual({ flash: true, shake: false, popup: { word: event.word, score: event.score } });
          if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
          flashTimeoutRef.current = setTimeout(
            () => setVisual(s => ({ ...s, flash: false, popup: undefined })),
            FLASH_MS,
          );
        }
        break;
      }
      case 'word-found-opponent':
        playWordFindChord(1, 0);
        break;
      case 'combo':
        playWordFindChord(event.count, 1);
        break;
      case 'steal':
        playWordFindChord(2, -1);
        break;
      case 'round-end':
        if (!reduced) {
          setVisual({ flash: false, shake: true });
          if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
          shakeTimeoutRef.current = setTimeout(() => setVisual(s => ({ ...s, shake: false })), SHAKE_MS);
        }
        break;
    }
  }, [playCoinCollectSound, reduced]);

  return { visual, fire };
}
