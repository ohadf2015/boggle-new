export { HapticsManager, haptics } from './HapticsManager';
export { WebHaptics } from './webHaptics';
export { NativeHaptics } from './nativeHaptics';
export {
  HapticPattern,
  HapticIntensity,
  type CustomHapticPattern,
  type IHapticsImplementation,
} from './types';

// Backwards compatibility exports for existing code
// These map old function names to new haptics system
// Accept optional arguments for compatibility but ignore them
import { haptics as hapticsInstance } from './HapticsManager';

export const hapticForWordScore = (_wordLength?: number) => hapticsInstance.tap();
export const hapticError = () => hapticsInstance.error();
export const hapticClueRevealed = (_clueCount?: number) => hapticsInstance.success();
export const hapticGameWin = () => hapticsInstance.success();
