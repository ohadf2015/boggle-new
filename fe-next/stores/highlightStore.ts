import { create } from 'zustand';
import type { HighlightEvent } from '@/lib/blast/highlightTypes';

export const BUFFER_BYTE_CAP = 5 * 1024 * 1024;

type OverflowHandler = (eventsDropped: number) => void;

interface HighlightState {
  events: HighlightEvent[];
  byteSize: number;
  overflowHandler: OverflowHandler | null;
  append: (e: HighlightEvent) => void;
  reset: () => void;
  setOverflowHandler: (h: OverflowHandler) => void;
}

function approxBytes(e: HighlightEvent): number {
  return JSON.stringify(e).length;
}

export const useHighlightStore = create<HighlightState>((set, get) => ({
  events: [],
  byteSize: 0,
  overflowHandler: null,
  append: (e) => {
    const eBytes = approxBytes(e);
    let { events, byteSize } = get();
    let dropped = 0;

    while (byteSize + eBytes > BUFFER_BYTE_CAP && events.length > 0) {
      const removed = events[0];
      byteSize -= approxBytes(removed);
      events = events.slice(1);
      dropped++;
    }

    set({ events: [...events, e], byteSize: byteSize + eBytes });

    if (dropped > 0) {
      const handler = get().overflowHandler;
      if (handler) handler(dropped);
    }
  },
  reset: () => set({ events: [], byteSize: 0 }),
  setOverflowHandler: (h) => set({ overflowHandler: h }),
}));
