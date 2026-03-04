"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_EARTHQUAKE_CONFIG = void 0;
/**
 * Default earthquake configuration
 */
exports.DEFAULT_EARTHQUAKE_CONFIG = {
    enabled: true,
    triggerPercentageMin: 0.65, // Last 35% of game (adjusted to work with 1-minute games)
    triggerPercentageMax: 1.0,
    warningDurationMs: 2000,
    shakeDurationMs: 1000,
    fireRoundDurationSeconds: 15,
    scoreMultiplier: 2.0,
    minGameDurationSeconds: 45, // Support games as short as 45 seconds
};
