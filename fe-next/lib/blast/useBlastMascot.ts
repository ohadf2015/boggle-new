'use client';

/**
 * useBlastMascot — React hook that owns the HUD mascot state machine.
 *
 * Subscribes to the module-level mascotBus so any blast handler can fire an
 * event without prop-drilling. Internally uses Date.now() so callers don't pass
 * time. The pure reducer is tested separately; this hook is a thin React shell
 * with idempotent dispatch + bus integration.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  reduceMascotEvent,
  createInitialMascotState,
  MASCOT_VISIBLE_MS,
  type MascotEvent,
  type MascotReducerState,
} from './mascotState';
import { subscribeMascotEvents } from './mascotBus';

export interface BlastMascotApi {
  state: MascotReducerState['current'];
  /** True only during the brief celebration window after a real reaction. */
  visible: boolean;
  /** Direct fire — usually use the bus via emitMascotEvent. */
  fire: (event: MascotEvent) => void;
}

export function useBlastMascot(): BlastMascotApi {
  const [reducerState, setReducerState] = useState<MascotReducerState>(createInitialMascotState);
  const [visible, setVisible] = useState(false);

  // Mirror reducer state in a ref so `fire` can detect a real transition
  // without reading stale closure state or mutating state inside an updater.
  const stateRef = useRef(reducerState);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fire = useCallback((event: MascotEvent) => {
    const prev = stateRef.current;
    const next = reduceMascotEvent(prev, event, Date.now());
    // Cooldown-blocked / no-op events return the same object — don't re-reveal.
    if (next === prev) return;

    stateRef.current = next;
    setReducerState(next);

    // A real reaction fired: pop the mascot in, then auto-hide so it never
    // sits over the HUD. A fresh reaction refreshes the window.
    setVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), MASCOT_VISIBLE_MS);
  }, []);

  // Subscribe to the bus so any handler can emit without prop-drilling.
  useEffect(() => subscribeMascotEvents(fire), [fire]);

  // Clear the pending hide timer on unmount.
  useEffect(
    () => () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    },
    [],
  );

  return { state: reducerState.current, visible, fire };
}
