import { create } from 'zustand';

export type MidRoundEvent =
  | { kind: 'playerJoined'; payload: { username: string; isBot?: boolean } }
  | { kind: 'playerLeft'; payload: { username: string } }
  | {
      kind: 'achievementUnlocked';
      payload: { key: string; count?: number; icon?: string };
    };

interface State {
  events: MidRoundEvent[];
  enqueue: (event: MidRoundEvent) => void;
  drain: () => MidRoundEvent[];
  clear: () => void;
}

const MAX_QUEUE = 50;

export const midRoundEventQueueStore = create<State>((set, get) => ({
  events: [],
  enqueue: (event) =>
    set((s) => {
      const next = [...s.events, event];
      return { events: next.length > MAX_QUEUE ? next.slice(next.length - MAX_QUEUE) : next };
    }),
  drain: () => {
    const current = get().events;
    set({ events: [] });
    return current;
  },
  clear: () => set({ events: [] }),
}));

export function useMidRoundEventQueue() {
  const events = midRoundEventQueueStore((s) => s.events);
  return { events };
}
