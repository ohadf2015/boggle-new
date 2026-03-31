'use client';

import { ReactNode, useEffect } from 'react';
import { useCrazyGamesSettingsBridge } from '@/hooks/useCrazyGamesSettingsBridge';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { setSDKContext } from '@/utils/crazygames/cloudSave';

/**
 * Bridge component that syncs CrazyGames platform settings to game systems.
 *
 * Place inside CrazyGamesProvider to wire:
 * - muteAudio → Howler.mute() (global audio mute)
 * - disableChat → available via useCrazyGamesChatDisabled()
 * - Cloud save SDK context for utility function access
 */
export function CrazyGamesSettingsBridge({ children }: { children: ReactNode }) {
  useCrazyGamesSettingsBridge();

  // Wire SDK context to cloud save utility so it can access saveData/loadData
  const sdkContext = useCrazyGames();
  useEffect(() => {
    if (sdkContext.isAvailable) {
      setSDKContext(sdkContext);
    }
  }, [sdkContext, sdkContext.isAvailable]);

  return <>{children}</>;
}
