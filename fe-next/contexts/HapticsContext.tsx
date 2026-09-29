'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { haptics } from '@/utils/haptics/HapticsManager';

const STORAGE_KEY = 'lexiclash:haptics-enabled';

function readInitial(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored !== 'false';
}

interface HapticsContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const HapticsContext = createContext<HapticsContextValue | null>(null);

export function HapticsProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(() => {
    const initial = readInitial();
    haptics.setEnabled(initial);
    return initial;
  });

  const setEnabled = useCallback((value: boolean) => {
    haptics.setEnabled(value);
    localStorage.setItem(STORAGE_KEY, String(value));
    setEnabledState(value);
  }, []);

  const value = useMemo(() => ({ enabled, setEnabled }), [enabled, setEnabled]);

  return (
    <HapticsContext.Provider value={value}>
      {children}
    </HapticsContext.Provider>
  );
}

const HAPTICS_FALLBACK: HapticsContextValue = {
  enabled: true,
  setEnabled: () => {},
};

export function useHapticsConfig() {
  const context = useContext(HapticsContext);
  if (!context) {
    if (process.env.NODE_ENV === 'development') {
      throw new Error('useHapticsConfig must be used within HapticsProvider');
    }
    return HAPTICS_FALLBACK;
  }
  return context;
}
