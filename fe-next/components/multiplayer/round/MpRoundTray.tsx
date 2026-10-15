'use client';

import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

/**
 * The phone round's tray: the free band UNDER the board. The board view only
 * marks where it is (MpRoundTraySlot after the grid); the round frame fills it
 * with my words + callouts, and in-canvas strips (the class economy dock)
 * portal into it. Desktop/TV provide no tray, so everything renders in place.
 */
export interface MpRoundTrayValue {
  registerSlot: (node: HTMLElement | null) => void;
  dockNode: HTMLElement | null;
}

export const MpRoundTrayContext = createContext<MpRoundTrayValue | null>(null);

/** Default: the flex remainder under the board. A board that sizes itself from its own slot passes its position. */
export function MpRoundTraySlot({ className, style }: { className?: string; style?: CSSProperties }) {
  const tray = useContext(MpRoundTrayContext);
  if (!tray) return null;
  return <div ref={tray.registerSlot} data-testid="mp-round-tray-slot" style={style} className={cn('flex w-full min-h-0 flex-col', className ?? 'flex-1')} />;
}

/**
 * A nudge card (e.g. the stuck-player coach): in the phone tray it stacks
 * inline under the board; without a tray it floats at the screen's foot.
 */
export function MpTrayNudge({ children }: { children: ReactNode }) {
  const dockNode = useContext(MpRoundTrayContext)?.dockNode;
  if (dockNode) return createPortal(<div className="flex justify-center px-3 pb-1">{children}</div>, dockNode);
  return <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-3">{children}</div>;
}
