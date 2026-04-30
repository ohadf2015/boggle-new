export { HapticsManager, haptics } from './HapticsManager';
export { WebHaptics } from './webHaptics';
// NativeHaptics intentionally NOT re-exported — it's lazily loaded by HapticsManager
// to avoid pulling @capacitor/haptics into the web bundle
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
export const hapticWordAccepted = () => hapticsInstance.success();
export const hapticClueRevealed = (_clueCount?: number) => hapticsInstance.success();
export const hapticGameWin = () => hapticsInstance.success();
