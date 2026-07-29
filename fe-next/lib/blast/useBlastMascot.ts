'use client';

/**
 * useBlastMascot — React hook that owns the HUD mascot state machine.
 *
 * Subscribes to the module-level mascotBus so any blast handler can fire an
 * event without prop-drilling. Internally uses Date.now() so callers don't pass
 * time. The pure reducer is tested separately; this hook is a thin React shell
 * with idempotent dispatch + bus integration.
 */
import { useState, useCallback, useEffect } from 'react';
import {
  reduceMascotEvent,
  createInitialMascotState,
  type MascotEvent,
  type MascotReducerState,
} from './mascotState';
import { subscribeMascotEvents } from './mascotBus';

export interface BlastMascotApi {
  state: MascotReducerState['current'];
  /** Direct fire — usually use the bus via emitMascotEvent. */
  fire: (event: MascotEvent) => void;
}

export function useBlastMascot(): BlastMascotApi {
  const [reducerState, setReducerState] = useState<MascotReducerState>(createInitialMascotState);

  const fire = useCallback((event: MascotEvent) => {
    setReducerState((prev) => reduceMascotEvent(prev, event, Date.now()));
  }, []);

  // Subscribe to the bus so any handler can emit without prop-drilling.
  useEffect(() => subscribeMascotEvents(fire), [fire]);

  return { state: reducerState.current, fire };
}
