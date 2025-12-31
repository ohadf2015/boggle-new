'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useLocalStorageObject } from '@/hooks/useLocalStorageState';

/**
 * Accessibility settings for visual effects
 */
interface AccessibilitySettings {
  /** Disable the rainbow glow effect on grid cells during fire round */
  disableFireRoundLights: boolean;
  /** Disable enhanced earthquake effects (extreme shaking, 3D tumbling, particles, screen shake) */
  disableEarthquakeEffects: boolean;
}

interface AccessibilityContextType {
  /** Current accessibility settings */
  settings: AccessibilitySettings;
  /** Toggle the fire round lights effect on/off */
  toggleFireRoundLights: () => void;
  /** Toggle the earthquake effects on/off */
  toggleEarthquakeEffects: () => void;
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

  const value = useMemo<AccessibilityContextType>(
    () => ({
      settings,
      toggleFireRoundLights,
      toggleEarthquakeEffects,
      updateSetting: updateField,
    }),
    [settings, toggleFireRoundLights, toggleEarthquakeEffects, updateField]
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
