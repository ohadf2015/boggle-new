/**
 * Haptic feedback patterns.
 * Maps to common UI interactions across web and native.
 */
export enum HapticPattern {
  /** Light tap (button press, toggle) */
  TAP = 'tap',
  /** Success feedback (form submit, action complete) */
  SUCCESS = 'success',
  /** Error feedback (validation fail, action blocked) */
  ERROR = 'error',
  /** Warning feedback (destructive action) */
  WARNING = 'warning',
  /** Selection change (picker, slider) */
  SELECTION = 'selection',
  /** Legendary/epic moments — escalating crescendo pattern */
  LEGENDARY = 'legendary',
}

/**
 * Platform-agnostic haptic intensity levels.
 */
export enum HapticIntensity {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
}

/**
 * Custom haptic pattern definition.
 * Allows fine-grained control when predefined patterns insufficient.
 */
export interface CustomHapticPattern {
  /** Duration in milliseconds */
  duration: number;
  /** Intensity level */
  intensity: HapticIntensity;
}

/**
 * Haptics implementation interface.
 * All implementations (web, native) must conform to this contract.
 */
export interface IHapticsImplementation {
  /** Check if haptics available on current platform */
  isSupported(): boolean;

  /** Trigger predefined haptic pattern */
  trigger(pattern: HapticPattern): Promise<void>;

  /** Trigger custom haptic pattern */
  triggerCustom(pattern: CustomHapticPattern): Promise<void>;
}
