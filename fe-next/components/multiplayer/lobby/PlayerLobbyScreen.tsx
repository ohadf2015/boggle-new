'use client';

import type { ReactNode } from 'react';
import { MpScreen } from '../shell/MpScreen';
import { LobbyDevChromeGuard } from './LobbyDevChromeGuard';

/**
 * LOBBY stub (joiner): PlayerView renders the waiting room inside this. The
 * LOBBY piece owns this file and `PlayerWaitingView`; PlayerView is frozen.
 */
export function PlayerLobbyScreen({ children }: { children: ReactNode }) {
  return <MpScreen testId="mp-player-lobby" bodyScroll="inner" body={<><LobbyDevChromeGuard />{children}</>} />;
}
