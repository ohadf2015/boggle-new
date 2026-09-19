/**
 * Adventure mode — shared world/map config. Gameplay rules live in ./play/.
 */
export { LEVELS_PER_WORLD, MAX_STARS_PER_LEVEL, getWorldUnlockRequirement } from './constants';
export { WORLD_CONFIGS, getWorldConfig, getAllWorldConfigs, type WorldConfig } from './worldConfig';
export { getWorldColors, getWorldGlow } from './colors';
