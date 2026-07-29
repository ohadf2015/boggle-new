'use client';
// Force rebuild


import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { useLocalStorageObject } from '@/hooks/useLocalStorageState';
import { resolveCosyPreferences } from '@/lib/cosy/cosyPreferences';
import type { CelebrationIntensity } from '@/lib/cosy/celebrationScale';
import { setCelebrationIntensity } from '@/utils/confettiUtils';

/**
 * Accessibility settings for visual effects
 */
interface AccessibilitySettings {
  /** Disable the rainbow glow effect on grid cells during fire round */
  disableFireRoundLights: boolean;
  /** Disable enhanced earthquake effects (extreme shaking, 3D tumbling, particles, screen shake) */
  disableEarthquakeEffects: boolean;
  /** Reduce animations throughout the app (respects system preference + manual override) */
  reduceMotion: boolean | 'system';
  /** Disable haptic feedback vibrations on mobile devices */
  disableHaptics: boolean;
  /** Use larger letters on the game grid for easier viewing */
  useLargeLetters: boolean;
  /**
   * Cosy / Calm Mode — global calm overlay. When on, it ORs every calming flag
   * on (reduce motion, fire-round lights, earthquakes, large letters),
   * suppresses timer urgency, and switches celebrations to calm (particle
   * effects off, replaced by dignified quiet feedback). It can only make the
   * game calmer, never louder. Haptics are deliberately untouched.
   */
  cosyMode: boolean;
}

interface AccessibilityContextType {
  /** Current accessibility settings */
  settings: AccessibilitySettings;
  /** Toggle the fire round lights effect on/off */
  toggleFireRoundLights: () => void;
  /** Toggle the earthquake effects on/off */
  toggleEarthquakeEffects: () => void;
  /** Toggle haptic feedback on/off */
  toggleHaptics: () => void;
  /** Cycle through reduceMotion options: system -> on -> off -> system */
  cycleReduceMotion: () => void;
  /** Toggle large letters mode on/off */
  toggleLargeLetters: () => void;
  /** Toggle cosy / calm mode on/off */
  toggleCosyMode: () => void;
  /** Whether cosy / calm mode is enabled */
  cosyMode: boolean;
  /** Whether animations should be reduced (combines setting + system preference + cosy) */
  shouldReduceMotion: boolean;
  /** Effective fire-round-lights suppression (setting OR cosy) */
  disableFireRoundLights: boolean;
  /** Effective earthquake suppression (setting OR cosy) */
  disableEarthquakeEffects: boolean;
  /** Whether haptic feedback is enabled */
  hapticsEnabled: boolean;
  /** Whether large letters are enabled (setting OR cosy) */
  largeLettersEnabled: boolean;
  /** Whether the timer should stop escalating its urgency (cosy) */
  suppressTimerUrgency: boolean;
  /** Celebration intensity — 'calm' under cosy (effects off), else 'full' */
  celebrationIntensity: CelebrationIntensity;
  /** Update a specific setting */
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
}

export const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

const ACCESSIBILITY_STORAGE_KEY = 'boggle_accessibility_settings';
const DEFAULT_SETTINGS: AccessibilitySettings = {
  disableFireRoundLights: false,
  disableEarthquakeEffects: false,
  reduceMotion: 'system', // Respect system preference by default
  disableHaptics: false, // Enable haptics by default
  useLargeLetters: false, // Normal letter size by default
  cosyMode: false, // Loud/competitive energy by default
};

interface AccessibilityProviderProps {
  children: ReactNode;
}

/**
 * AccessibilityProvider - Manages visual accessibility preferences
 *
 * Provides settings for users who may be sensitive to:
 * - Flashing/pulsing lights
 * - Rapid color changes
 * - Other intense visual effects
 */
export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, , updateField] = useLocalStorageObject<AccessibilitySettings>(
    ACCESSIBILITY_STORAGE_KEY,
    DEFAULT_SETTINGS
  );

  // Track system preference for reduced motion
  const [systemPrefersReducedMotion, setSystemPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersReducedMotion(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // QA affordance: `?cosy=1`/`?cosy=0` forces cosy for the session (in-memory,
  // not persisted; bypasses the admin gate — cosy is a calmer view, harmless).
  const [cosyUrlOverride, setCosyUrlOverride] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = new URLSearchParams(window.location.search).get('cosy');
    if (raw === '1' || raw === 'true') setCosyUrlOverride(true);
    else if (raw === '0' || raw === 'false') setCosyUrlOverride(false);
  }, []);

  // Resolve the EFFECTIVE preferences: cosy mode ORs every calming flag on.
  // Existing consumers read these through the per-flag hooks below, so cosy
  // propagates everywhere without touching any call site.
  const effective = useMemo(
    () =>
      resolveCosyPreferences({
        cosyMode: cosyUrlOverride ?? settings.cosyMode,
        reduceMotion: settings.reduceMotion,
        systemPrefersReducedMotion,
        disableFireRoundLights: settings.disableFireRoundLights,
        disableEarthquakeEffects: settings.disableEarthquakeEffects,
        useLargeLetters: settings.useLargeLetters,
      }),
    [
      cosyUrlOverride,
      settings.cosyMode,
      settings.reduceMotion,
      systemPrefersReducedMotion,
      settings.disableFireRoundLights,
      settings.disableEarthquakeEffects,
      settings.useLargeLetters,
    ]
  );
  const shouldReduceMotion = effective.shouldReduceMotion;

  // Sync the confetti module's global intensity so every burst (including
  // non-React callers) scales down under cosy / calm mode.
  useEffect(() => {
    setCelebrationIntensity(effective.celebrationIntensity);
  }, [effective.celebrationIntensity]);

  // Reflect cosy mode on the <html> element so the calm palette
  // (`html[data-cosy='true']` in globals.css) recolours the whole app.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (effective.cosyMode) {
      root.dataset.cosy = 'true';
    } else {
      delete root.dataset.cosy;
    }
  }, [effective.cosyMode]);

  const toggleFireRoundLights = useMemo(
    () => () => {
      updateField('disableFireRoundLights', !settings.disableFireRoundLights);
    },
    [settings.disableFireRoundLights, updateField]
  );

  const toggleEarthquakeEffects = useMemo(
    () => () => {
      updateField('disableEarthquakeEffects', !settings.disableEarthquakeEffects);
    },
    [settings.disableEarthquakeEffects, updateField]
  );

  // Cycle through: system -> true -> false -> system
  const cycleReduceMotion = useMemo(
    () => () => {
      const current = settings.reduceMotion;
      if (current === 'system') {
        updateField('reduceMotion', true);
      } else if (current === true) {
        updateField('reduceMotion', false);
      } else {
        updateField('reduceMotion', 'system');
      }
    },
    [settings.reduceMotion, updateField]
  );

  const toggleHaptics = useMemo(
    () => () => {
      updateField('disableHaptics', !settings.disableHaptics);
    },
    [settings.disableHaptics, updateField]
  );

  const toggleLargeLetters = useMemo(
    () => () => {
      updateField('useLargeLetters', !settings.useLargeLetters);
    },
    [settings.useLargeLetters, updateField]
  );

  const toggleCosyMode = useMemo(
    () => () => {
      updateField('cosyMode', !settings.cosyMode);
    },
    [settings.cosyMode, updateField]
  );

  // Haptics are enabled if not disabled in settings (cosy does not touch haptics)
  const hapticsEnabled = !settings.disableHaptics;

  // Large letters enabled (effective — cosy forces on)
  const largeLettersEnabled = effective.largeLettersEnabled;

  const value = useMemo<AccessibilityContextType>(
    () => ({
      settings,
      toggleFireRoundLights,
      toggleEarthquakeEffects,
      toggleHaptics,
      cycleReduceMotion,
      toggleLargeLetters,
      toggleCosyMode,
      cosyMode: effective.cosyMode,
      shouldReduceMotion,
      disableFireRoundLights: effective.disableFireRoundLights,
      disableEarthquakeEffects: effective.disableEarthquakeEffects,
      hapticsEnabled,
      largeLettersEnabled,
      suppressTimerUrgency: effective.suppressTimerUrgency,
      celebrationIntensity: effective.celebrationIntensity,
      updateSetting: updateField,
    }),
    [settings, toggleFireRoundLights, toggleEarthquakeEffects, toggleHaptics, cycleReduceMotion, toggleLargeLetters, toggleCosyMode, effective, shouldReduceMotion, hapticsEnabled, largeLettersEnabled, updateField]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

/**
 * Hook to access accessibility settings
 * @returns Accessibility context with settings and update functions
 */
export function useAccessibility(): AccessibilityContextType {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

/**
 * Hook that returns just the fire round lights setting (for performance)
 * Safe to use outside of provider - returns false as default
 */
export function useDisableFireRoundLights(): boolean {
  const context = useContext(AccessibilityContext);
  // Effective value (setting OR cosy mode).
  return context?.disableFireRoundLights ?? false;
}

/**
 * Hook that returns just the earthquake effects setting (for performance)
 * Safe to use outside of provider - returns false as default
 */
export function useDisableEarthquakeEffects(): boolean {
  const context = useContext(AccessibilityContext);
  // Effective value (setting OR cosy mode).
  return context?.disableEarthquakeEffects ?? false;
}

/**
 * Hook that returns whether animations should be reduced
 * Combines user setting + system preference (prefers-reduced-motion)
 * Safe to use outside of provider - falls back to system preference
 */
export function useShouldReduceMotion(): boolean {
  const context = useContext(AccessibilityContext);

  // Fallback: check system preference directly if outside provider
  const [systemPref, setSystemPref] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemPref(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemPref(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, []);

  return context?.shouldReduceMotion ?? systemPref;
}

/**
 * Hook that returns whether haptic feedback is enabled
 * Safe to use outside of provider - returns true as default (haptics on)
 */
export function useHapticsEnabled(): boolean {
  const context = useContext(AccessibilityContext);
  return context?.hapticsEnabled ?? true;
}

/**
 * Hook that returns whether large letters are enabled
 * Safe to use outside of provider - returns false as default (normal size)
 */
export function useLargeLetters(): boolean {
  const context = useContext(AccessibilityContext);
  return context?.largeLettersEnabled ?? false;
}

/**
 * Hook that returns whether cosy / calm mode is enabled.
 * Safe to use outside of provider - returns false (loud/competitive default).
 */
export function useCosyMode(): boolean {
  const context = useContext(AccessibilityContext);
  return context?.cosyMode ?? false;
}

/**
 * Hook that returns whether the timer should stop escalating its urgency.
 * Safe to use outside of provider - returns false (urgency shown by default).
 */
export function useSuppressTimerUrgency(): boolean {
  const context = useContext(AccessibilityContext);
  return context?.suppressTimerUrgency ?? false;
}

/**
 * Hook that returns the celebration intensity ('calm' under cosy, else 'full').
 * Safe to use outside of provider - returns 'full'.
 */
export function useCelebrationIntensity(): CelebrationIntensity {
  const context = useContext(AccessibilityContext);
  return context?.celebrationIntensity ?? 'full';
}
