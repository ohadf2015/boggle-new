"use strict";
/**
 * State Machines Index
 * Export all state machine definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidTransition = exports.getValidTransitions = exports.fromGameStateString = exports.toGameStateString = exports.gameMachine = void 0;
var gameMachine_1 = require("./gameMachine");
Object.defineProperty(exports, "gameMachine", { enumerable: true, get: function () { return gameMachine_1.gameMachine; } });
Object.defineProperty(exports, "toGameStateString", { enumerable: true, get: function () { return gameMachine_1.toGameStateString; } });
Object.defineProperty(exports, "fromGameStateString", { enumerable: true, get: function () { return gameMachine_1.fromGameStateString; } });
Object.defineProperty(exports, "getValidTransitions", { enumerable: true, get: function () { return gameMachine_1.getValidTransitions; } });
Object.defineProperty(exports, "isValidTransition", { enumerable: true, get: function () { return gameMachine_1.isValidTransition; } });
