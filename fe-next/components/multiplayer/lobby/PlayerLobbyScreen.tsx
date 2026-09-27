'use client';

import type { ReactNode } from 'react';
import { MpScreen } from '../shell/MpScreen';

/**
 * LOBBY stub (joiner): PlayerView renders the waiting room inside this. The
 * LOBBY piece owns this file and `PlayerWaitingView`; PlayerView is frozen.
 */
export function PlayerLobbyScreen({ children }: { children: ReactNode }) {
  return <MpScreen testId="mp-player-lobby" bodyScroll="inner" body={children} />;
}
