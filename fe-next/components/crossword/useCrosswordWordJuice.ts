'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { haptics } from '@/utils/haptics';
import { emitMascotEvent } from '@/lib/blast/mascotBus';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { solvedSlotIds } from '@/lib/crossword/stats';
import type { GameState } from '@/lib/crossword/gameState';
import type { Slot } from '@/lib/crossword/types';
import { CROSSWORD_COMBO_WINDOW_MS, comboPunch, freshSolvedSlots, nextComboChain, type ComboPunch } from './crosswordJuice';

/** `full` = solo (combo, burst); `small` = races and classrooms (pop, sound, buzz only). */
export type JuiceIntensity = 'full' | 'small';

interface Options {
  state: GameState;
  gridRef: RefObject<HTMLElement | null>;
  intensity: JuiceIntensity;
}

const cellSelector = (slot: Slot) =>
  slot.cells.map((c) => `[data-cw-cell="${c.row},${c.col}"] [data-letter]`).join(',');

// Wind-up, slam, overshoot, freeze-frame, settle: the slapstick beat, scaled by the combo.
function popCells(root: HTMLElement, slots: Slot[], punch: ComboPunch) {
  void import('gsap').then(({ default: gsap }) => {
    for (const slot of slots) {
      const targets = root.querySelectorAll(cellSelector(slot));
      if (!targets.length) continue;
      const over = 1 + (punch.squash - 1) * 1.4;
      gsap.fromTo(
        targets,
        { scaleX: 1, scaleY: 1 },
        {
          keyframes: [
            { scaleX: 0.9, scaleY: 1.1, duration: 0.07, ease: 'power1.in' },
            { scaleX: punch.squash, scaleY: 2 - punch.squash, duration: 0.06, ease: 'power3.out' },
            { scaleX: 2 - over * 0.85, scaleY: over, duration: 0.1, ease: 'power2.out' },
            { scaleX: 2 - over * 0.85, scaleY: over, duration: punch.hold },
            { scaleX: 1, scaleY: 1, duration: 0.28, ease: 'elastic.out(1.1, 0.45)' },
          ],
          stagger: 0.045,
          overwrite: 'auto',
        },
      );
    }
  });
}

function burstAt(root: HTMLElement, slot: Slot, punch: ComboPunch) {
  const first = slot.cells[0];
  const last = slot.cells[slot.cells.length - 1];
  const a = root.querySelector(`[data-cw-cell="${first.row},${first.col}"]`)?.getBoundingClientRect();
  const b = root.querySelector(`[data-cw-cell="${last.row},${last.col}"]`)?.getBoundingClientRect();
  if (!a || !b) return;
  const x = (a.left + a.right + b.left + b.right) / 4;
  const y = (a.top + a.bottom + b.top + b.bottom) / 4;
  SharedFxApp.spawnBurst('sparkle-valid', x, y, { count: punch.particles });
  if (punch.bursts > 1) SharedFxApp.spawnBurst('sparkle-gold', x, y, { count: punch.particles });
}

/** Per-word payoff for the crossword: pop, burst, sound, buzz, mascot, combo. */
export function useCrosswordWordJuice({ state, gridRef, intensity }: Options): { comboLevel: number } {
  const { playSound, playComboSound } = useSoundEffects();
  const reducedMotion = useReducedMotion();
  const [reducedEffects] = useReducedEffects();
  const [comboLevel, setComboLevel] = useState(0);

  const seenRef = useRef<{ puzzleId: string; ids: Set<string> } | null>(null);
  const chainRef = useRef({ chain: 0, lastAt: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    const seen = seenRef.current;
    const prev = seen && seen.puzzleId === state.puzzle.id ? seen.ids : null;
    const fresh = freshSolvedSlots(prev, state);
    seenRef.current = { puzzleId: state.puzzle.id, ids: new Set(solvedSlotIds(state)) };
    if (!fresh.length) return;

    const full = intensity === 'full';
    const finalWord = state.status === 'solved';
    const longest = fresh.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));

    let chain = 0;
    if (full) {
      const now = Date.now();
      for (let i = 0; i < fresh.length; i++) {
        chainRef.current = { chain: nextComboChain(chainRef.current.chain, chainRef.current.lastAt, now), lastAt: now };
      }
      chain = chainRef.current.chain;
      setComboLevel(chain);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        chainRef.current = { chain: 0, lastAt: 0 };
        setComboLevel(0);
      }, CROSSWORD_COMBO_WINDOW_MS);
    }

    // The final word already gets the victory fanfare; stacking the accept chime on it muddies it.
    if (!finalWord) {
      playSound('wordAccepted');
      if (chain >= 2) void playComboSound(chain);
    }
    void (chain >= 2 ? haptics.success() : haptics.tap()).catch(() => {});
    emitMascotEvent({ kind: 'word-submitted', wordLength: longest.cells.length, gemLetterUsed: false });

    const root = gridRef.current;
    if (!root || reducedMotion) return;
    const punch = comboPunch(chain);
    popCells(root, fresh, punch);
    if (full && !reducedEffects && !finalWord && SharedFxApp.isInitialized()) {
      for (const slot of fresh) burstAt(root, slot, punch);
    }
  }, [state, intensity, gridRef, reducedMotion, reducedEffects, playSound, playComboSound]);

  return { comboLevel };
}
