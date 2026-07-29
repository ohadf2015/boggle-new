import { useHighlightStore } from '@/stores/highlightStore';
import { trackHighlightBufferOverflow } from '@/utils/growthTracking';
import type {
  WordSubmitEvent,
  GameEndEvent,
} from './highlightTypes';

export interface HighlightRecorder {
  start: () => void;
  recordWordSubmit: (data: Omit<WordSubmitEvent, 't' | 'kind'>) => void;
  recordEnd: (reason: 'cleared' | 'deadEnd', finalScore: number) => void;
}

export function createHighlightRecorder(): HighlightRecorder {
  let startTime = 0;

  return {
    start() {
      startTime = Date.now();
      const store = useHighlightStore.getState();
      store.reset();
      store.setOverflowHandler((eventsDropped) => {
        trackHighlightBufferOverflow({ eventsDropped });
      });
    },
    recordWordSubmit(data) {
      const t = Date.now() - startTime;
      useHighlightStore.getState().append({ kind: 'word', t, ...data });
    },
    recordEnd(reason, finalScore) {
      const t = Date.now() - startTime;
      const event: GameEndEvent = { kind: 'end', t, reason, finalScore };
      useHighlightStore.getState().append(event);
    },
  };
}
