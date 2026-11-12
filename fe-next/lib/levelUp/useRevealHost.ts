'use client';

import { useLayoutEffect } from 'react';
import { registerRevealHost } from './levelUpBus';

/** Layout effect: registered before any watcher's passive effect in the same commit settles a level-up. */
export function useRevealHost(): void {
  useLayoutEffect(() => registerRevealHost(), []);
}
