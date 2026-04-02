'use client';

import { ReactNode } from 'react';
import { useCrazyGamesSettingsBridge } from '@/hooks/useCrazyGamesSettingsBridge';

/**
 * Bridge component that syncs CrazyGames platform settings to game systems.
 *
 * Place inside CrazyGamesProvider to wire:
 * - muteAudio → Howler.mute() (global audio mute)
 * - disableChat → available via useCrazyGamesChatDisabled()
 */
export function CrazyGamesSettingsBridge({ children }: { children: ReactNode }) {
  useCrazyGamesSettingsBridge();

  return <>{children}</>;
}
