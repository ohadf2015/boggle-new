'use client';

import type { ReactNode } from 'react';
import { MpScreen } from '../shell/MpScreen';
import { LobbyDevChromeGuard } from './LobbyDevChromeGuard';

/**
 * LOBBY stub (host, phone/desktop): HostView renders the host's pre-game view
 * inside this. The LOBBY piece owns this file and `HostPreGameView`; HostView
 * is frozen. The TV projector lobby (TvLobbyView) is `fixed` and stays outside.
 */
export function HostLobbyScreen({ children }: { children: ReactNode }) {
  return <MpScreen testId="mp-host-lobby" bodyScroll="inner" body={<><LobbyDevChromeGuard />{children}</>} />;
}
