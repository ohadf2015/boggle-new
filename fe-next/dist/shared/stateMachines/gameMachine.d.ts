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
export type GameEvent = {
    type: 'START';
    timerSeconds: number;
    difficulty?: string;
} | {
    type: 'END';
} | {
    type: 'TIMEOUT';
} | {
    type: 'VALIDATE';
} | {
    type: 'VALIDATION_COMPLETE';
} | {
    type: 'SKIP_VALIDATION';
} | {
    type: 'RESET';
};
export interface GameMachineContext {
    gameCode: string;
    timerSeconds: number;
    startedAt: number | null;
    endedAt: number | null;
    roundNumber: number;
}
export type GameStateValue = 'waiting' | 'inProgress' | 'finished' | 'validating';
export type GameStateString = 'waiting' | 'in-progress' | 'finished' | 'validating';
export declare const gameMachine: import("xstate").StateMachine<GameMachineContext, import("xstate").AnyEventObject, Record<string, import("xstate").AnyActorRef>, import("xstate").ProvidedActor, import("xstate").ParameterizedObject, import("xstate").ParameterizedObject, string, import("xstate").StateValue, string, unknown, {}, import("xstate").EventObject, import("xstate").MetaObject, any>;
/**
 * Convert machine state value to game state string (for storage)
 */
export declare function toGameStateString(state: GameStateValue): GameStateString;
/**
 * Convert game state string to machine state value
 */
export declare function fromGameStateString(stateString: GameStateString): GameStateValue;
/**
 * Get valid transitions from a given state
 */
export declare function getValidTransitions(currentState: GameStateValue): string[];
/**
 * Check if a transition is valid from the current state
 */
export declare function isValidTransition(currentState: GameStateValue, eventType: string): boolean;
export type GameMachine = typeof gameMachine;
