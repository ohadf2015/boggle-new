'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { useLocalStorageObject } from '@/hooks/useLocalStorageState';

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
}

interface AccessibilityContextType {
  /** Current accessibility settings */
  settings: AccessibilitySettings;
  /** Toggle the fire round lights effect on/off */
  toggleFireRoundLights: () => void;
  /** Toggle the earthquake effects on/off */
  toggleEarthquakeEffects: () => void;
  /** Cycle through reduceMotion options: system -> on -> off -> system */
  cycleReduceMotion: () => void;
  /** Whether animations should be reduced (combines setting + system preference) */
  shouldReduceMotion: boolean;
  /** Update a specific setting */
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

const ACCESSIBILITY_STORAGE_KEY = 'boggle_accessibility_settings';
const DEFAULT_SETTINGS: AccessibilitySettings = {
  disableFireRoundLights: false,
  disableEarthquakeEffects: false,
  reduceMotion: 'system', // Respect system preference by default
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

  // Calculate whether to reduce motion based on setting + system preference
  const shouldReduceMotion = useMemo(() => {
    if (settings.reduceMotion === 'system') {
      return systemPrefersReducedMotion;
    }
    return settings.reduceMotion;
  }, [settings.reduceMotion, systemPrefersReducedMotion]);

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

  const value = useMemo<AccessibilityContextType>(
    () => ({
      settings,
      toggleFireRoundLights,
      toggleEarthquakeEffects,
      cycleReduceMotion,
      shouldReduceMotion,
      updateSetting: updateField,
    }),
    [settings, toggleFireRoundLights, toggleEarthquakeEffects, cycleReduceMotion, shouldReduceMotion, updateField]
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
  return context?.settings.disableFireRoundLights ?? false;
}

/**
 * Hook that returns just the earthquake effects setting (for performance)
 * Safe to use outside of provider - returns false as default
 */
export function useDisableEarthquakeEffects(): boolean {
  const context = useContext(AccessibilityContext);
  return context?.settings.disableEarthquakeEffects ?? false;
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
