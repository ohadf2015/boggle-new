/**
 * Game State Machine Utility
 *
 * Provides safe state transitions for game lifecycle.
 * This is a lightweight implementation that mirrors the XState machine
 * in shared/stateMachines/gameMachine.ts for use in CommonJS backend code.
 *
 * Usage:
 *   const { canTransition, transition, getValidEvents, isInProgress } = require('./gameStateMachine');
 *
 *   // Check if transition is valid
 *   if (canTransition('waiting', 'START')) {
 *     const result = transition('waiting', 'START');
 *   }
 *
 *   // Check current state
 *   if (isInProgress(game.gameState)) {
 *     // game is active
 *   }
 */

// ==========================================
// State Mappings
// ==========================================

// Map between storage strings and machine states
const STATE_TO_MACHINE = {
  'waiting': 'waiting',
  'in-progress': 'inProgress',
  'finished': 'finished',
  'validating': 'validating',
};

const MACHINE_TO_STATE = {
  'waiting': 'waiting',
  'inProgress': 'in-progress',
  'finished': 'finished',
  'validating': 'validating',
};

// Valid transitions from each state
const VALID_TRANSITIONS = {
  'waiting': ['START'],
  'inProgress': ['END', 'TIMEOUT'],
  'finished': ['VALIDATE', 'SKIP_VALIDATION', 'RESET'],
  'validating': ['VALIDATION_COMPLETE'],
};

// Target states for each transition
const TRANSITION_TARGETS = {
  'waiting': {
    'START': 'in-progress',
  },
  'inProgress': {
    'END': 'finished',
    'TIMEOUT': 'finished',
  },
  'finished': {
    'VALIDATE': 'validating',
    'SKIP_VALIDATION': 'waiting',
    'RESET': 'waiting',
  },
  'validating': {
    'VALIDATION_COMPLETE': 'waiting',
  },
};

// ==========================================
// Core Functions
// ==========================================

/**
 * Convert storage state string to machine state
 * @param {string} stateString - State from storage (e.g., 'in-progress')
 * @returns {string} Machine state (e.g., 'inProgress')
 */
function toMachineState(stateString) {
  return STATE_TO_MACHINE[stateString] || 'waiting';
}

/**
 * Convert machine state to storage state string
 * @param {string} machineState - Machine state (e.g., 'inProgress')
 * @returns {string} Storage state (e.g., 'in-progress')
 */
function toStorageState(machineState) {
  return MACHINE_TO_STATE[machineState] || 'waiting';
}

/**
 * Check if a transition is valid from the current state
 * @param {string} currentState - Current state string (e.g., 'waiting', 'in-progress')
 * @param {string} eventType - Event type (e.g., 'START', 'END')
 * @returns {boolean} True if transition is valid
 */
function canTransition(currentState, eventType) {
  const machineState = toMachineState(currentState);
  const validEvents = VALID_TRANSITIONS[machineState] || [];
  return validEvents.includes(eventType);
}

/**
 * Get the target state for a transition
 * @param {string} currentState - Current state string
 * @param {string} eventType - Event type
 * @returns {string|null} Target state string, or null if invalid
 */
function getTransitionTarget(currentState, eventType) {
  const machineState = toMachineState(currentState);
  const targets = TRANSITION_TARGETS[machineState];
  if (!targets || !targets[eventType]) {
    return null;
  }
  return targets[eventType];
}

/**
 * Perform a state transition
 * @param {string} currentState - Current state string
 * @param {string} eventType - Event type
 * @returns {{ success: boolean, newState: string|null, error?: string }}
 */
function transition(currentState, eventType) {
  if (!canTransition(currentState, eventType)) {
    return {
      success: false,
      newState: null,
      error: `Invalid transition: ${currentState} -> ${eventType}`,
    };
  }

  const newState = getTransitionTarget(currentState, eventType);
  return {
    success: true,
    newState,
  };
}

/**
 * Get valid events from the current state
 * @param {string} currentState - Current state string
 * @returns {string[]} Array of valid event types
 */
function getValidEvents(currentState) {
  const machineState = toMachineState(currentState);
  return VALID_TRANSITIONS[machineState] || [];
}

/**
 * Get all possible states
 * @returns {string[]} Array of state strings
 */
function getAllStates() {
  return ['waiting', 'in-progress', 'finished', 'validating'];
}

/**
 * Validate that a state string is valid
 * @param {string} state - State to validate
 * @returns {boolean}
 */
function isValidState(state) {
  return getAllStates().includes(state);
}

// ==========================================
// State Check Helpers
// ==========================================

/**
 * Check if game is in waiting state (lobby)
 * @param {string} state - Current game state
 * @returns {boolean}
 */
function isWaiting(state) {
  return state === 'waiting';
}

/**
 * Check if game is in progress (active play)
 * @param {string} state - Current game state
 * @returns {boolean}
 */
function isInProgress(state) {
  return state === 'in-progress';
}

/**
 * Check if game is finished (results phase)
 * @param {string} state - Current game state
 * @returns {boolean}
 */
function isFinished(state) {
  return state === 'finished';
}

/**
 * Check if game is in validation phase
 * @param {string} state - Current game state
 * @returns {boolean}
 */
function isValidating(state) {
  return state === 'validating';
}

/**
 * Check if game can accept word submissions (only during active play)
 * @param {string} state - Current game state
 * @returns {boolean}
 */
function canSubmitWords(state) {
  return isInProgress(state);
}

/**
 * Check if game can be started (only from waiting state)
 * @param {string} state - Current game state
 * @returns {boolean}
 */
function canStartGame(state) {
  return isWaiting(state);
}

/**
 * Check if players can freely join (not ranked in-progress)
 * @param {object} game - Game object with gameState and isRanked
 * @returns {boolean}
 */
function canJoinFreely(game) {
  if (!game) return false;
  if (isWaiting(game.gameState)) return true;
  if (isInProgress(game.gameState) && !game.isRanked) return true;
  if (isInProgress(game.gameState) && game.allowLateJoin) return true;
  return false;
}

/**
 * Check if late join should send game state to player
 * @param {string} state - Current game state
 * @returns {boolean}
 */
function shouldSendGameState(state) {
  return isInProgress(state);
}

// ==========================================
// Exports
// ==========================================

module.exports = {
  // Core transition functions
  canTransition,
  transition,
  getTransitionTarget,
  getValidEvents,
  getAllStates,
  isValidState,
  toMachineState,
  toStorageState,

  // State check helpers
  isWaiting,
  isInProgress,
  isFinished,
  isValidating,
  canSubmitWords,
  canStartGame,
  canJoinFreely,
  shouldSendGameState,
};
