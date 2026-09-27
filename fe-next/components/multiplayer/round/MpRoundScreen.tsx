'use client';

import type { ReactNode } from 'react';
import { MpScreen } from '../shell/MpScreen';

/**
 * ROUND stub: HostView / PlayerView render the in-game view (Host/PlayerInGameView)
 * inside this no-scroll frame. The ROUND piece owns this file and the in-game
 * views; the routers are frozen. The TV projector (TvBroadcastView) stays outside.
 */
export function MpRoundScreen({ children }: { children: ReactNode }) {
  return <MpScreen testId="mp-round" body={children} />;
}
