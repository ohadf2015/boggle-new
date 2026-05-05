export type MicroTutorialMode = 'classic' | 'wordHunt' | 'wheelRush';

export type MicroTutorialBeat =
  | 'drag'
  | 'spin'
  | 'diagonal'
  | 'target'
  | 'nice'
  | 'goalComplete'
  | 'idleNudge'
  | null;

export type MicroTutorialEvent =
  | { type: 'drag-started' }
  | { type: 'word-found' }
  | { type: 'beat-completed' }
  | { type: 'goal-reached'; count: number }
  | { type: 'idle-30s' };

interface State {
  mode: MicroTutorialMode;
  beat: MicroTutorialBeat;
  niceFired: boolean;
}

/**
 * Just-in-time tutorial state machine for practice mode. Each beat is a short
 * imperative tip. Beats sequence based on player actions, never overlap, and
 * disappear on dismiss/complete events.
 *
 * Per-mode start beat:
 *  - classic: 'drag'
 *  - wordHunt: 'target'
 *  - wheelRush: 'spin'
 */
export function createMicroTutorial(opts: { mode: MicroTutorialMode }) {
  const startBeat: MicroTutorialBeat =
    opts.mode === 'wheelRush' ? 'spin' :
    opts.mode === 'wordHunt'  ? 'target' :
                                'drag';
  const state: State = { mode: opts.mode, beat: startBeat, niceFired: false };

  function dispatch(ev: MicroTutorialEvent) {
    if (ev.type === 'goal-reached') {
      state.beat = 'goalComplete';
      return;
    }
    if (ev.type === 'idle-30s') {
      if (state.beat === null) state.beat = 'idleNudge';
      return;
    }
    if (ev.type === 'drag-started') {
      if (state.mode === 'classic') {
        state.beat = 'diagonal';
      } else if (state.beat === 'spin' || state.beat === 'target') {
        state.beat = null;
      }
      return;
    }
    if (ev.type === 'word-found') {
      if (!state.niceFired) {
        state.beat = 'nice';
        state.niceFired = true;
      } else {
        state.beat = null;
      }
      return;
    }
    if (ev.type === 'beat-completed') {
      state.beat = null;
    }
  }

  return {
    currentBeat: () => state.beat,
    dispatch,
  };
}
