'use client';

import { useEffect } from 'react';
import { useExperiment } from '@/hooks/useExperiment';

type RosterEntry = string | { isBot?: boolean };

/** Exactly two humans and no bot: the room exp-mp-duo-bot-v1 is about. */
export function isDuoRoster(players: readonly RosterEntry[]): boolean {
  let humans = 0;
  for (const p of players) {
    if (typeof p === 'object' && p?.isBot) return false;
    humans += 1;
  }
  return humans === 2;
}

/**
 * exp-mp-duo-bot-v1 (host side): whether this host's startGame asks the server
 * for a third-seat bot. The server re-checks the room (autoAddBotForDuo) and
 * refuses classroom / ranked / private / tournament rooms itself; the client
 * never asks from a classroom either. Exposure fires only for a real 1v1.
 */
export function useDuoBotRequest({ isClassroom, isDuo }: { isClassroom: boolean; isDuo: boolean }): boolean {
  const { variant, trackExposure } = useExperiment('exp-mp-duo-bot-v1');
  useEffect(() => {
    if (!isClassroom && isDuo) trackExposure();
  }, [isClassroom, isDuo, trackExposure]);
  return variant === 'bot' && !isClassroom;
}
