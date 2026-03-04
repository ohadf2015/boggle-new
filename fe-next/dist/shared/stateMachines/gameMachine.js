"use strict";
/**
 * Game State Machine
 *
 * Provides type-safe state transitions for game lifecycle.
 * Prevents invalid state transitions like 'waiting' -> 'finished'.
 *
 * State Flow:
 *   waiting -> inProgress -> finished -> validating -> waiting
 *                                    \-> waiting (skip validation)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameMachine = void 0;
exports.toGameStateString = toGameStateString;
exports.fromGameStateString = fromGameStateString;
exports.getValidTransitions = getValidTransitions;
exports.isValidTransition = isValidTransition;
const xstate_1 = require("xstate");
// ==========================================
// State Machine Definition
// ==========================================
exports.gameMachine = (0, xstate_1.createMachine)({
    id: 'game',
    initial: 'waiting',
    context: {
        gameCode: '',
        timerSeconds: 180,
        startedAt: null,
        endedAt: null,
        roundNumber: 0,
    },
    states: {
        waiting: {
            description: 'Lobby state - players can join, host configures settings',
            on: {
                START: {
                    target: 'inProgress',
                    actions: (0, xstate_1.assign)({
                        timerSeconds: ({ event }) => event.timerSeconds,
                        startedAt: () => Date.now(),
                        endedAt: () => null,
                        roundNumber: ({ context }) => context.roundNumber + 1,
                    }),
                },
            },
        },
        inProgress: {
            description: 'Game is active - players submit words, timer is running',
            on: {
                END: {
                    target: 'finished',
                    actions: (0, xstate_1.assign)({
                        endedAt: () => Date.now(),
                    }),
                },
                TIMEOUT: {
                    target: 'finished',
                    actions: (0, xstate_1.assign)({
                        endedAt: () => Date.now(),
                    }),
                },
            },
        },
        finished: {
            description: 'Round ended - calculating scores, showing results',
            on: {
                VALIDATE: {
                    target: 'validating',
                },
                SKIP_VALIDATION: {
                    target: 'waiting',
                    actions: (0, xstate_1.assign)({
                        startedAt: () => null,
                        endedAt: () => null,
                    }),
                },
                RESET: {
                    target: 'waiting',
                    actions: (0, xstate_1.assign)({
                        startedAt: () => null,
                        endedAt: () => null,
                    }),
                },
            },
        },
        validating: {
            description: 'AI/peer validation in progress',
            on: {
                VALIDATION_COMPLETE: {
                    target: 'waiting',
                    actions: (0, xstate_1.assign)({
                        startedAt: () => null,
                        endedAt: () => null,
                    }),
                },
            },
        },
    },
});
// ==========================================
// Helper Functions
// ==========================================
/**
 * Convert machine state value to game state string (for storage)
 */
function toGameStateString(state) {
    const mapping = {
        waiting: 'waiting',
        inProgress: 'in-progress',
        finished: 'finished',
        validating: 'validating',
    };
    return mapping[state];
}
/**
 * Convert game state string to machine state value
 */
function fromGameStateString(stateString) {
    const mapping = {
        'waiting': 'waiting',
        'in-progress': 'inProgress',
        'finished': 'finished',
        'validating': 'validating',
    };
    return mapping[stateString];
}
/**
 * Get valid transitions from a given state
 */
function getValidTransitions(currentState) {
    const transitions = {
        waiting: ['START'],
        inProgress: ['END', 'TIMEOUT'],
        finished: ['VALIDATE', 'SKIP_VALIDATION', 'RESET'],
        validating: ['VALIDATION_COMPLETE'],
    };
    return transitions[currentState];
}
/**
 * Check if a transition is valid from the current state
 */
function isValidTransition(currentState, eventType) {
    return getValidTransitions(currentState).includes(eventType);
}
