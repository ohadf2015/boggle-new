'use client';

import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isTypingTarget } from '@/lib/dom/isTypingTarget';
import { MIN_WORD_LEN, isAcceptedWord, spinWheel } from '@/lib/wordTowerV2/wheel';
import { type RunState, spendScramble } from '@/lib/wordTowerV2/run';
import { v2DailySeed } from '@/lib/wordTowerV2/daily';
import type { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { Phase, useTowerRun } from './useTowerRun';
import type { useBrace } from './rescue/useBrace';

type TowerRun = ReturnType<typeof useTowerRun>;
type PlaySound = ReturnType<typeof useSoundEffects>['playSound'];

/** Pentatonic steps: every letter rings a higher note and no pair clashes. */
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

/** The red "not a word" flash on the wheel, with its buzz. */
export function useRejectFlash(playSound: PlaySound) {
  const [rejected, setRejected] = useState<string | null>(null);
  const flash = useCallback(
    (reason: string) => {
      setRejected(reason);
      playSound('wordRejected');
      window.setTimeout(() => setRejected(null), 900);
    },
    [playSound],
  );
  return { rejected, flash };
}

interface Args {
  daily: boolean;
  language: string;
  phase: Phase;
  run: RunState;
  hoist: TowerRun['hoist'];
  cancelHoist: TowerRun['cancelHoist'];
  drop: TowerRun['drop'];
  setScrambles: TowerRun['setScrambles'];
  dictRef: MutableRefObject<Set<string> | null>;
  dictReady: boolean;
  braceApi: ReturnType<typeof useBrace>;
  flashReject: (reason: string) => void;
  playSound: PlaySound;
  /** Daily: the first accepted word counts as today's play. */
  recordPlay: () => void;
  /** Another surface owns the keyboard (smash round, rivals, raid). */
  keysBlocked: boolean;
}

/**
 * The swipe wheel: dealing letters, spelling, submitting, the undo while the
 * slab hangs, scramble, and the keyboard that drives all of it.
 */
export function useWordWheel({
  daily,
  language,
  phase,
  run,
  hoist,
  cancelHoist,
  drop,
  setScrambles,
  dictRef,
  dictReady,
  braceApi,
  flashReject,
  playSound,
  recordPlay,
  keysBlocked,
}: Args) {
  const drawRef = useRef(0);
  const [wheel, setWheel] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const dailyEngagedRef = useRef(false);

  // Fresh letters per run AND after every hoisted word, so each turn is a new
  // little anagram rather than the same seven letters all run.
  const [runSeed, setRunSeed] = useState('');
  const reseed = useCallback(() => setRunSeed(daily ? v2DailySeed(undefined, language) : `wt2-${Date.now()}`), [daily, language]);
  useEffect(() => reseed(), [reseed]);
  const deal = useCallback(
    (draw: number) => {
      if (!runSeed) return;
      drawRef.current = draw;
      setWheel(spinWheel(language as Parameters<typeof spinWheel>[0], draw, runSeed));
      setSelected([]);
    },
    [language, runSeed],
  );
  useEffect(() => deal(0), [deal]);

  const word = useMemo(() => selected.map((i) => wheel[i]).join(''), [selected, wheel]);
  const valid = dictReady && isAcceptedWord(word, wheel, dictRef.current);

  // A distinct chime the moment the spelled letters become a real word.
  const wasValid = useRef(false);
  useEffect(() => {
    if (valid && !wasValid.current) playSound('matchFound', { volume: 0.45 });
    wasValid.current = valid;
  }, [valid, playSound]);

  /**
   * Take a wheel slot, resolved against the LATEST selection. Resolving outside
   * the updater read a stale `selected` when keys arrived faster than renders,
   * so a doubled letter ("aa") took the same slot twice and dropped one.
   */
  const takeSlot = useCallback(
    (resolve: (sel: number[]) => number) => {
      if (phase !== 'composing') return;
      setSelected((sel) => {
        const i = resolve(sel);
        return i === -1 || sel.includes(i) ? sel : [...sel, i];
      });
    },
    [phase],
  );

  // One pentatonic note per letter added — outside the updater (StrictMode runs those twice).
  const prevLen = useRef(0);
  useEffect(() => {
    if (selected.length > prevLen.current) {
      const step = PENTATONIC[Math.min(selected.length - 1, PENTATONIC.length - 1)];
      playSound('tileSelect', { rate: 2 ** (step / 12), volume: 0.5 });
    }
    prevLen.current = selected.length;
  }, [selected.length, playSound]);

  const selectTile = useCallback((i: number) => takeSlot(() => i), [takeSlot]);

  const deselectTile = useCallback((i: number) => {
    setSelected((sel) => (sel.includes(i) ? sel.slice(0, sel.indexOf(i)) : sel));
  }, []);

  /** The wheel exactly as it was before the last submit, for the undo. */
  const preSubmitRef = useRef<{ wheel: string[]; selected: number[]; draw: number } | null>(null);
  /**
   * The wheel auto-builds a valid word 700ms after the last tile change
   * (WordTowerWheel AUTO_BUILD_MS). A word restored by the undo looks exactly
   * like "the player just finished spelling it", so the slab went straight back
   * onto the hook and the undo undid itself. This swallows that one auto-fire:
   * same selection, within a beat of the undo. A BUILD tap comes later and works.
   */
  const undoGuardRef = useRef<{ key: string; until: number } | null>(null);

  const submit = useCallback(() => {
    if (phase !== 'composing' || word.length === 0) return;
    const guard = undoGuardRef.current;
    if (guard && guard.key === selected.join(',') && performance.now() < guard.until) return;
    // A rescue word is running: the word braces the tower instead of becoming a floor.
    const accepted = isAcceptedWord(word, wheel, dictRef.current);
    const rescueLen = braceApi.rescue?.minLen ?? Infinity;
    if (braceApi.submitRescue(word, accepted)) {
      setSelected([]);
      if (accepted && word.length >= rescueLen) deal(drawRef.current + 1);
      return;
    }
    if (!accepted) {
      flashReject(word.length < MIN_WORD_LEN ? 'too_short' : 'not_in_dictionary');
      setSelected([]);
      return;
    }
    preSubmitRef.current = { wheel, selected, draw: drawRef.current };
    hoist(word);
    deal(drawRef.current + 1);
    if (daily && !dailyEngagedRef.current) {
      dailyEngagedRef.current = true;
      recordPlay();
    }
  }, [phase, word, wheel, selected, hoist, flashReject, deal, braceApi, daily, recordPlay, dictRef]);

  /**
   * Put the hanging word back: the slab leaves the physics world and the wheel
   * returns to the exact letters it was spelled from, still selected, ready to
   * be edited. Legal only while it hangs — once dropped, physics owns it.
   */
  const putBack = useCallback(() => {
    if (!cancelHoist()) return;
    const prev = preSubmitRef.current;
    if (!prev) return;
    preSubmitRef.current = null;
    undoGuardRef.current = { key: prev.selected.join(','), until: performance.now() + 1100 };
    drawRef.current = prev.draw;
    setWheel(prev.wheel);
    setSelected(prev.selected);
  }, [cancelHoist]);

  /**
   * Release the slab. The undo snapshot dies WITH the turn: once physics owns
   * the floor there is nothing to put back, and a snapshot that outlived its
   * turn would let the next slab's undo restore the previous turn's letters.
   */
  const dropFloor = useCallback(() => {
    preSubmitRef.current = null;
    undoGuardRef.current = null;
    drop();
  }, [drop]);

  const scramble = useCallback(() => {
    const next = spendScramble(run);
    if (!next || phase === 'over') return;
    setScrambles(next);
    deal(drawRef.current + 1);
    playSound('boardShuffle');
  }, [run, phase, setScrambles, deal, playSound]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event) || phase === 'over' || keysBlocked) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (phase === 'swinging') dropFloor();
        else submit();
        return;
      }
      // Above the composing gate on purpose: taking the word back is the one
      // thing the player can do while the slab is on the hook.
      if (phase === 'swinging' && (event.key === 'Backspace' || event.key === 'Escape')) {
        event.preventDefault();
        putBack();
        return;
      }
      if (phase !== 'composing') return;
      if (event.key === 'Backspace') setSelected((s) => s.slice(0, -1));
      else if (event.key === 'Enter') submit();
      else if (event.key.length === 1) {
        const letter = event.key.toLowerCase();
        takeSlot((sel) => wheel.findIndex((l, i) => l === letter && !sel.includes(i)));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, dropFloor, submit, wheel, takeSlot, putBack, keysBlocked]);

  const backspace = useCallback(() => setSelected((s) => s.slice(0, -1)), []);
  const clearWord = useCallback(() => setSelected([]), []);

  /** New run: no undo carries over, and the wheel gets a fresh seed. */
  const resetForRun = useCallback(() => {
    preSubmitRef.current = null;
    undoGuardRef.current = null;
    reseed();
  }, [reseed]);

  return {
    wheel,
    selected,
    word,
    valid,
    canPutBack: !!preSubmitRef.current,
    selectTile,
    deselectTile,
    submit,
    putBack,
    dropFloor,
    scramble,
    backspace,
    clearWord,
    resetForRun,
  };
}
