'use client';

import type { ReactNode } from 'react';
import { AmbientBackdrop } from '@/components/motion/AmbientBackdrop';
import { MpScreen } from '../shell/MpScreen';

/**
 * LOBBY stub (joiner): PlayerView renders the waiting room inside this. The
 * LOBBY piece owns this file and `PlayerWaitingView`; PlayerView is frozen.
 */
export function PlayerLobbyScreen({ children }: { children: ReactNode }) {
  return <MpScreen testId="mp-player-lobby" bodyScroll="inner" backdrop={<AmbientBackdrop theme="multiplayer" />} body={children} />;
}
