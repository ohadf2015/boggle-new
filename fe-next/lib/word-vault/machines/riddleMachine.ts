import { setup, assign } from 'xstate';
import type { RiddleEngineId } from '../types';

export type RiddleEvent =
  | { type: 'START' }
  | { type: 'SUBMIT'; payload?: unknown }
  | { type: 'VALIDATE_SUCCESS' }
  | { type: 'VALIDATE_FAIL' }
  | { type: 'USE_HINT' }
  | { type: 'HINT_DISMISS' }
  | { type: 'RETRY' }
  | { type: 'ABANDON' };

export type RiddleContext = {
  engineId: RiddleEngineId;
  attemptsMade: number;
  hintsUsed: number;
  lastSubmission: unknown;
};

export const buildRiddleMachine = (engineId: RiddleEngineId) =>
  setup({
    types: {
      context: {} as RiddleContext,
      events: {} as RiddleEvent,
    },
    actions: {
      recordSubmission: assign(({ event }) => ({
        lastSubmission: event.type === 'SUBMIT' ? event.payload : undefined,
      })),
      bumpAttempts: assign(({ context }) => ({
        attemptsMade: context.attemptsMade + 1,
      })),
      bumpHints: assign(({ context }) => ({
        hintsUsed: context.hintsUsed + 1,
      })),
    },
  }).createMachine({
    id: `riddle-${engineId}`,
    initial: 'ready',
    context: {
      engineId,
      attemptsMade: 0,
      hintsUsed: 0,
      lastSubmission: undefined,
    },
    states: {
      ready: {
        on: {
          START: { target: 'active' },
          ABANDON: { target: 'abandoned' },
        },
      },
      active: {
        on: {
          SUBMIT: { target: 'validating', actions: 'recordSubmission' },
          USE_HINT: { target: 'hint-active', actions: 'bumpHints' },
          ABANDON: { target: 'abandoned' },
        },
      },
      validating: {
        on: {
          VALIDATE_SUCCESS: { target: 'solved' },
          VALIDATE_FAIL: { target: 'failed', actions: 'bumpAttempts' },
        },
      },
      solved: {
        type: 'final',
      },
      failed: {
        on: {
          RETRY: { target: 'active' },
          ABANDON: { target: 'abandoned' },
        },
      },
      'hint-active': {
        on: {
          HINT_DISMISS: { target: 'active' },
          ABANDON: { target: 'abandoned' },
        },
      },
      abandoned: {
        type: 'final',
      },
    },
  });
