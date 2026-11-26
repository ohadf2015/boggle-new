'use client';

import type { ReactNode } from 'react';
import { AmbientBackdrop } from '@/components/motion/AmbientBackdrop';
import { MpScreen } from '../shell/MpScreen';

/**
 * LOBBY stub (host, phone/desktop): HostView renders the host's pre-game view
 * inside this. The LOBBY piece owns this file and `HostPreGameView`; HostView
 * is frozen. The TV projector lobby (TvLobbyView) is `fixed` and stays outside.
 */
export function HostLobbyScreen({ children }: { children: ReactNode }) {
  return <MpScreen testId="mp-host-lobby" bodyScroll="inner" backdrop={<AmbientBackdrop theme="multiplayer" />} body={children} />;
}
